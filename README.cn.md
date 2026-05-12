# @isdk/proxy-server

> HTTP 缓存代理服务器 (Node.js)

`HttpCachingProxy` 是 `@isdk/proxy` 内置的一个高性能缓存代理服务器适配器，专为 Node.js 环境设计。它可以作为一个独立的 HTTP 转发代理运行，非常适合集成测试、流量录制或在不修改应用代码的情况下为现有服务增加缓存能力。

## 特性

- **零侵入**：通过标准 HTTP 代理协议工作，无需修改现有业务代码。
- **核心能力复用**：完整继承了 `@isdk/proxy` 的 L1/L2 混合缓存、请求合并 (Request Coalescing) 和 SWR 支持。
- **现代化架构**：基于 `@whatwg-node/server` 实现 Web 标准桥接，使用 `ky` 进行高效的后端请求。
- **开发者友好**：内置 `x-proxy-cache` 响应头，方便观察缓存状态。

## 安装

确保你已经安装了核心库及必要依赖：

```bash
# 如果nodejs版本 <= 20 必须指定 undici@6
pnpm add @isdk/proxy-server @isdk/proxy ky @whatwg-node/server undici@6
```

## 快速开始

### 示例：配合 `ky` 进行集成测试

在集成测试中，你可以启动一个临时代理来加速请求并实现离线测试。

```typescript
import { HttpCachingProxy } from '@isdk/proxy-server';
import { ProxyAgent } from 'undici';
import ky from 'ky';

// 1. 启动代理服务器
const proxy = new HttpCachingProxy({
  cachePath: './.cache',
  port: 0 // 自动分配端口
});
await proxy.start();

// 2. 配置客户端使用该代理
const agent = new ProxyAgent(proxy.url);
const client = ky.extend({ dispatcher: agent });

// 3. 发起请求
const response = await client.get('https://api.example.com/data');
console.log(response.headers.get('x-proxy-cache')); // HIT, MISS, STALE...

// 4. 测试结束关闭
await proxy.stop();
```

## 配置选项 `ProxyServerOptions`

| 选项 | 类型 | 说明 |
| :--- | :--- | :--- |
| `config` | `ProxyConfig` | 完整的缓存策略配置（站点规则、过滤条件等）。 |
| `cachePath` | `string` | 缓存持久化目录。 |
| `port` | `number` | 监听端口，默认 `0`。 |
| `logError` | `boolean` | 是否打印错误日志，默认 `true`。 |
| `timeout` | `number` | 后端请求超时时间 (ms)。 |
| `rejectUnauthorized` | `boolean` | 是否校验 SSL 证书，默认 `true`。 |
| `backgroundUpdate` | `boolean` | 是否启用 SWR 后台更新，默认 `true`。 |

## 常见问题

### 它支持 HTTPS 代理吗？

它支持代理到 `https://` 目标地址，但它本身作为一个代理服务器目前仅支持普通 HTTP 监听。由于安全性考虑，暂不支持 `CONNECT` 隧道加密代理。

## 许可证

MIT
