import { logger } from './logger';

const api = (): ElectronAPI => {
  if (typeof window !== 'undefined' && window.electronAPI) {
    return window.electronAPI;
  }
  throw new Error('electronAPI not available');
};

export const storage = {
  // strict = true makes read failures visible to callers that must not treat
  // them as "no data" (history initialization would otherwise overwrite it).
  async get<T>(key: string, strict = false): Promise<T | null> {
    try {
      const value = await api().store.get(key);
      return value as T | null;
    } catch (err) {
      logger.error('Storage', `Failed to get ${key}`, err);
      if (strict) throw err;
      return null;
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await api().store.set(key, value);
    } catch (err) {
      logger.error('Storage', `Failed to set ${key}`, err);
      throw err;
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await api().store.delete(key);
    } catch (err) {
      logger.error('Storage', `Failed to remove ${key}`, err);
      throw err;
    }
  },
};
