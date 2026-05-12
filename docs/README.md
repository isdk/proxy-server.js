**@isdk/proxy-server**

***

# @isdk/proxy-server

> HTTP Caching Proxy Server (Node.js)

`HttpCachingProxy` is a high-performance caching proxy server adapter built into `@isdk/proxy`, specifically designed for the Node.js environment. It operates as a standalone HTTP forward proxy, making it ideal for integration testing, traffic recording, or adding caching capabilities to existing services without modifying their code.

## Features

- **Non-intrusive**: Works via standard HTTP proxy protocol; no changes to your application code required.
- **Core Power**: Fully leverages `@isdk/proxy` core features including L1/L2 hybrid caching, request coalescing, and SWR support.
- **Modern Architecture**: Built with `@whatwg-node/server` for Web Standard bridging and uses `ky` for efficient backend fetching.
- **Developer Friendly**: Injects `x-proxy-cache` response headers for easy monitoring of cache status.

## Installation

Ensure you have the core library and necessary dependencies installed:

```bash
pnpm add @isdk/proxy-server @isdk/proxy ky @whatwg-node/server undici@6
```

## Quick Start

### Example: Using with `ky` for Integration Testing

In integration tests, you can spin up a temporary proxy to speed up requests and enable offline testing.

```typescript
import { HttpCachingProxy } from '@isdk/proxy-server';
import { ProxyAgent } from 'undici';
import ky from 'ky';

// 1. Start the proxy server
const proxy = new HttpCachingProxy({
  cachePath: './.cache',
  port: 0 // Auto-assign port
});
await proxy.start();

// 2. Configure client to use the proxy
const agent = new ProxyAgent(proxy.url);
const client = ky.extend({ dispatcher: agent });

// 3. Make requests
const response = await client.get('https://api.example.com/data');
console.log(response.headers.get('x-proxy-cache')); // HIT, MISS, STALE...

// 4. Stop when finished
await proxy.stop();
```

## Configuration Options `ProxyServerOptions`

| Option | Type | Description |
| :--- | :--- | :--- |
| `config` | `ProxyConfig` | Full caching strategy configuration (site rules, filters, etc.). |
| `cachePath` | `string` | Directory for persistent cache storage. |
| `port` | `number` | Port to listen on, default is `0`. |
| `logError` | `boolean` | Whether to log errors to console, default is `true`. |
| `timeout` | `number` | Timeout for backend requests (ms). |
| `rejectUnauthorized` | `boolean` | Whether to verify SSL certificates, default is `true`. |
| `backgroundUpdate` | `boolean` | Whether to enable SWR background updates, default is `true`. |

## FAQ

### Does it support HTTPS?

It supports proxying to `https://` target URLs. However, the proxy server itself currently only listens on HTTP. `CONNECT` tunneling is not supported for simplicity and security reasons.

## License

MIT
