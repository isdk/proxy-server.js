import { describe, it, expect } from 'vitest';
import { HttpCachingProxy } from './http-caching-proxy';

describe('HttpCachingProxy', () => {
  describe('constructor', () => {
    it('rejects missing cachePath option', () => {
      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        () => new HttpCachingProxy({ cachePath: undefined } as any),
      ).toThrow(/required option.*cachePath/i);
    });
  });
});
