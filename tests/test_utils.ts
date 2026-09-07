export function mockFetch(
  handler: (input: string | URL | Request, init?: RequestInit) => Promise<Response> | Response,
): () => void {
  const original = globalThis.fetch;
  globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => {
    return Promise.resolve(handler(input, init));
  }) as typeof globalThis.fetch;
  return () => {
    globalThis.fetch = original;
  };
}

export function createMockEnv(initialData: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initialData));
  const kv: Partial<KVNamespace> = {
    get: (async (key: string) => store.get(key) ?? null) as unknown as KVNamespace["get"],
    put: (async (key: string, val: string) => {
      store.set(key, val);
    }) as unknown as KVNamespace["put"],
  };
  return {
    aoty_cache: kv as KVNamespace,
  };
}
