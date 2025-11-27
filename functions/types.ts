
// Define Cloudflare Workers types globally to resolve missing type errors
declare global {
  interface R2Bucket {
    put(key: string, value: any, options?: any): Promise<any>;
    delete(key: string): Promise<void>;
  }

  interface KVNamespace {
    get(key: string, type?: "text" | "json" | "arrayBuffer" | "stream"): Promise<any>;
    put(key: string, value: string | ReadableStream | ArrayBuffer | FormData, options?: any): Promise<void>;
    delete(key: string): Promise<void>;
    list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{ keys: { name: string; metadata?: any }[]; list_complete: boolean; cursor?: string }>;
  }

  interface EventContext<Env, P extends string, Data> {
    request: Request;
    functionPath: string;
    waitUntil: (promise: Promise<any>) => void;
    passThroughOnException: () => void;
    next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
    env: Env;
    params: Record<P, string | string[]>;
    data: Data;
  }

  type PagesFunction<Env = unknown, P extends string = string, Data extends Record<string, unknown> = Record<string, unknown>> = (
    context: EventContext<Env, P, Data>
  ) => Response | Promise<Response>;
}

export interface Env {
  PHOTO_BUCKET: R2Bucket;
  PHOTO_KV: KVNamespace;
  ADMIN_TOKEN: string;
  IMAGE_BASE_URL: string;
}
