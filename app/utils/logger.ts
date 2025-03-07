/**
 * Logger utility for consistent logging across the application
 */

// Log levels
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

// Log entry structure
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  details?: any;
}

// Logger configuration
interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
}

// Default configuration
const defaultConfig: LoggerConfig = {
  minLevel: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  enableConsole: true
};

// Current configuration
let config = { ...defaultConfig };

/**
 * Configure the logger
 * @param newConfig - Partial configuration to merge with current config
 */
export function configureLogger(newConfig: Partial<LoggerConfig>): void {
  config = { ...config, ...newConfig };
}

/**
 * Format a log entry for output
 * @param entry - Log entry to format
 * @returns Formatted log string
 */
function formatLogEntry(entry: LogEntry): string {
  const { timestamp, level, module, message } = entry;
  let formattedMessage = `[${timestamp}] [${level.toUpperCase()}] [${module}] ${message}`;
  
  if (entry.details) {
    if (typeof entry.details === 'object') {
      try {
        const detailsStr = JSON.stringify(entry.details, null, 2);
        formattedMessage += `\nDetails: ${detailsStr}`;
      } catch (e) {
        formattedMessage += `\nDetails: [Object could not be stringified]`;
      }
    } else {
      formattedMessage += `\nDetails: ${entry.details}`;
    }
  }
  
  return formattedMessage;
}

/**
 * Log a message
 * @param level - Log level
 * @param module - Module name
 * @param message - Log message
 * @param details - Optional details object
 */
function log(level: LogLevel, module: string, message: string, details?: any): void {
  // Skip if below minimum level
  if (!shouldLog(level)) {
    return;
  }
  
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    module,
    message,
    details
  };
  
  const formattedMessage = formatLogEntry(entry);
  
  // Log to console if enabled
  if (config.enableConsole) {
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
    }
  }
  
  // Here you could add additional log destinations (file, database, etc.)
}

/**
 * Check if a log level should be logged
 * @param level - Log level to check
 * @returns Whether the level should be logged
 */
function shouldLog(level: LogLevel): boolean {
  const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
  const minLevelIndex = levels.indexOf(config.minLevel);
  const levelIndex = levels.indexOf(level);
  
  return levelIndex >= minLevelIndex;
}

/**
 * Create a logger for a specific module
 * @param module - Module name
 * @returns Logger object with methods for each log level
 */
export function createLogger(module: string) {
  return {
    debug: (message: string, details?: any) => log(LogLevel.DEBUG, module, message, details),
    info: (message: string, details?: any) => log(LogLevel.INFO, module, message, details),
    warn: (message: string, details?: any) => log(LogLevel.WARN, module, message, details),
    error: (message: string, details?: any) => log(LogLevel.ERROR, module, message, details)
  };
}
