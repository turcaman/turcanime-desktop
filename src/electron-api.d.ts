interface ElectronAPI {
  session: {
    get: () => Promise<{ cookies: string; userAgent: string } | null>;
    refresh: () => Promise<{ cookies: string; userAgent: string }>;
  };
  store: {
    get: (key: string) => Promise<unknown>;
    set: (key: string, value: unknown) => Promise<boolean>;
    delete: (key: string) => Promise<boolean>;
    clear: () => Promise<boolean>;
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
  fullscreen: {
    set: (flag: boolean) => Promise<void>;
    onChanged: (cb: (flag: boolean) => void) => () => void;
  };
}

interface Window {
  electronAPI: ElectronAPI;
}
