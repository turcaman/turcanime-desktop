export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

const currentLevel = LogLevel.DEBUG;

function format(level: LogLevel, tag: string, message: string): string {
  return `[${LogLevel[level]}] [${tag}] ${message}`;
}

export const logger = {
  debug(tag: string, message: string): void {
    if (LogLevel.DEBUG < currentLevel) return;
    console.log(format(LogLevel.DEBUG, tag, message));
  },

  info(tag: string, message: string): void {
    if (LogLevel.INFO < currentLevel) return;
    console.log(format(LogLevel.INFO, tag, message));
  },

  warn(tag: string, message: string, error?: unknown): void {
    if (LogLevel.WARN < currentLevel) return;
    console.warn(format(LogLevel.WARN, tag, message), error ?? '');
  },

  error(tag: string, message: string, error?: unknown): void {
    if (LogLevel.ERROR < currentLevel) return;
    console.error(format(LogLevel.ERROR, tag, message), error ?? '');
  },
};
