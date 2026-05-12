[**@isdk/proxy-server**](../README.md)

***

[@isdk/proxy-server](../globals.md) / HttpCachingProxy

# Class: HttpCachingProxy

Defined in: [http-caching-proxy.ts:77](https://github.com/isdk/proxy-server.js/blob/4f33d0b70873f5cff08f244cc3797bde2ca978e4/src/http-caching-proxy.ts#L77)

高性能缓存 HTTP 代理服务器。

基于 @isdk/proxy 核心引擎，支持 L1/L2 混合缓存、请求合并、SWR 以及离线容灾。
内部使用 @whatwg-node/server 进行 Web 标准桥接，使用 ky 作为后端 Fetch 引擎。

## Constructors

### Constructor

> **new HttpCachingProxy**(`options`): `HttpCachingProxy`

Defined in: [http-caching-proxy.ts:90](https://github.com/isdk/proxy-server.js/blob/4f33d0b70873f5cff08f244cc3797bde2ca978e4/src/http-caching-proxy.ts#L90)

#### Parameters

##### options

[`ProxyServerOptions`](../interfaces/ProxyServerOptions.md) = `{}`

#### Returns

`HttpCachingProxy`

## Properties

### url

> **url**: `string` = `'http://proxy-not-running'`

Defined in: [http-caching-proxy.ts:88](https://github.com/isdk/proxy-server.js/blob/4f33d0b70873f5cff08f244cc3797bde2ca978e4/src/http-caching-proxy.ts#L88)

代理服务器正在监听的 URL。
启动后，请将此值提供给你的 HTTP 客户端作为代理配置。

## Methods

### clearCache()

> **clearCache**(): `Promise`\<`void`\>

Defined in: [http-caching-proxy.ts:264](https://github.com/isdk/proxy-server.js/blob/4f33d0b70873f5cff08f244cc3797bde2ca978e4/src/http-caching-proxy.ts#L264)

清理当前缓存目录。

#### Returns

`Promise`\<`void`\>

***

### logError()

> **logError**(`request`, `error`): `void`

Defined in: [http-caching-proxy.ts:250](https://github.com/isdk/proxy-server.js/blob/4f33d0b70873f5cff08f244cc3797bde2ca978e4/src/http-caching-proxy.ts#L250)

记录错误日志。

#### Parameters

##### request

`IncomingMessage` | `Request`

##### error

`Error`

#### Returns

`void`

***

### start()

> **start**(): `Promise`\<`void`\>

Defined in: [http-caching-proxy.ts:127](https://github.com/isdk/proxy-server.js/blob/4f33d0b70873f5cff08f244cc3797bde2ca978e4/src/http-caching-proxy.ts#L127)

启动代理服务器。

#### Returns

`Promise`\<`void`\>

***

### stop()

> **stop**(): `Promise`\<`void`\>

Defined in: [http-caching-proxy.ts:234](https://github.com/isdk/proxy-server.js/blob/4f33d0b70873f5cff08f244cc3797bde2ca978e4/src/http-caching-proxy.ts#L234)

停止代理服务器并释放资源。

#### Returns

`Promise`\<`void`\>
