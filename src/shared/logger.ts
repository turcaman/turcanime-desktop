export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface Logger {
  debug: (tag: string, message: string) => void;
  info: (tag: string, message: string) => void;
  warn: (tag: string, message: string, error?: unknown) => void;
  error: (tag: string, message: string, error?: unknown) => void;
}

function format(level: LogLevel, tag: string, message: string): string {
  return `[${LogLevel[level]}] [${tag}] ${message}`;
}

export function createLogger(currentLevel: LogLevel): Logger {
  const shouldLog = (level: LogLevel): boolean => level >= currentLevel;

  return {
    debug(tag, message) {
      if (!shouldLog(LogLevel.DEBUG)) return;
      console.log(format(LogLevel.DEBUG, tag, message));
    },

    info(tag, message) {
      if (!shouldLog(LogLevel.INFO)) return;
      console.log(format(LogLevel.INFO, tag, message));
    },

    warn(tag, message, error?) {
      if (!shouldLog(LogLevel.WARN)) return;
      console.warn(format(LogLevel.WARN, tag, message), error ?? '');
    },

    error(tag, message, error?) {
      if (!shouldLog(LogLevel.ERROR)) return;
      console.error(format(LogLevel.ERROR, tag, message), error ?? '');
    },
  };
}
