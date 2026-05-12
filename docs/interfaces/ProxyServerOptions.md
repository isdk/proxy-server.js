[**@isdk/proxy-server**](../README.md)

***

[@isdk/proxy-server](../globals.md) / ProxyServerOptions

# Interface: ProxyServerOptions

Defined in: [http-caching-proxy.ts:17](https://github.com/isdk/proxy-server.js/blob/4f33d0b70873f5cff08f244cc3797bde2ca978e4/src/http-caching-proxy.ts#L17)

## Properties

### backgroundUpdate?

> `optional` **backgroundUpdate**: `boolean`

Defined in: [http-caching-proxy.ts:63](https://github.com/isdk/proxy-server.js/blob/4f33d0b70873f5cff08f244cc3797bde2ca978e4/src/http-caching-proxy.ts#L63)

是否开启后台异步更新 (SWR)。
默认：true。

***

### cachePath?

> `optional` **cachePath**: `string`

Defined in: [http-caching-proxy.ts:27](https://github.com/isdk/proxy-server.js/blob/4f33d0b70873f5cff08f244cc3797bde2ca978e4/src/http-caching-proxy.ts#L27)

缓存持久化目录。
如果提供了 `config.storagePath`，则优先使用它。

***

### config?

> `optional` **config**: `ProxyConfig`

Defined in: [http-caching-proxy.ts:21](https://github.com/isdk/proxy-server.js/blob/4f33d0b70873f5cff08f244cc3797bde2ca978e4/src/http-caching-proxy.ts#L21)

完整的缓存配置对象

***

### logError?

> `optional` **logError**: `boolean`

Defined in: [http-caching-proxy.ts:45](https://github.com/isdk/proxy-server.js/blob/4f33d0b70873f5cff08f244cc3797bde2ca978e4/src/http-caching-proxy.ts#L45)

是否在控制台打印错误日志。
默认：true。

***

### port?

> `optional` **port**: `number`

Defined in: [http-caching-proxy.ts:39](https://github.com/isdk/proxy-server.js/blob/4f33d0b70873f5cff08f244cc3797bde2ca978e4/src/http-caching-proxy.ts#L39)

HTTP 代理服务器监听的端口。
默认：0 (由系统自动分配空闲端口)。

***

### rejectUnauthorized?

> `optional` **rejectUnauthorized**: `boolean`

Defined in: [http-caching-proxy.ts:57](https://github.com/isdk/proxy-server.js/blob/4f33d0b70873f5cff08f244cc3797bde2ca978e4/src/http-caching-proxy.ts#L57)

是否拒绝未授权的 SSL 证书。
设置为 false 可以在测试环境中允许自签名证书。
默认：true。

***

### timeout?

> `optional` **timeout**: `number`

Defined in: [http-caching-proxy.ts:50](https://github.com/isdk/proxy-server.js/blob/4f33d0b70873f5cff08f244cc3797bde2ca978e4/src/http-caching-proxy.ts#L50)

连接目标服务的超时时间 (ms)。

***

### ttl?

> `optional` **ttl**: `number`

Defined in: [http-caching-proxy.ts:33](https://github.com/isdk/proxy-server.js/blob/4f33d0b70873f5cff08f244cc3797bde2ca978e4/src/http-caching-proxy.ts#L33)

默认的缓存过期时间 (TTL)，单位为毫秒。
仅当后端未返回有效的 Cache-Control 头时，或作为默认参考。
