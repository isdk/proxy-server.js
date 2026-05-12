import ky from 'ky';
import { createServerAdapter } from '@whatwg-node/server';
import { createServer, Server as HttpServer, IncomingMessage } from 'node:http';
import { AddressInfo } from 'node:net';
import { once } from 'node:events';
import { Agent } from 'undici';
import debugFactory from 'debug';
import {
  SmartCache,
  createFetchWithCache,
  getSiteConfig,
  ProxyConfig,
} from '@isdk/proxy';

const debug = debugFactory('@isdk/proxy:server');

export interface ProxyServerOptions {
  /**
   * 完整的缓存配置对象
   */
  config?: ProxyConfig;

  /**
   * 缓存持久化目录。
   * 如果提供了 `config.storagePath`，则优先使用它。
   */
  cachePath?: string;

  /**
   * 默认的缓存过期时间 (TTL)，单位为毫秒。
   * 仅当后端未返回有效的 Cache-Control 头时，或作为默认参考。
   */
  ttl?: number;

  /**
   * HTTP 代理服务器监听的端口。
   * 默认：0 (由系统自动分配空闲端口)。
   */
  port?: number;

  /**
   * 是否在控制台打印错误日志。
   * 默认：true。
   */
  logError?: boolean;

  /**
   * 连接目标服务的超时时间 (ms)。
   */
  timeout?: number;

  /**
   * 是否拒绝未授权的 SSL 证书。
   * 设置为 false 可以在测试环境中允许自签名证书。
   * 默认：true。
   */
  rejectUnauthorized?: boolean;

  /**
   * 是否开启后台异步更新 (SWR)。
   * 默认：true。
   */
  backgroundUpdate?: boolean;
}

const DEFAULT_PORT = 0;
const DEFAULT_LOG_ERROR = true;
const DEFAULT_REJECT_UNAUTHORIZED = true;
const DEFAULT_BACKGROUND_UPDATE = true;

/**
 * 高性能缓存 HTTP 代理服务器。
 *
 * 基于 @isdk/proxy 核心引擎，支持 L1/L2 混合缓存、请求合并、SWR 以及离线容灾。
 * 内部使用 @whatwg-node/server 进行 Web 标准桥接，使用 ky 作为后端 Fetch 引擎。
 */
export class HttpCachingProxy {
  private _server?: HttpServer;
  private _cache: SmartCache;
  private _config: ProxyConfig;
  private _options: Required<Omit<ProxyServerOptions, 'config' | 'cachePath' | 'ttl' | 'timeout'>> &
    Pick<ProxyServerOptions, 'ttl' | 'timeout' | 'cachePath'>;

  /**
   * 代理服务器正在监听的 URL。
   * 启动后，请将此值提供给你的 HTTP 客户端作为代理配置。
   */
  public url: string = 'http://proxy-not-running';

  constructor(options: ProxyServerOptions = {}) {
    this._options = {
      port: options.port ?? DEFAULT_PORT,
      logError: options.logError ?? DEFAULT_LOG_ERROR,
      rejectUnauthorized: options.rejectUnauthorized ?? DEFAULT_REJECT_UNAUTHORIZED,
      backgroundUpdate: options.backgroundUpdate ?? DEFAULT_BACKGROUND_UPDATE,
      ttl: options.ttl,
      timeout: options.timeout,
      cachePath: options.cachePath,
    };

    // 初始化核心配置
    const config = options.config || {
      methods: ['GET', 'HEAD'],
      sites: {},
    };

    // 优先级：config.storagePath > options.cachePath
    const storagePath = config.storagePath || options.cachePath;
    if (!storagePath) {
      throw new Error('Required option missing: "cachePath" or "config.storagePath"');
    }

    this._config = {
      ...config,
      storagePath,
    };

    // 初始化多级混合存储引擎
    this._cache = new SmartCache({
      storagePath,
    });
  }

  /**
   * 启动代理服务器。
   */
  async start() {
    if (this._server) return;

    // 创建并发写入追踪器，防止缓存击穿
    const fetchWithCacheBound = createFetchWithCache();

    // 配置通用的后端请求 Dispatcher (用于处理 SSL)
    const dispatcher = new Agent({
      connect: {
        rejectUnauthorized: this._options.rejectUnauthorized,
        timeout: this._options.timeout,
      },
    });

    // 使用 @whatwg-node/server 创建 Web 标准适配器
    const adapter = createServerAdapter(async (request: Request) => {
      debug('Incoming request: %s %s', request.method, request.url);

      // HTTP 代理模式下，URL 格式为 http://proxy:port/http://target:port/path
      // 需要提取出实际的目标 URL
      let targetRequest = request;
      if (request.url.startsWith(this.url)) {
        const proxyUrl = new URL(this.url);
        const targetUrl = request.url.slice(proxyUrl.origin.length + 1); // +1 跳过开头的 "/"
        debug('Extracted target URL: %s', targetUrl);
        // 过滤 hop-by-hop headers（如 Transfer-Encoding），这些由 HTTP 客户端自动处理
        const headers = new Headers();
        request.headers.forEach((value, key) => {
          if (!['transfer-encoding', 'connection'].includes(key.toLowerCase())) {
            headers.set(key, value);
          }
        });
        // Node.js fetch 要求发送 body 时必须设置 duplex: 'half'
        targetRequest = new Request(targetUrl, {
          method: request.method,
          headers,
          body: request.body,
          duplex: 'half',
        } as any);
      }

      // 匹配当前请求所属站点的缓存配置
      const siteConfig = getSiteConfig(targetRequest.url, this._config);

      try {
        // 调用核心缓存协调函数
        const response = await fetchWithCacheBound(
          targetRequest,
          async (req) => {
            debug('Forwarding request to backend: %s', req.url);
            return ky(req, {
              throwHttpErrors: false,
              timeout: this._options.timeout,
              // @ts-ignore
              dispatcher,
            });
          },
          {
            cache: this._cache,
            config: siteConfig,
            backgroundUpdate: this._options.backgroundUpdate,
          },
        );

        const cacheStatus = response.headers.get('x-proxy-cache');
        debug('Response for %s: status=%d, cache=%s', targetRequest.url, response.status, cacheStatus);

        return response;
      } catch (error: any) {
        this.logError(targetRequest as any, error);
        // 递归遍历 cause 链找到原始错误
        let originalError = error;
        while (originalError.cause && originalError.cause !== originalError) {
          originalError = originalError.cause;
        }
        const errorMessage = originalError.message || error.message;
        const errorStack = originalError.stack || error.stack;
        return new Response(`Error: ${errorMessage}\n${errorStack}`, {
          status: error.statusCode || 502,
        });
      }
    });

    this._server = createServer(adapter);

    // 处理代理服务器本身的错误
    this._server.on('error', (err) => {
      debug('Server error:', err);
    });

    // 禁用 CONNECT 方法 (不支持 HTTPS 隧道代理，仅支持普通 HTTP 代理)
    this._server.on('connect', (req, socket) => {
      socket.write('HTTP/1.1 501 Not Implemented\r\n\r\n');
      socket.destroy();
    });

    this._server.listen(this._options.port);
    await once(this._server, 'listening');

    const address = this._server.address() as AddressInfo;
    this.url = `http://127.0.0.1:${address.port}`;
    debug('Proxy server started at %s', this.url);
  }

  /**
   * 停止代理服务器并释放资源。
   */
  async stop() {
    if (!this._server) return;

    debug('Stopping proxy server...');
    const server = this._server;
    this._server = undefined;
    this.url = 'http://proxy-not-running';

    server.close();
    await once(server, 'close');
    debug('Proxy server stopped.');
  }

  /**
   * 记录错误日志。
   */
  public logError(request: Request | IncomingMessage, error: Error) {
    const method = 'method' in request ? request.method : (request as any).method;
    const url = 'url' in request ? request.url : (request as any).url;

    if (this._options.logError) {
      console.error('Cannot proxy %s %s.', method, url, error.stack ?? error);
    } else {
      debug('Cannot proxy %s %s.', method, url, error.stack ?? error);
    }
  }

  /**
   * 清理当前缓存目录。
   */
  async clearCache() {
    await this._cache.clear();
    debug('Cache cleared.');
  }
}
