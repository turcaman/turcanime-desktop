enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private logLevel = LogLevel.DEBUG;

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private format(level: LogLevel, tag: string, message: string): string {
    return `[${LogLevel[level]}] [${tag}] ${message}`;
  }

  debug(tag: string, message: string): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    console.log(this.format(LogLevel.DEBUG, tag, message));
  }

  info(tag: string, message: string): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    console.log(this.format(LogLevel.INFO, tag, message));
  }

  warn(tag: string, message: string, error?: unknown): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    console.warn(this.format(LogLevel.WARN, tag, message), error ?? '');
  }

  error(tag: string, message: string, error?: unknown): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    console.error(this.format(LogLevel.ERROR, tag, message), error ?? '');
  }
}

export const logger = new Logger();