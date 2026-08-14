interface ElectronAPI {
  session: {
    get: () => Promise<{ cookies: string; userAgent: string } | null>;
    refresh: () => Promise<{ cookies: string; userAgent: string }>;
  };
  store: {
    get: (key: string) => Promise<unknown>;
    set: (key: string, value: unknown) => Promise<boolean>;
    delete: (key: string) => Promise<boolean>;
    getAllKeys: () => Promise<string[]>;
  };
  fetch: (
    url: string,
    options?: Record<string, unknown>,
  ) => Promise<{
    ok: boolean;
    status: number;
    data: string | null;
    error?: string;
  }>;
  bridgeFetch: (
    url: string,
    headers?: Record<string, string>,
  ) => Promise<{
    ok: boolean;
    status: number;
    data: string | null;
    error?: string;
  }>;
  proxyFetch: (
    url: string,
    opts?: { method?: string; headers?: Record<string, string>; body?: string; json?: boolean },
  ) => Promise<{
    ok: boolean;
    status: number;
    data: unknown;
    error?: string;
  }>;
  proxyBuffer: (url: string, rangeStart?: number | null, rangeEnd?: number | null) => Promise<{
    ok: boolean;
    status: number;
    data: ArrayBuffer | null;
    error?: string;
  }>;
  fullscreen: {
    set: (flag: boolean) => Promise<void>;
    onChanged: (cb: (flag: boolean) => void) => () => void;
  };
  app: {
    getVersion: () => Promise<string>;
    openExternal: (url: string) => Promise<void>;
  };
  updates: {
    check: () => Promise<{ latest: string | null; current: string; error?: string }>;
  };
  network: {
    check: () => Promise<boolean>;
    onChanged: (cb: (isOnline: boolean) => void) => () => void;
  };
}

interface Window {
  electronAPI: ElectronAPI;
}
