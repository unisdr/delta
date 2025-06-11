// Using Response.json() instead of deprecated json function
import type { ActionFunction } from "@remix-run/node";
import createLogger from "~/utils/logger.server";

/**
 * Enhanced client-log API endpoint that supports:
 * - Log sampling validation
 * - Session tracking with privacy compliance
 * - Structured tagging for improved searchability
 * - Retention policies with lifecycle management
 * - Query preparation for log aggregation systems
 */

// Enhanced types that match the clientLogger.ts implementation
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

interface SessionInfo {
  sessionId: string;
  userId?: string;
  userAgent?: string;
  timestamp: string;
}

interface EnhancedLogPayload {
  level: LogLevel;
  message: string;
  timestamp: string;
  componentName?: string;
  context?: LogContext;
  userId?: string;
  sessionInfo?: SessionInfo;
  tags?: LogTags;
  retentionPolicy?: RetentionPolicy;
  samplingRate?: number;
  correlationId?: string;
}

// Create a dedicated logger for client logs
const clientLoggerServer = createLogger('client-logs', 'general');

/**
 * Enhanced helper functions for logging features
 */

// Validate sampling rate to ensure it's within acceptable bounds
function validateSamplingRate(level: LogLevel, samplingRate?: number): boolean {
  if (samplingRate === undefined) return true;

  // Ensure sampling rate is between 0 and 1
  if (samplingRate < 0 || samplingRate > 1) return false;

  // Errors should always have high sampling rate
  if (level === 'error' && samplingRate < 0.8) return false;

  return true;
}

// Validate retention policy to ensure it follows organizational standards
function validateRetentionPolicy(retentionPolicy?: RetentionPolicy): boolean {
  if (!retentionPolicy) return true;

  const validCategories = ['short', 'medium', 'long', 'permanent'];
  const validPriorities = ['low', 'medium', 'high', 'critical'];

  if (!validCategories.includes(retentionPolicy.category)) return false;
  if (!validPriorities.includes(retentionPolicy.priority)) return false;

  // TTL should be reasonable (1 day to 5 years)
  if (retentionPolicy.ttlDays && (retentionPolicy.ttlDays < 1 || retentionPolicy.ttlDays > 1825)) {
    return false;
  }

  return true;
}

// Validate session information for privacy compliance
function validateSessionInfo(sessionInfo?: SessionInfo): boolean {
  if (!sessionInfo) return true;

  // Session ID should be present and not too long
  if (!sessionInfo.sessionId || sessionInfo.sessionId.length > 100) return false;

  // User agent should not be too long (prevent abuse)
  if (sessionInfo.userAgent && sessionInfo.userAgent.length > 500) return false;

  return true;
}

// Validate tags to ensure they meet structured logging standards
function validateTags(tags?: LogTags): boolean {
  if (!tags) return true;

  // Limit number of tags to prevent abuse
  if (Object.keys(tags).length > 20) return false;

  // Check tag keys and values
  for (const [key, value] of Object.entries(tags)) {
    // Tag keys should be alphanumeric with underscores/hyphens
    if (!/^[a-zA-Z0-9_-]+$/.test(key)) return false;

    // Tag key length limit
    if (key.length > 50) return false;

    // Tag value should be simple types and not too long
    if (typeof value === 'string' && value.length > 200) return false;
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
      return false;
    }
  }

  return true;
}

// Sanitize context data to remove sensitive information
function sanitizeContext(context: LogContext): LogContext {
  if (!context || typeof context !== 'object') return context;

  const sensitiveKeys = [
    'password', 'token', 'apiKey', 'secret', 'authorization',
    'creditCard', 'ssn', 'email', 'phone', 'address'
  ];

  const sanitized = { ...context };

  // Remove sensitive fields
  sensitiveKeys.forEach(key => {
    if (key in sanitized) {
      sanitized[key] = '[REDACTED]';
    }
  });

  // Truncate large objects/strings
  Object.keys(sanitized).forEach(key => {
    if (typeof sanitized[key] === 'string' && sanitized[key].length > 1000) {
      sanitized[key] = sanitized[key].substring(0, 1000) + '...[truncated]';
    }
  });

  return sanitized;
}

// Prepare structured query fields from enhanced log payload
function prepareQueryFields(payload: EnhancedLogPayload): Record<string, any> {
  const queryFields: Record<string, any> = {
    level: payload.level,
    timestamp: payload.timestamp,
    component: payload.componentName || 'unknown',
    correlationId: payload.correlationId
  };

  // Add session tracking fields if available
  if (payload.sessionInfo?.sessionId) {
    queryFields.sessionId = payload.sessionInfo.sessionId;
    queryFields.sessionTimestamp = payload.sessionInfo.timestamp;
  }

  // Add structured tags if available
  if (payload.tags && Object.keys(payload.tags).length > 0) {
    queryFields.tags = payload.tags;
    // Flatten important tags for easier querying
    if (payload.tags.component) queryFields.tagComponent = payload.tags.component;
    if (payload.tags.environment) queryFields.tagEnvironment = payload.tags.environment;
    if (payload.tags.category) queryFields.tagCategory = payload.tags.category;
  }

  // Add retention information
  if (payload.retentionPolicy) {
    queryFields.retentionCategory = payload.retentionPolicy.category;
    queryFields.retentionPriority = payload.retentionPolicy.priority;
    queryFields.retentionTtlDays = payload.retentionPolicy.ttlDays;

    // Calculate expiration date for query optimization
    if (payload.retentionPolicy.ttlDays) {
      queryFields.expiresAt = new Date(
        new Date(payload.timestamp).getTime() + (payload.retentionPolicy.ttlDays * 24 * 60 * 60 * 1000)
      ).toISOString();
    }
  }

  // Add sampling information
  if (payload.samplingRate !== undefined) {
    queryFields.samplingRate = payload.samplingRate;
  }

  return queryFields;
}

// Enrich log with server-side metadata
function enrichLogPayload(payload: EnhancedLogPayload, request: Request): EnhancedLogPayload {
  const enriched = { ...payload };

  // Add server timestamp for comparison with client timestamp
  enriched.context = {
    ...enriched.context,
    serverTimestamp: new Date().toISOString(),
    serverUserAgent: request.headers.get('user-agent'),
    clientIP: request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown'
  };

  // Add request ID if available
  const requestId = request.headers.get('x-request-id');
  if (requestId) {
    enriched.context.requestId = requestId;
  }

  return enriched;
}

/**
 * API endpoint to receive client-side logs and relay them to the server logger
 * Enhanced with support for sampling, session tracking, structured tagging, and retention policies
 */
export const action: ActionFunction = async ({ request }) => {
  try {
    // Only accept POST requests
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Parse the enhanced log payload
    const payload = await request.json() as EnhancedLogPayload;
    const {
      level,
      message,
      componentName,
      context,
      sessionInfo,
      tags,
      retentionPolicy,
      samplingRate,
      correlationId
    } = payload;

    // Validate required fields (preserve original validation)
    if (!level || !message) {
      return new Response(JSON.stringify({ success: false, error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Validate log level (preserve original validation)
    if (!['info', 'warn', 'error', 'debug'].includes(level)) {
      return new Response(JSON.stringify({ success: false, error: "Invalid log level" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Enhanced validation for new fields
    if (!validateSamplingRate(level, samplingRate)) {
      return new Response(JSON.stringify({ success: false, error: "Invalid sampling rate" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (!validateRetentionPolicy(retentionPolicy)) {
      return new Response(JSON.stringify({ success: false, error: "Invalid retention policy" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (!validateSessionInfo(sessionInfo)) {
      return new Response(JSON.stringify({ success: false, error: "Invalid session information" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (!validateTags(tags)) {
      return new Response(JSON.stringify({ success: false, error: "Invalid tags format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Sanitize sensitive data
    const sanitizedContext = sanitizeContext(context || {});

    // Enrich log with server-side data
    const enrichedPayload = enrichLogPayload(
      { ...payload, context: sanitizedContext },
      request
    );

    // Extract user ID from multiple sources (preserve original pattern)
    const userId = sanitizedContext?.userId || sessionInfo?.userId || null;

    // Prepare query fields for structured logging
    const queryFields = prepareQueryFields(enrichedPayload);

    // Prepare response headers with enhanced metadata
    const responseHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Log-Level': level
    };

    // Add retention policy headers
    if (retentionPolicy?.ttlDays) {
      responseHeaders['X-Log-Retention-Days'] = retentionPolicy.ttlDays.toString();
      responseHeaders['X-Log-Retention-Category'] = retentionPolicy.category;
    }

    // Add session tracking headers if available
    if (sessionInfo?.sessionId) {
      responseHeaders['X-Session-ID'] = sessionInfo.sessionId;
    }
    if (correlationId) {
      responseHeaders['X-Correlation-ID'] = correlationId;
    }

    // Create context-aware logger with enhanced metadata (preserve original pattern)
    const contextualLogger = clientLoggerServer.withContext({
      componentName,
      userId,
      clientSide: true,
      sessionId: sessionInfo?.sessionId,
      correlationId,
      samplingRate,
      retentionPolicy,
      tags,
      queryFields,
      ...sanitizedContext
    });

    // Log the message with the appropriate level (preserve original logic)
    switch (level) {
      case 'info':
        contextualLogger.info(message);
        break;
      case 'warn':
        contextualLogger.warn(message);
        break;
      case 'error':
        contextualLogger.error(message);
        break;
      case 'debug':
        contextualLogger.debug(message);
        break;
    }

    // Return enhanced success response
    return new Response(JSON.stringify({
      success: true,
      metadata: {
        processed: true,
        correlationId,
        sessionId: sessionInfo?.sessionId,
        retentionCategory: retentionPolicy?.category,
        retentionDays: retentionPolicy?.ttlDays,
        samplingRate,
        queryFields: Object.keys(queryFields)
      }
    }), {
      status: 200,
      headers: responseHeaders
    });

  } catch (error) {
    // Enhanced error logging with context (preserve original pattern)
    clientLoggerServer.error('Error processing client log', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      requestHeaders: Object.fromEntries(request.headers.entries())
    });

    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

/**
 * Handle preflight requests for CORS (preserve original logic)
 */
export const loader = () => {
  return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" }
  });
};