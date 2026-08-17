export type ObjectStore = {
  createUploadUrl(
    key: string,
    contentType: string,
    expiresSeconds: number,
  ): Promise<{ url: string; fields: Record<string, string>; expiresAt: Date }>;
  createDownloadUrl(key: string, expiresSeconds: number): Promise<{ url: string; expiresAt: Date }>;
  exists(key: string): Promise<boolean>;
  get(key: string): Promise<Buffer>;
  put(key: string, body: Buffer, contentType: string): Promise<void>;
};

export function createMemoryObjectStore(): ObjectStore {
  const objects = new Map<string, { body: Buffer; contentType: string }>();

  return {
    async createUploadUrl(key, contentType, expiresSeconds) {
      return {
        url: `memory://upload/${encodeURIComponent(key)}`,
        fields: { 'Content-Type': contentType },
        expiresAt: new Date(Date.now() + expiresSeconds * 1000),
      };
    },
    async createDownloadUrl(key, expiresSeconds) {
      if (!objects.has(key)) {
        throw new Error(`Object not found: ${key}`);
      }
      return {
        url: `memory://download/${encodeURIComponent(key)}`,
        expiresAt: new Date(Date.now() + expiresSeconds * 1000),
      };
    },
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
