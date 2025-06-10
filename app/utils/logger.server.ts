import * as winston from "winston";
import 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import Transport from 'winston-transport';

process.setMaxListeners(0);

declare const module: {
  hot?: {
    dispose: (cb: () => void) => void;
    accept: () => void;
  };
};

// Utility to mask sensitive data
const maskApiKey = (apiKey: string): string => {
  if (apiKey.length <= 8) return '***';
  return apiKey.substring(0, 4) + '***' + apiKey.substring(apiKey.length - 4);
};

// Validate API key on startup
const validateApiKey = (apiKey: string | undefined): string | null => {
  if (!apiKey) {
    console.warn('REMOTE_LOG_API_KEY not provided - remote logging disabled');
    return null;
  }

  if (apiKey.length < 10) {
    console.error('REMOTE_LOG_API_KEY too short - should be at least 10 characters');
    return null;
  }

  // Check for common patterns (Bearer token, JWT, etc.)
  if (!apiKey.match(/^[A-Za-z0-9_\-\.]+$/)) {
    console.error('REMOTE_LOG_API_KEY contains invalid characters');
    return null;
  }

  return apiKey;
};

// Validate endpoint security
const validateEndpoint = (endpoint: string | undefined): string | null => {
  if (!endpoint) {
    console.warn('REMOTE_LOG_ENDPOINT not provided - remote logging disabled');
    return null;
  }

  if (!endpoint.startsWith('https://')) {
    console.error('REMOTE_LOG_ENDPOINT must use HTTPS for security');
    return null;
  }

  return endpoint;
};

// Configuration from environment variables
const LOG_DIR = process.env.LOG_DIR || 'logs';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const NODE_ENV = process.env.NODE_ENV || 'development';
const APP_VERSION = process.env.APP_VERSION || '1.0.0';

// Remote monitoring configuration
const ENABLE_REMOTE_LOGGING = process.env.ENABLE_REMOTE_LOGGING === 'true';
const REMOTE_LOG_ENDPOINT = validateEndpoint(process.env.REMOTE_LOG_ENDPOINT);
const REMOTE_LOG_API_KEY = validateApiKey(process.env.REMOTE_LOG_API_KEY);
const INSTANCE_ID = process.env.INSTANCE_ID || `dts-${NODE_ENV}-${Date.now()}`;
const DEPLOYMENT_REGION = process.env.DEPLOYMENT_REGION || 'unknown';

// Health check and metrics
const ENABLE_LOG_METRICS = process.env.ENABLE_LOG_METRICS === 'true';
const LOG_RETENTION_DAYS = parseInt(process.env.LOG_RETENTION_DAYS || '30');



// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Log metrics tracking
interface LogMetrics {
  errorCount: number;
  warningCount: number;
  infoCount: number;
  lastError?: Date;
  instanceStartTime: Date;
}

const logMetrics: LogMetrics = {
  errorCount: 0,
  warningCount: 0,
  infoCount: 0,
  instanceStartTime: new Date()
};

// Custom HTTP transport for remote logging
class RemoteLogTransport extends Transport {
  private endpoint: string;
  private apiKey: string;
  private buffer: any[] = [];
  private bufferSize = 100;
  private flushInterval = 30000; // 30 seconds
  private timer?: NodeJS.Timeout;

  constructor(options: { endpoint: string; apiKey: string }) {
    super();

    // Validate endpoint
    if (!options.endpoint?.startsWith('https://')) {
      throw new Error('Remote log endpoint must use HTTPS');
    }

    // Validate API key
    if (!options.apiKey || options.apiKey.length < 10) {
      throw new Error('Invalid API key for remote logging');
    }

    this.endpoint = options.endpoint;
    this.apiKey = options.apiKey;
    this.startBufferFlush();

    console.log(`Remote logging initialized to ${options.endpoint} with key ${maskApiKey(options.apiKey)}`);
  }

  log(info: any, callback: () => void) {
    // Add instance metadata
    const enrichedLog = {
      ...info,
      instanceId: INSTANCE_ID,
      region: DEPLOYMENT_REGION,
      timestamp: new Date().toISOString(),
      hostname: process.env.HOSTNAME || 'unknown'
    };

    this.buffer.push(enrichedLog);

    // Flush immediately for errors
    if (info.level === 'error') {
      this.flushBuffer();
    } else if (this.buffer.length >= this.bufferSize) {
      this.flushBuffer();
    }

    callback();
  }

  private startBufferFlush() {
    this.timer = setInterval(() => {
      if (this.buffer.length > 0) {
        this.flushBuffer();
      }
    }, this.flushInterval);
  }

  private async flushBuffer() {
    if (this.buffer.length === 0) return;

    const logs = [...this.buffer];
    this.buffer = [];

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Instance-ID': INSTANCE_ID
        },
        body: JSON.stringify({ logs })
      });

      if (!response.ok) {
        // ✅ SECURE: Don't log the actual API key
        console.error(`Failed to send logs to remote endpoint: ${response.statusText} (${response.status})`);
        console.error(`Endpoint: ${this.endpoint}, Key: ${maskApiKey(this.apiKey)}`);

        if (this.buffer.length < 1000) {
          this.buffer.unshift(...logs);
        }
      }
    } catch (error) {
      // ✅ SECURE: Error logging without exposing credentials
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Remote logging transport error:', errorMessage);
      console.error(`Failed endpoint: ${this.endpoint}`);
      // Note: Not logging API key for security

      if (this.buffer.length < 1000) {
        this.buffer.unshift(...logs);
      }
    }
  }

  close() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.flushBuffer();
  }
}

// Extended logger interface
interface ExtendedLogger extends winston.Logger {
  withContext: (context: { requestId?: string; userId?: string;[key: string]: any }) => {
    info: (message: string, meta?: any) => void;
    warn: (message: string, meta?: any) => void;
    error: (message: string, meta?: any) => void;
    debug: (message: string, meta?: any) => void;
  };
  getMetrics: () => LogMetrics;
  exportLogs: (startDate?: Date, endDate?: Date) => Promise<any[]>;
}

// Base logger format
const baseFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format((info) => {
    // Add standard fields to all logs
    info.app = 'dts';
    info.version = APP_VERSION;
    info.environment = NODE_ENV;
    info.instanceId = INSTANCE_ID;
    info.region = DEPLOYMENT_REGION;

    // Update metrics
    if (ENABLE_LOG_METRICS) {
      switch (info.level) {
        case 'error':
          logMetrics.errorCount++;
          logMetrics.lastError = new Date();
          break;
        case 'warn':
          logMetrics.warningCount++;
          break;
        case 'info':
          logMetrics.infoCount++;
          break;
      }
    }

    return info;
  })(),
  winston.format.json()
);

// Create transport factory functions
const createFileTransport = (logType: 'access' | 'error' | 'general' = 'general') => {
  const filename = logType === 'access'
    ? path.join(LOG_DIR, 'access-%DATE%.log')
    : logType === 'error'
      ? path.join(LOG_DIR, 'error-%DATE%.log')
      : path.join(LOG_DIR, 'dts-%DATE%.log');

  const transport = new winston.transports.DailyRotateFile({
    filename,
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '10m',
    maxFiles: `${LOG_RETENTION_DAYS}d`,
    handleExceptions: logType !== 'access',
    handleRejections: logType !== 'access',
    level: logType === 'error' ? 'error' : undefined
  });

  transport.setMaxListeners(20);
  return transport;
};

const createConsoleTransport = () => {
  const transport = new winston.transports.Console({
    handleExceptions: true,
    handleRejections: true,
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ level, message, timestamp, module, requestId, instanceId }) => {
        const moduleStr = module ? `[${module}]` : '';
        const reqStr = requestId ? `(${requestId})` : '';
        const instanceStr = instanceId ? `{${instanceId}}` : '';
        return `${level}: ${message} ${moduleStr}${reqStr}${instanceStr} ${timestamp}`;
      })
    ),
  });

  transport.setMaxListeners(20);
  return transport;
};

// Cache for logger instances
const loggerCache = new Map<string, ExtendedLogger>();

const createLogger = (module: string = "", logType: 'access' | 'error' | 'general' = 'general'): ExtendedLogger => {
  const cacheKey = `${module}-${logType}`;
  if (loggerCache.has(cacheKey)) {
    return loggerCache.get(cacheKey)!;
  }

  // Create transports
  const transports: winston.transport[] = [createFileTransport(logType)];

  // Add console transport in development
  if (NODE_ENV === 'development') {
    transports.push(createConsoleTransport());
  }

  // Add remote transport if enabled
  if (ENABLE_REMOTE_LOGGING && REMOTE_LOG_ENDPOINT && REMOTE_LOG_API_KEY) {
    try {
      transports.push(new RemoteLogTransport({
        endpoint: REMOTE_LOG_ENDPOINT,
        apiKey: REMOTE_LOG_API_KEY
      }));
    } catch (error) {
      console.error('Failed to initialize remote logging:', error instanceof Error ? error.message : String(error));
      // Continue without remote logging rather than crashing
    }
  }

  const logger = winston.createLogger({
    level: LOG_LEVEL,
    format: winston.format.combine(
      baseFormat,
      winston.format((info) => {
        if (module) {
          info.module = module;
        }
        info.logType = logType;
        return info;
      })()
    ),
    transports,
    exitOnError: false,
  }) as ExtendedLogger;

  // Add request context method
  logger.withContext = (context: { requestId?: string; userId?: string;[key: string]: any }) => {
    return {
      info: (message: string, meta?: any) => logger.info(message, { ...context, ...meta }),
      warn: (message: string, meta?: any) => logger.warn(message, { ...context, ...meta }),
      error: (message: string, meta?: any) => logger.error(message, { ...context, ...meta }),
      debug: (message: string, meta?: any) => logger.debug(message, { ...context, ...meta }),
    };
  };

  // Add metrics method
  logger.getMetrics = () => ({ ...logMetrics });

  // Add log export method
  logger.exportLogs = async (startDate?: Date, endDate?: Date) => {
    // This would read log files and return structured data
    // Implementation depends on your specific needs
    const logs: any[] = [];

    try {
      const logFiles = fs.readdirSync(LOG_DIR).filter(file =>
        file.includes('dts-') && file.endsWith('.log')
      );

      for (const file of logFiles) {
        const content = fs.readFileSync(path.join(LOG_DIR, file), 'utf8');
        const lines = content.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const logEntry = JSON.parse(line);
            const logDate = new Date(logEntry.timestamp);

            if ((!startDate || logDate >= startDate) &&
              (!endDate || logDate <= endDate)) {
              logs.push(logEntry);
            }
          } catch (e) {
            // Skip malformed log lines
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to export logs', { error: errorMessage });
    }

    return logs;
  };

  loggerCache.set(cacheKey, logger);
  return logger;
};

// Specialized logger instances
export const appLogger = createLogger('app', 'general');
export const accessLogger = createLogger('access', 'access');
export const errorLogger = createLogger('error', 'error');

// Export factory function
export default createLogger;

// Utility functions
export const createRequestLogger = (requestId: string, userId?: string) => {
  return createLogger().withContext({ requestId, userId });
};

// Health check endpoint data
export const getLoggerHealthCheck = () => {
  return {
    status: 'healthy',
    instanceId: INSTANCE_ID,
    region: DEPLOYMENT_REGION,
    metrics: logMetrics,
    remoteLoggingEnabled: ENABLE_REMOTE_LOGGING,
    remoteEndpoint: REMOTE_LOG_ENDPOINT ? new URL(REMOTE_LOG_ENDPOINT).origin : null, // Only show domain
    apiKeyConfigured: !!REMOTE_LOG_API_KEY,
    apiKeyMasked: REMOTE_LOG_API_KEY ? maskApiKey(REMOTE_LOG_API_KEY) : null,
    logRetentionDays: LOG_RETENTION_DAYS,
    uptime: Date.now() - logMetrics.instanceStartTime.getTime()
  };
};

// Log streaming for real-time monitoring
export const createLogStream = () => {
  const EventEmitter = require('events');
  const emitter = new EventEmitter();

  // Override console methods to capture all logs
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  const originalConsoleLog = console.log;

  console.error = (...args) => {
    originalConsoleError(...args);
    emitter.emit('log', { level: 'error', message: args.join(' '), timestamp: new Date() });
  };

  console.warn = (...args) => {
    originalConsoleWarn(...args);
    emitter.emit('log', { level: 'warn', message: args.join(' '), timestamp: new Date() });
  };

  console.log = (...args) => {
    originalConsoleLog(...args);
    emitter.emit('log', { level: 'info', message: args.join(' '), timestamp: new Date() });
  };

  return emitter;
};

// Graceful shutdown handling
let isCleanupRegistered = false; // Add this flag

const cleanup = () => {
  // Close all loggers in cache
  loggerCache.forEach((logger) => {
    logger.close();
  });
  loggerCache.clear();
  winston.loggers.close();

  // Close remote log transports if enabled
  if (ENABLE_REMOTE_LOGGING) {
    const transports = [appLogger, accessLogger, errorLogger].flatMap(logger =>
      logger.transports.filter(t => t instanceof RemoteLogTransport)
    ) as RemoteLogTransport[];

    transports.forEach(transport => transport.close());
  }
};

// Only set up process handlers in Node.js environment AND only once
if (typeof process !== 'undefined' && process.release && process.release.name === 'node' && !isCleanupRegistered) {
  isCleanupRegistered = true; // Prevent multiple registrations

  // Clean up on process exit
  process.on('exit', cleanup);

  // Handle termination signals
  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });
}

// Development hot reloading
if (typeof module !== 'undefined' && module.hot) {
  module.hot.accept();
}