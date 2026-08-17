export type ObjectStore = {
  exists(key: string): Promise<boolean>;
  get(key: string): Promise<Buffer>;
  put(key: string, body: Buffer, contentType: string): Promise<void>;
};

export function createMemoryObjectStore(): ObjectStore {
  const objects = new Map<string, { body: Buffer; contentType: string }>();
  return {
    async exists(key) {
      return objects.has(key);
    },
    async get(key) {
      const stored = objects.get(key);
      if (stored === undefined) {
        throw new Error(`Object not found: ${key}`);
      }
      return stored.body;
    },
    async put(key, body, contentType) {
      objects.set(key, { body, contentType });
    },
  };
}
