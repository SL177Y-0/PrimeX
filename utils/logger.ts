/**
 * Centralized logging utility for the Trade App
 * Allows easy enabling/disabling of logs throughout the application
 */

// Configuration - disable logs automatically in Chrome browser contexts
const isChromeBrowser = typeof navigator !== 'undefined' &&
  typeof navigator.userAgent === 'string' &&
  /chrome/i.test(navigator.userAgent) &&
  !/edg|opr|brave/i.test(navigator.userAgent);

const LOGGING_ENABLED = !isChromeBrowser;

// Log levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4,
}

// Current log level - only logs at this level or higher will be shown
const CURRENT_LOG_LEVEL = LogLevel.DEBUG;

class Logger {
  private isEnabled: boolean;
  private logLevel: LogLevel;

  constructor(enabled: boolean = LOGGING_ENABLED, level: LogLevel = CURRENT_LOG_LEVEL) {
    this.isEnabled = enabled;
    this.logLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.isEnabled && level >= this.logLevel;
  }

  debug(...args: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log('[DEBUG]', ...args);
    }
  }

  info(...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info('[INFO]', ...args);
    }
  }

  warn(...args: any[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn('[WARN]', ...args);
    }
  }

  error(...args: any[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error('[ERROR]', ...args);
    }
  }

  critical(...args: any[]): void {
    if (this.shouldLog(LogLevel.CRITICAL)) {
      console.error('[CRITICAL]', ...args);
    }
  }

  // Trading-specific logging methods
  trade(...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log('[TRADE]', ...args);
    }
  }

  market(...args: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log('[MARKET]', ...args);
    }
  }

  wallet(...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log('[WALLET]', ...args);
    }
  }

  // Enable/disable logging at runtime
  enable(): void {
    this.isEnabled = true;
  }

  disable(): void {
    this.isEnabled = false;
  }

  setLevel(level: LogLevel): void {
    this.logLevel = level;
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions
export const log = {
  debug: (...args: any[]) => logger.debug(...args),
  info: (...args: any[]) => logger.info(...args),
  warn: (...args: any[]) => logger.warn(...args),
  error: (...args: any[]) => logger.error(...args),
  critical: (...args: any[]) => logger.critical(...args),
  trade: (...args: any[]) => logger.trade(...args),
  market: (...args: any[]) => logger.market(...args),
  wallet: (...args: any[]) => logger.wallet(...args),
};

export default logger;
