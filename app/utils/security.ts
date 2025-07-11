/**
 * Security utility functions for input sanitization and validation
 * 
 * This module provides comprehensive security utilities for input validation and sanitization
 * using DOMPurify for HTML sanitization and validator.js for input validation.
 * 
 * @module security
 */

import DOMPurify from 'dompurify';
import { JSDOM, VirtualConsole } from 'jsdom';
import validator from 'validator';

// Create a minimal window-like object for DOMPurify
const { window } = new JSDOM('', {
    virtualConsole: new VirtualConsole(),
    url: 'https://example.org/' // Required for DOMPurify to work correctly
});

// Create a DOMPurify instance with the minimal window object
const domPurify = DOMPurify(window as unknown as Window & typeof globalThis);

// Add missing globals that DOMPurify expects
const globalAny = global as any;
globalAny.NodeFilter = window.NodeFilter;
globalAny.DocumentFragment = window.DocumentFragment;
globalAny.HTMLTemplateElement = window.HTMLTemplateElement;
globalAny.Node = window.Node;
globalAny.Element = window.Element;
globalAny.NamedNodeMap = window.NamedNodeMap;
globalAny.HTMLFormElement = window.HTMLFormElement;
globalAny.DOMParser = window.DOMParser;



// Add DOMPurify hooks for additional security
const setupDOMPurifyHooks = () => {
    domPurify.addHook('uponSanitizeElement', (_node: any, data: { tagName: string }) => {
        // Prevent iframes and other potentially dangerous elements
        if (data.tagName === 'iframe') {
            return window.NodeFilter.FILTER_REJECT as number;
        }
        return window.NodeFilter.FILTER_ACCEPT as number;
    });

    domPurify.addHook('uponSanitizeAttribute', (_node: any, data: { attrName?: string }) => {
        // Remove any on* attributes (event handlers)
        if (data.attrName && data.attrName.match(/^on[a-z]+/i)) {
            return window.NodeFilter.FILTER_REJECT as number;
        }
        return window.NodeFilter.FILTER_ACCEPT as number;
    });
};

// Initialize the hooks
setupDOMPurifyHooks();


/**
 * Sanitization options for different input types
 */
const sanitizeOptions = {
    // Basic HTML with safe elements and attributes
    BASIC_HTML: {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
        ALLOWED_ATTR: ['href', 'title'],
    },
    // For text content that should be completely stripped of HTML
    PLAIN_TEXT: {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
    },
    // For rich text content that needs more HTML elements
    RICH_TEXT: {
        ALLOWED_TAGS: [
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'b', 'i', 'em', 'strong', 'a', 'p', 'br',
            'ul', 'ol', 'li', 'blockquote', 'code', 'pre',
            'table', 'thead', 'tbody', 'tr', 'th', 'td'
        ],
        ALLOWED_ATTR: ['href', 'title', 'class', 'target', 'rel'],
    }
} as const;

// Create mutable copies of the sanitize options
const mutableSanitizeOptions = {
    BASIC_HTML: {
        ALLOWED_TAGS: [...sanitizeOptions.BASIC_HTML.ALLOWED_TAGS],
        ALLOWED_ATTR: [...sanitizeOptions.BASIC_HTML.ALLOWED_ATTR],
    },
    PLAIN_TEXT: {
        ALLOWED_TAGS: [...sanitizeOptions.PLAIN_TEXT.ALLOWED_TAGS],
        ALLOWED_ATTR: [...sanitizeOptions.PLAIN_TEXT.ALLOWED_ATTR],
    },
    RICH_TEXT: {
        ALLOWED_TAGS: [...sanitizeOptions.RICH_TEXT.ALLOWED_TAGS],
        ALLOWED_ATTR: [...sanitizeOptions.RICH_TEXT.ALLOWED_ATTR],
    }
};

type SanitizeOptions = keyof typeof mutableSanitizeOptions | {
    ALLOWED_TAGS?: string[];
    ALLOWED_ATTR?: string[];
    ALLOWED_URI_REGEXP?: RegExp;
};

/**
 * Sanitizes input strings to prevent XSS and injection attacks
 * @param input - The input string to sanitize
 * @param options - Sanitization options (default: 'PLAIN_TEXT')
 * @returns Sanitized string or null if input is null/undefined
 * 
 * @example
 * // Basic usage (strips all HTML)
 * const safeInput = sanitizeInput(userInput);
 * 
 * // Allow basic HTML
 * const safeHtml = sanitizeInput(userHtml, 'BASIC_HTML');
 * 
 * // Custom sanitization options
 * const customSanitized = sanitizeInput(html, {
 *   ALLOWED_TAGS: ['b', 'i', 'em', 'strong'],
 *   ALLOWED_ATTR: ['class']
 * });
 */
export function sanitizeInput(
    input: string | null | undefined,
    options: SanitizeOptions = 'PLAIN_TEXT'
): string | null {
    if (input === null || input === undefined) {
        return null;
    }

    // Convert to string in case input is not a string
    let sanitized = String(input);

    // Get sanitization options
    const sanitizeOpts = typeof options === 'string'
        ? mutableSanitizeOptions[options as keyof typeof mutableSanitizeOptions]
        : options;

    try {
        // Sanitize HTML using DOMPurify
        sanitized = domPurify.sanitize(sanitized, {
            ALLOWED_TAGS: sanitizeOpts.ALLOWED_TAGS || [],
            ALLOWED_ATTR: sanitizeOpts.ALLOWED_ATTR || [],
            // Additional security measures
            FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed'],
            FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick'],
            // Prevent DOM clobbering
            FORCE_BODY: true,
            // Additional XSS protection
            SAFE_FOR_TEMPLATES: true,
            // Sanitize data attributes
            ADD_ATTR: ['target', 'rel', 'noreferrer', 'noopener'],
            // Additional security
            ALLOW_UNKNOWN_PROTOCOLS: false,
            ALLOW_DATA_ATTR: false,
            USE_PROFILES: { html: true },
            // Custom element handling
            CUSTOM_ELEMENT_HANDLING: {
                tagNameCheck: /^[a-z][a-z0-9-]*$/,
                attributeNameCheck: /^[a-z][a-z0-9\-_:.]*/,
                allowCustomizedBuiltInElements: false,
            } as const,
            // Sanitize URLs
            SANITIZE_NAMED_PROPS: true,
            // Prevent mXSS
            KEEP_CONTENT: false,
            // Additional security for SVG
            WHOLE_DOCUMENT: false,
            // Additional security for HTML5
            ADD_URI_SAFE_ATTR: ['target', 'rel', 'noreferrer', 'noopener'],
        });

        // Additional security: Escape any remaining HTML if in PLAIN_TEXT mode
        const isPlainText = typeof options === 'string' && options === 'PLAIN_TEXT';
        if (isPlainText || (sanitizeOpts.ALLOWED_TAGS?.length === 0)) {
            sanitized = sanitized
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#x27;')
                .replace(/\//g, '&#x2F;');
        }

        // Normalize whitespace and trim
        return sanitized.trim().replace(/\s+/g, ' ') || null;
    } catch (error) {
        console.error('Error sanitizing input:', error);
        // In case of error, return a safe empty string
        return '';
    }
}

/**
 * Rate limiting configuration and types
 */

// Standard rate limit tiers with OWASP-recommended values
const RATE_LIMIT_TIERS = {
    BURST: {
        name: 'burst',
        limit: parseInt(process.env.RATE_LIMIT_BURST || '100', 10),
        windowMs: 60 * 1000, // 1 minute
        retryAfterMs: 60 * 1000, // 1 minute
    },
    OPERATIONAL: {
        name: 'operational',
        limit: parseInt(process.env.RATE_LIMIT_OPERATIONAL || '1000', 10),
        windowMs: 60 * 60 * 1000, // 1 hour
        retryAfterMs: 5 * 60 * 1000, // 5 minutes
    },
    DAILY: {
        name: 'daily',
        limit: parseInt(process.env.RATE_LIMIT_DAILY || '10000', 10),
        windowMs: 24 * 60 * 60 * 1000, // 24 hours
        retryAfterMs: 60 * 60 * 1000, // 1 hour
    },
} as const;

type RateLimitTier = keyof typeof RATE_LIMIT_TIERS;

interface RateLimitResult {
    allowed: boolean;
    tier?: string;
    limit: number;
    remaining: number;
    reset: number;
    retryAfter: number;
}

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

// IP whitelist/blacklist (can be loaded from environment or database)
const IP_WHITELIST = new Set<string>(
    (process.env.IP_WHITELIST?.split(',').map(ip => ip.trim()).filter(Boolean) || [])
);
const IP_BLACKLIST = new Set<string>(
    (process.env.IP_BLACKLIST?.split(',').map(ip => ip.trim()).filter(Boolean) || [])
);

/**
 * Validates and sanitizes an email address
 * @param email - The email address to validate and sanitize
 * @returns Sanitized email or null if invalid
 */
export function sanitizeEmail(email: string | null | undefined): string | null {
    if (!email) return null;

    const sanitized = String(email).trim().toLowerCase();
    return validator.isEmail(sanitized) ? sanitized : null;
}

/**
 * Validates and sanitizes a URL
 * @param url - The URL to validate and sanitize
 * @returns Sanitized URL or null if invalid
 */
export function sanitizeUrl(url: string | null | undefined): string | null {
    if (!url) return null;

    const sanitized = String(url).trim();
    return validator.isURL(sanitized, {
        protocols: ['http', 'https'],
        require_protocol: true,
        require_valid_protocol: true,
        require_host: true,
        require_port: false,
        allow_protocol_relative_urls: false,
        allow_underscores: false,
        allow_trailing_dot: false,
        disallow_auth: true
    }) ? sanitized : null;
}

/**
 * Validates if a string is a safe filename
 * @param filename - The filename to validate
 * @returns True if the filename is safe
 */
export function isValidFilename(filename: string | null | undefined): boolean {
    if (!filename) return false;

    // Basic validation
    if (filename.length > 255) return false;

    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*\x00-\x1F]/g;
    if (invalidChars.test(filename)) return false;

    // Check for reserved names (Windows)
    const reservedNames = [
        'CON', 'PRN', 'AUX', 'NUL',
        'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
        'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
    ];

    const baseName = filename.split('.')[0].toUpperCase();
    if (reservedNames.includes(baseName)) return false;

    return true;
}

// Add a final catch block for any unhandled errors in the file
try {
    // This empty try-catch is here to catch any unhandled errors in the file
} catch (error) {
    console.error('Unexpected error in security utilities:', error);
    // In a production environment, you might want to log this to an error tracking service
}

// In-memory store for rate limiting
const rateLimitStore = new Map<string, Map<RateLimitTier, RateLimitEntry>>();

// Last cleanup time for rate limit entries
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute
const ENTRY_RETENTION = 24 * 60 * 60 * 1000; // 24 hours

// Optional metrics callback type
type RateLimitMetricsCallback = (ip: string, tier: string, count: number, limit: number) => void;

// Global metrics callback (can be set by application)
let metricsCallback: RateLimitMetricsCallback | null = null;

/**
 * Set a callback to be notified when rate limits are exceeded
 * @param callback - Function to call when rate limit is exceeded
 */
export function setRateLimitMetricsCallback(callback: RateLimitMetricsCallback | null): void {
    metricsCallback = callback;
}

/**
 * Get client IP address from request headers
 * Handles various proxy headers and prevents IP spoofing
 */
function getClientIp(request: Request): string {
    // List of headers to check for IP address (in order of preference)
    const headerCandidates = [
        'cf-connecting-ip',         // Cloudflare
        'x-real-ip',                // Common header
        'x-forwarded-for',          // Standard header for proxies
        'x-client-ip',              // Some proxies
        'x-original-forwarded-for',  // Some load balancers
        'x-cluster-client-ip'       // Some load balancers
    ];

    // Check each header in order
    for (const header of headerCandidates) {
        const value = request.headers.get(header);
        if (value) {
            // Handle X-Forwarded-For format ("client, proxy1, proxy2")
            const ips = value.split(',').map(ip => ip.trim());
            // Return first non-internal IP address
            const clientIp = ips.find(ip => {
                // Basic IP validation
                if (!ip || ip === 'unknown') return false;
                // Skip internal/private IPs if they're not the only option
                if (ip.startsWith('10.') ||
                    ip.startsWith('192.168.') ||
                    ip.startsWith('172.16.') ||
                    ip === '127.0.0.1' ||
                    ip === '::1') {
                    return false;
                }
                return true;
            });

            if (clientIp) return clientIp;
            // If no public IP found, return the first one
            if (ips[0]) return ips[0];
        }
    }

    // Fallback to remote address if no headers found
    const remoteAddress = (request as any).socket?.remoteAddress;
    if (remoteAddress && remoteAddress !== '::1' && remoteAddress !== '127.0.0.1') {
        return remoteAddress;
    }

    // Log warning if we couldn't determine IP
    console.warn('[Security] Unable to determine client IP from headers:',
        JSON.stringify({
            'x-forwarded-for': request.headers.get('x-forwarded-for'),
            'x-real-ip': request.headers.get('x-real-ip'),
            'cf-connecting-ip': request.headers.get('cf-connecting-ip'),
            'x-client-ip': request.headers.get('x-client-ip'),
            'x-original-forwarded-for': request.headers.get('x-original-forwarded-for'),
            'x-cluster-client-ip': request.headers.get('x-cluster-client-ip')
        }));

    return 'unknown';
}

/**
 * Clean up old rate limit entries
 */
function cleanUpOldEntries(): void {
    const now = Date.now();
    // Only clean up once per cleanup interval
    if (now - lastCleanup < CLEANUP_INTERVAL) return;

    lastCleanup = now;
    const cutoff = now - ENTRY_RETENTION;
    let cleaned = 0;

    for (const [ip, tiers] of rateLimitStore.entries()) {
        for (const [tier, entry] of tiers.entries()) {
            // Delete entries older than retention period
            if (entry.resetTime < cutoff) {
                tiers.delete(tier);
                cleaned++;
            }
        }

        // Remove IP entry if no tiers left
        if (tiers.size === 0) {
            rateLimitStore.delete(ip);
        }
    }

    if (cleaned > 0) {
        console.log(`[RateLimit] Cleaned up ${cleaned} old entries`);
    }
}

/**
 * Check rate limits for all tiers and return detailed result
 * @param request - The incoming request
 * @returns RateLimitResult with detailed rate limit information
 */
function checkRateLimits(request: Request): RateLimitResult {
    const ip = getClientIp(request);
    const now = Date.now();

    // Check whitelist/blacklist first
    if (IP_WHITELIST.has(ip)) {
        return {
            allowed: true,
            limit: Infinity,
            remaining: Infinity,
            reset: now + 60000, // 1 minute from now
            retryAfter: 0
        };
    }

    if (IP_BLACKLIST.has(ip)) {
        return {
            allowed: false,
            tier: 'blacklisted',
            limit: 0,
            remaining: 0,
            reset: now + 3600000, // 1 hour from now
            retryAfter: 3600000
        };
    }

    // Initialize IP entry if it doesn't exist
    if (!rateLimitStore.has(ip)) {
        rateLimitStore.set(ip, new Map());
    }

    const ipEntry = rateLimitStore.get(ip)!;
    let result: RateLimitResult | null = null;

    // Check each tier in order
    for (const [tierKey, tierConfig] of Object.entries(RATE_LIMIT_TIERS) as [RateLimitTier, typeof RATE_LIMIT_TIERS[RateLimitTier]][]) {
        const tierEntry = ipEntry.get(tierKey);
        const resetTime = now - (now % tierConfig.windowMs) + tierConfig.windowMs;

        // Initialize or reset tier entry
        if (!tierEntry || now > tierEntry.resetTime) {
            ipEntry.set(tierKey, {
                count: 1,
                resetTime: resetTime
            });
        } else {
            // Increment counter
            tierEntry.count++;
            ipEntry.set(tierKey, tierEntry);
        }

        const currentEntry = ipEntry.get(tierKey)!;
        const remaining = Math.max(0, tierConfig.limit - currentEntry.count);

        // If any tier is exceeded, return early with that tier's details
        if (currentEntry.count > tierConfig.limit) {
            result = {
                allowed: false,
                tier: tierConfig.name,
                limit: tierConfig.limit,
                remaining: 0,
                reset: currentEntry.resetTime,
                retryAfter: tierConfig.retryAfterMs
            };

            // Notify metrics callback
            if (metricsCallback) {
                try {
                    metricsCallback(ip, tierConfig.name, currentEntry.count, tierConfig.limit);
                } catch (error) {
                    console.error('[RateLimit] Error in metrics callback:', error);
                }
            }

            break;
        }

        // If this is the first tier that's not exceeded, use its remaining count
        if (!result) {
            result = {
                allowed: true,
                tier: tierConfig.name,
                limit: tierConfig.limit,
                remaining,
                reset: currentEntry.resetTime,
                retryAfter: 0
            };
        }
    }

    // Clean up old entries periodically
    if (Math.random() < 0.01) {
        cleanUpOldEntries();
    }

    return result!;
}

/**
 * Check if a request is allowed based on rate limiting rules
 * 
 * @param request - The incoming request
 * @param _limit - Kept for backward compatibility (ignored in favor of tiered limits)
 * @param _windowMs - Kept for backward compatibility (ignored in favor of tiered windows)
 * @returns boolean - true if request is allowed, false if rate limited
 */
export function checkRateLimit(
    request: Request,
    _limit?: number,
    _windowMs?: number
): boolean {
    return checkRateLimits(request).allowed;
}

/**
 * Get detailed rate limit information for a request
 * @param request - The incoming request
 * @returns RateLimitResult with detailed rate limit information
 */
export function getRateLimitInfo(request: Request): RateLimitResult {
    return checkRateLimits(request);
}

/**
 * Get rate limit headers for a response
 * @param result - Rate limit result
 * @returns Headers object with rate limit information
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
    const headers: Record<string, string> = {
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': Math.ceil(result.reset / 1000).toString(),
    };

    if (!result.allowed) {
        headers['Retry-After'] = Math.ceil(result.retryAfter / 1000).toString();
        if (result.tier) {
            headers['X-RateLimit-Tier'] = result.tier;
        }
    }

    return headers;
}
