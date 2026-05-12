import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import ky from 'ky';
import { Agent, ProxyAgent } from 'undici';
import { once } from 'node:events';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { HttpCachingProxy, ProxyServerOptions } from './http-caching-proxy';

const CACHE_DIR = path.join(os.tmpdir(), 'http-caching-proxy-int-test');

describe('HttpCachingProxy Integration', () => {
  let stubServerUrl: string;
  let stubServer: http.Server;
  let stubServerHandler: (req: http.IncomingMessage, res: http.ServerResponse) => void;

  beforeAll(async () => {
    stubServer = http.createServer((req, res) => {
      if (stubServerHandler) {
        stubServerHandler(req, res);
      } else {
        res.writeHead(501);
        res.end();
      }
    });
    stubServer.listen(0);
    await once(stubServer, 'listening');
    const address = stubServer.address() as AddressInfo;
    stubServerUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    if (stubServer) {
      stubServer.close();
      await once(stubServer, 'close');
    }
  });

  let proxy: HttpCachingProxy;

  beforeEach(async () => {
    if (fs.existsSync(CACHE_DIR)) {
      fs.rmSync(CACHE_DIR, { recursive: true, force: true });
    }
    // 重置 stubServerHandler，防止上一个测试的状态影响当前测试
    stubServerHandler = undefined as any;
  });

  afterEach(async () => {
    if (proxy) {
      await proxy.stop();
    }
  });

  async function givenRunningProxy(options?: Partial<ProxyServerOptions>) {
    proxy = new HttpCachingProxy({
      cachePath: CACHE_DIR,
      ...options
    });
    await proxy.start();
    return proxy;
  }

  /**
   * 创建一个通过代理服务器进行请求转发的 ky 客户端。
   * 注意：我们不使用 undici 的 ProxyAgent，因为代理服务器禁用了 CONNECT 隧道，
   * 我们需要直接发送带有绝对 URL 的转发请求。
   */
  function createProxyClient() {
    return ky.create({
      // 这里的 trick 是：直接将请求发往代理服务器，但让核心逻辑识别目标 URL
      fetch: async (input, init) => {
        // ky 内部会将 input 转成 Request 对象
        const request = input instanceof Request ? input :
                        input instanceof URL ? new Request(input) :
                        new Request(input, init);

        const targetUrl = request.url;
        const method = request.method;
        const body = request.body;

        // 提取 headers
        const headersObj: Record<string, string> = {};
        request.headers.forEach((value, key) => {
          headersObj[key] = value;
        });

        const { request: undiciRequest } = await import('undici');

        // 直接向代理服务器发起请求，但在 path 中传入完整的 targetUrl
        const { statusCode, headers, body: responseBody } = await undiciRequest(proxy.url, {
          method,
          path: targetUrl,
          headers: headersObj,
          body: body as any,
        } as any);

        return new Response(responseBody as any, {
          status: statusCode,
          headers: headers as any,
        });
      }
    });
  }

  it('provides "url" property when running', async () => {
    await givenRunningProxy();
    expect(proxy.url).toMatch(/^http:\/\/127.0.0.1:\d+$/);
  });

  it('provides invalid "url" property when not running', async () => {
    proxy = new HttpCachingProxy({ cachePath: CACHE_DIR });
    expect(proxy.url).toMatch(/not-running/);
  });

  it('proxies HTTP requests', async () => {
    await givenRunningProxy();

    stubServerHandler = (req, res) => {
      res.writeHead(200);
      res.end('stub server response');
    };

    const client = createProxyClient();
    const response = await client(stubServerUrl);

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toBe('stub server response');
    expect(response.headers.get('x-proxy-cache')).toBe('MISS');
  });

  it('caches responses', async () => {
    await givenRunningProxy();

    let counter = 0;
    stubServerHandler = (req, res) => {
      counter++;
      res.writeHead(200, { 'Cache-Control': 'public, max-age=100' });
      res.end(`response ${counter}`);
    };

    const client = createProxyClient();

    // 第一次请求 - MISS
    const res1 = await client(stubServerUrl);
    expect(await res1.text()).toBe('response 1');
    expect(res1.headers.get('x-proxy-cache')).toBe('MISS');

    // 第二次请求 - HIT
    const res2 = await client(stubServerUrl);
    expect(await res2.text()).toBe('response 1');
    expect(res2.headers.get('x-proxy-cache')).toBe('HIT');

    expect(counter).toBe(1);
  });

  it('reports error for failed backend requests (502)', async () => {
    await givenRunningProxy({ logError: false });

    const client = createProxyClient();
    // 访问一个不存在的端口
    const res = await client('http://127.0.0.1:12345', {
      throwHttpErrors: false
    });

    expect(res.status).toBe(502);
    const body = await res.text();
    expect(body).toMatch(/Error: connect ECONNREFUSED/);
  });

  it('forwards request body and headers', async () => {
    await givenRunningProxy();

    stubServerHandler = async (req, res) => {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = Buffer.concat(chunks).toString();

      res.writeHead(200, {
        'x-received-client-header': req.headers['x-client-header'] as string,
        'Content-Type': 'application/json'
      });
      res.end(JSON.stringify({ body }));
    };

    const client = createProxyClient();
    const response = await client.post(stubServerUrl, {
      headers: { 'x-client-header': 'hello' },
      body: 'test body'
    });

    expect(response.headers.get('x-received-client-header')).toBe('hello');
    const data: any = await response.json();
    expect(data.body).toBe('test body');
  });

  it('handles SWR (Stale-While-Revalidate)', async () => {
    // 强制缓存过期但允许 SWR
    await givenRunningProxy({ backgroundUpdate: true });

    let counter = 0;
    stubServerHandler = (req, res) => {
      counter++;
      // 设置 1s 的缓存，但在 100s 内允许 stale
      res.writeHead(200, {
        'Cache-Control': 'public, max-age=1, stale-while-revalidate=100'
      });
      res.end(`count ${counter}`);
    };

    const client = createProxyClient();

    // 1. 第一次请求 - MISS
    const res1 = await client(stubServerUrl);
    expect(await res1.text()).toBe('count 1');

    // 等待 1.5s 让缓存过期
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 2. 第二次请求 - 应该命中 STALE 并触发后台更新
    const res2 = await client(stubServerUrl);
    expect(res2.headers.get('x-proxy-cache')).toBe('STALE');
    expect(await res2.text()).toBe('count 1');

    // 等待后台更新完成 (简单等待)
    await new Promise(resolve => setTimeout(resolve, 500));

    // 3. 第三次请求 - 应该命中 HIT (拿到更新后的数据)
    const res3 = await client(stubServerUrl);
    expect(res3.headers.get('x-proxy-cache')).toBe('HIT');
    expect(await res3.text()).toBe('count 2');
  });
});
