import { LOG_LIMITS } from '../../config/cache';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  timestamp: number;
  level: LogLevel;
  tag: string;
  message: string;
  error?: string;
}

export interface StorageLike {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}

const LOG_STORAGE_KEY = 'app_logs';
const MAX_LOG_ENTRIES = LOG_LIMITS.MAX_ENTRIES;

class Logger {
  private logLevel: LogLevel = LogLevel.DEBUG;
  private logs: LogEntry[] = [];
  private persistenceEnabled = false;
  private storage: StorageLike | null = null;

  setStorage(storage: StorageLike): void {
    this.storage = storage;
  }

  setPersistenceEnabled(enabled: boolean): void {
    this.persistenceEnabled = enabled;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private format(level: LogLevel, tag: string, message: string): string {
    return `[${LogLevel[level]}] [${tag}] ${message}`;
  }

  private async persist(entry: LogEntry): Promise<void> {
    if (!this.persistenceEnabled || !this.storage) return;
    this.logs = [...this.logs, entry];
    if (this.logs.length > MAX_LOG_ENTRIES) {
      this.logs = this.logs.slice(-MAX_LOG_ENTRIES);
    }
    try {
      await this.storage.set(LOG_STORAGE_KEY, this.logs);
    } catch {
      console.warn('[Logger] Failed to persist logs');
    }
  }

  debug(tag: string, message: string): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    console.log(this.format(LogLevel.DEBUG, tag, message));
    void this.persist({ timestamp: Date.now(), level: LogLevel.DEBUG, tag, message });
  }

  info(tag: string, message: string): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    console.log(this.format(LogLevel.INFO, tag, message));
    void this.persist({ timestamp: Date.now(), level: LogLevel.INFO, tag, message });
  }

  warn(tag: string, message: string, error?: unknown): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    const errorStr = error != null ? this.serializeError(error) : undefined;
    console.warn(this.format(LogLevel.WARN, tag, message), error ?? '');
    void this.persist({
      timestamp: Date.now(),
      level: LogLevel.WARN,
      tag,
      message,
      error: errorStr,
    });
  }

  error(tag: string, message: string, error?: unknown): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    const errorStr = error != null ? this.serializeError(error) : undefined;
    console.error(this.format(LogLevel.ERROR, tag, message), error ?? '');
    void this.persist({
      timestamp: Date.now(),
      level: LogLevel.ERROR,
      tag,
      message,
      error: errorStr,
    });
  }

  private serializeError(error: unknown): string {
    if (error instanceof Error) {
      return `${error.name}: ${error.message}\n${error.stack ?? ''}`;
    }
    return String(error);
  }

  async getLogs(): Promise<LogEntry[]> {
    if (!this.persistenceEnabled || !this.storage) return [];
    try {
      return (await this.storage.get<LogEntry[]>(LOG_STORAGE_KEY)) ?? [];
    } catch {
      return [];
    }
  }

  async clearLogs(): Promise<void> {
    this.logs = [];
    if (!this.persistenceEnabled || !this.storage) return;
    try {
      await this.storage.remove(LOG_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

export const logger = new Logger();
