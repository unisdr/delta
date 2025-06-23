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
    warn: number;     // Default 0.5 (50% in production)
    info: number;     // Default 0.1 (10% in production)
    debug: number;    // Default 0.05 (5% in production)
  };
  adaptiveThreshold: number; // Increase sampling under this rate
  maxLogsPerMinute: number;  // Maximum logs per minute before aggressive sampling
  useBeacon: boolean;        // Whether to use navigator.sendBeacon for final retry
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
  private isClient: boolean;

  constructor(componentName: string = '', defaultContext: LogContext = {}) {
    this.componentName = componentName;
    this.defaultContext = defaultContext;
    this.isClient = typeof window !== 'undefined';

    // Use full URL in browser, relative URL in SSR
    const baseUrl = this.isClient ? window.location.origin : '';
    this.endpoint = `${baseUrl}/api/client-log`;

    // Initialize sampling configuration with production-safe defaults
    this.samplingConfig = {
      enabled: true,
      rates: {
        error: 1.0,   // Always log errors (100%)
        warn: 0.5,    // Log 50% of warnings in production
        info: 0.1,    // Log 10% of info messages in production
        debug: 0.05   // Log 5% of debug messages in production
      },
      // More conservative adaptive threshold for production
      adaptiveThreshold: process.env.NODE_ENV === 'production' ? 20 : 50,
      // Maximum logs per minute before aggressive sampling
      maxLogsPerMinute: process.env.NODE_ENV === 'production' ? 100 : 200,
      // Whether to use navigator.sendBeacon for final retry (better for page unload)
      useBeacon: true
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

    const now = Date.now();
    const timeSinceReset = now - this.lastResetTime;
    const oneMinute = 60000;

    // Reset counter every minute
    if (timeSinceReset > oneMinute) {
      this.logCount = 0;
      this.lastResetTime = now;
    }

    // Enforce maximum logs per minute with exponential backoff
    const maxLogs = this.samplingConfig.maxLogsPerMinute || 100;
    const elapsedMinutes = timeSinceReset / oneMinute;
    const currentRate = this.logCount / (elapsedMinutes || 1);

    // If we're exceeding our rate limit, start dropping logs aggressively
    if (currentRate > maxLogs) {
      const excessRatio = currentRate / maxLogs;
      // More aggressive backoff as we exceed our limit
      if (Math.random() < (1 - (1 / excessRatio))) {
        return false;
      }
    }

    let samplingRate = this.samplingConfig.rates[level];

    // Adaptive sampling: increase rate if we're under threshold
    if (this.logCount < this.samplingConfig.adaptiveThreshold && timeSinceReset > 30000) {
      samplingRate = Math.min(1.0, samplingRate * 1.5);
    }

    // Only increment counter if we're going to log this message
    const shouldLog = Math.random() < samplingRate;
    if (shouldLog) {
      this.logCount++;
    }

    return shouldLog;
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
  private async sendWithRetry(endpoint: string, payload: any, retries = 2, isFinalAttempt = false): Promise<void> {
    // On final retry, use sendBeacon if available and enabled
    if (isFinalAttempt && this.samplingConfig.useBeacon && navigator.sendBeacon) {
      try {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        const success = navigator.sendBeacon(endpoint, blob);
        if (success) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[Logger] Log sent successfully via sendBeacon');
          }
          return;
        }
      } catch (beaconError) {
        // Fall through to fetch if beacon fails
        if (process.env.NODE_ENV === 'development') {
          console.warn('[Logger] sendBeacon failed, falling back to fetch:', beaconError);
        }
      }
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
        // Only use keepalive on final attempt to prevent connection pool exhaustion
        keepalive: isFinalAttempt,
        credentials: 'same-origin',
        // Add cache control headers
        cache: 'no-cache',
        redirect: 'follow',
        referrerPolicy: 'strict-origin-when-cross-origin'
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No response body');
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[Logger] Log sent successfully');
      }
      return;
    } catch (error) {
      if (retries > 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Logger] Retrying... (${retries} attempts left)`, error);
        }
        // Exponential backoff
        const delay = Math.min(1000, 300 * Math.pow(2, 3 - retries));
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.sendWithRetry(endpoint, payload, retries - 1, retries === 1);
      }
      throw error; // Re-throw if all retries failed
    }
  }

  private async sendLogToServer(payload: EnhancedLogPayload): Promise<void> {
    // Skip logging during server-side rendering
    if (!this.isClient) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Logger] Skipping log in SSR environment');
      }
      return;
    }

    // Skip logging if we're not in a browser environment
    if (typeof window === 'undefined' || !window.navigator) {
      return;
    }

    // Skip logging if we're offline
    if (!navigator.onLine) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Logger] Skipping log - offline');
      }
      return;
    }

    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Logger] Sending log to:', this.endpoint);
      }

      await this.sendWithRetry(this.endpoint, payload);
    } catch (error) {
      // Only log errors in development to avoid console spam
      if (process.env.NODE_ENV === 'development') {
        console.error('[Logger] Failed to send log after retries:', {
          error: error instanceof Error ? error.message : String(error),
          endpoint: this.endpoint,
          payload: {
            ...payload,
            context: payload.context ? '[Object]' : undefined,
            sessionInfo: payload.sessionInfo ? '[SessionInfo]' : undefined
          }
        });
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