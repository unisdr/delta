/**
 * Client-side logging utility that integrates with the server-side logger
 * Sends structured logs to the backend via API endpoint
 * 
 * Enhanced with:
 * - Log sampling for high-traffic scenarios
 * - User session tracking for better traceability
 * - Structured tagging for improved searchability
 * - Log retention policies for lifecycle management
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  [key: string]: any;
}

interface LogTags {
  [key: string]: string | number | boolean;
}

interface RetentionPolicy {
  category: 'short' | 'medium' | 'long' | 'permanent';
  priority: 'low' | 'medium' | 'high' | 'critical';
  ttlDays?: number;
}

interface SamplingConfig {
  enabled: boolean;
  rates: {
    error: number;    // Always 1.0 (100%)
    warn: number;     // Default 0.8 (80%)
    info: number;     // Default 0.3 (30%)
    debug: number;    // Default 0.1 (10%)
  };
  adaptiveThreshold: number; // Increase sampling under this rate
}

interface SessionInfo {
  sessionId: string;
  userId?: string;
  userAgent?: string;
  timestamp: string;
}

interface EnhancedLogPayload extends LogPayload {
  sessionInfo?: SessionInfo;
  tags?: LogTags;
  retentionPolicy?: RetentionPolicy;
  samplingRate?: number;
  correlationId?: string;
}

interface LogPayload {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  componentName?: string;
  userId?: string;
}

/**
 * Generates or retrieves session ID using privacy-safe methods
 */
function getSessionId(): string {
  const SESSION_KEY = '__app_session_id';

  try {
    // Try to get existing session ID from sessionStorage (not localStorage for privacy)
    let sessionId = sessionStorage.getItem(SESSION_KEY);

    if (!sessionId) {
      // Generate new session ID: timestamp + random component
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 8);
      sessionId = `${timestamp}-${random}`;
      sessionStorage.setItem(SESSION_KEY, sessionId);
    }

    return sessionId;
  } catch (error) {
    // Fallback if sessionStorage is not available (e.g., private browsing)
    return `fallback-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
  }
}

/**
 * Determines retention policy based on log level and content
 */
function getRetentionPolicy(level: LogLevel, message: string, context?: LogContext): RetentionPolicy {
  // Define retention policies following industry standards
  switch (level) {
    case 'error':
      return {
        category: 'long',
        priority: 'critical',
        ttlDays: 90 // Errors kept for 90 days
      };
    case 'warn':
      return {
        category: 'medium',
        priority: 'high',
        ttlDays: 30 // Warnings kept for 30 days
      };
    case 'info':
      // Check for important business events
      if (message.toLowerCase().includes('transaction') ||
        message.toLowerCase().includes('payment') ||
        context?.businessCritical === true) {
        return {
          category: 'long',
          priority: 'high',
          ttlDays: 60
        };
      }
      return {
        category: 'medium',
        priority: 'medium',
        ttlDays: 14 // Regular info logs kept for 14 days
      };
    case 'debug':
      return {
        category: 'short',
        priority: 'low',
        ttlDays: 7 // Debug logs kept for 7 days
      };
    default:
      return {
        category: 'medium',
        priority: 'medium',
        ttlDays: 14
      };
  }
}

/**
 * Client logger that sends logs to the server
 */
class ClientLogger {
  private componentName: string;
  private defaultContext: LogContext;
  private endpoint: string;
  private samplingConfig: SamplingConfig;
  private sessionInfo: SessionInfo;
  private logCount: number = 0;
  private lastResetTime: number = Date.now();

  constructor(componentName: string = '', defaultContext: LogContext = {}) {
    this.componentName = componentName;
    this.defaultContext = defaultContext;
    this.endpoint = '/api/client-log';

    // Initialize sampling configuration with industry standard rates
    this.samplingConfig = {
      enabled: true,
      rates: {
        error: 1.0,   // Always log errors (100%)
        warn: 0.8,    // Log 80% of warnings
        info: 0.3,    // Log 30% of info messages
        debug: 0.1    // Log 10% of debug messages
      },
      adaptiveThreshold: 50 // Increase sampling if less than 50 logs per minute
    };

    // Initialize session information
    this.sessionInfo = {
      sessionId: getSessionId(),
      userId: defaultContext.userId,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      timestamp: new Date().toISOString()
    };

    // Override sampling in development
    if (process.env.NODE_ENV === 'development') {
      this.samplingConfig.rates = {
        error: 1.0,
        warn: 1.0,
        info: 1.0,
        debug: 1.0
      };
    }
  }

  /**
   * Create a new logger instance with additional context
   */
  withContext(context: LogContext): ClientLogger {
    return new ClientLogger(
      this.componentName,
      { ...this.defaultContext, ...context }
    );
  }

  /**
   * Add structured tags to enhance log searchability
   */
  withTags(tags: LogTags): ClientLogger {
    const logger = new ClientLogger(this.componentName, this.defaultContext);
    logger.defaultContext = { ...this.defaultContext, __tags: tags };
    return logger;
  }

  /**
   * Configure sampling rates for this logger instance
   */
  configureSampling(config: Partial<SamplingConfig>): ClientLogger {
    const logger = new ClientLogger(this.componentName, this.defaultContext);
    logger.samplingConfig = { ...this.samplingConfig, ...config };
    return logger;
  }

  /**
   * Log an info message
   */
  info(message: string, meta?: any): void {
    this.log('info', message, meta);
  }

  /**
   * Log a warning message
   */
  warn(message: string, meta?: any): void {
    this.log('warn', message, meta);
  }

  /**
   * Log an error message
   */
  error(message: string, meta?: any): void {
    this.log('error', message, meta);
  }

  /**
   * Log a debug message
   */
  debug(message: string, meta?: any): void {
    this.log('debug', message, meta);
  }

  /**
   * Check if this log should be sampled based on level and current traffic
   */
  private shouldSample(level: LogLevel): boolean {
    // Always sample errors regardless of configuration
    if (level === 'error') {
      return true;
    }

    // Skip sampling if disabled
    if (!this.samplingConfig.enabled) {
      return true;
    }

    // Adaptive sampling: increase rate if we're under threshold
    const now = Date.now();
    const timeSinceReset = now - this.lastResetTime;

    // Reset counter every minute
    if (timeSinceReset > 60000) {
      this.logCount = 0;
      this.lastResetTime = now;
    }

    let samplingRate = this.samplingConfig.rates[level];

    // Increase sampling if we're under the adaptive threshold
    if (this.logCount < this.samplingConfig.adaptiveThreshold && timeSinceReset > 30000) {
      samplingRate = Math.min(1.0, samplingRate * 1.5);
    }

    return Math.random() < samplingRate;
  }

  /**
   * Extract and structure tags from context
   */
  private extractTags(context?: LogContext): LogTags {
    const tags: LogTags = {};

    if (context?.__tags) {
      Object.assign(tags, context.__tags);
    }

    // Add standard tags
    tags.component = this.componentName;
    tags.environment = process.env.NODE_ENV || 'unknown';

    // Add contextual tags based on content
    if (context?.userId) tags.hasUserId = true;
    if (context?.apiCall) tags.category = 'api';
    if (context?.userAction) tags.category = 'user-interaction';
    if (context?.error) tags.category = 'error-handling';

    return tags;
  }

  /**
   * Generate correlation ID for request tracing
   */
  private generateCorrelationId(): string {
    return `${this.sessionInfo.sessionId}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  }

  /**
   * Internal method to send logs to the server
   */
  private log(level: LogLevel, message: string, meta?: any): void {
    // Check sampling first
    if (!this.shouldSample(level)) {
      return;
    }

    this.logCount++;

    // Always log to console in development for immediate feedback
    if (process.env.NODE_ENV === 'development') {
      const consoleMethod = level === 'error' ? console.error :
        level === 'warn' ? console.warn :
          level === 'debug' ? console.debug :
            console.log;

      consoleMethod(`[${this.componentName}] ${message}`, {
        ...this.defaultContext,
        ...meta
      });
    }

    // Prepare enhanced context
    const enhancedContext = {
      ...this.defaultContext,
      ...meta
    };

    // Extract tags for structured querying
    const tags = this.extractTags(enhancedContext);

    // Determine retention policy
    const retentionPolicy = getRetentionPolicy(level, message, enhancedContext);

    // Prepare the enhanced log payload
    const payload: EnhancedLogPayload = {
      level,
      message,
      timestamp: new Date().toISOString(),
      componentName: this.componentName,
      context: enhancedContext,
      sessionInfo: this.sessionInfo,
      tags,
      retentionPolicy,
      samplingRate: this.samplingConfig.rates[level],
      correlationId: this.generateCorrelationId()
    };

    // Send log to server asynchronously
    this.sendLogToServer(payload).catch(err => {
      // If sending fails, log to console as fallback
      console.error('Failed to send log to server:', err);
    });
  }

  /**
   * Send log payload to server
   */
  private async sendLogToServer(payload: EnhancedLogPayload): Promise<void> {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        // Don't block navigation with this request
        keepalive: true
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      // Silent failure in production, console error in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Error sending log to server:', error);
      }
    }
  }
}

/**
 * Create a client logger instance
 */
export function createClientLogger(componentName: string = '', defaultContext: LogContext = {}): ClientLogger {
  return new ClientLogger(componentName, defaultContext);
}

/**
 * Default logger instance
 */
export const clientLogger = new ClientLogger('app');

// Export types for external use
export type { LogLevel, LogContext, LogTags, RetentionPolicy, SamplingConfig, SessionInfo, EnhancedLogPayload };

export default createClientLogger;