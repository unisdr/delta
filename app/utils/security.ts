/**
 * Security utility functions for input sanitization and validation
 */

/**
 * Sanitizes input strings to prevent XSS and SQL injection
 * @param input - The input string to sanitize
 * @returns The sanitized string or null if input is null
 */
export function sanitizeInput(input: string | null): string | null {
    if (input === null) return null;
    
    // Remove any HTML tags
    input = input.replace(/<[^>]*>/g, '');
    
    // Remove SQL injection patterns
    input = input.replace(/['";]/g, '');
    
    // Trim whitespace
    input = input.trim();
    
    return input;
}

/**
 * Rate limiting middleware using the native Request object
 * Since we're not using Express directly, we'll implement a simple in-memory rate limiter
 */
const ipRequests = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(request: Request, limit: number = 100, windowMs: number = 15 * 60 * 1000): boolean {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    
    const userRequests = ipRequests.get(ip) || { count: 0, resetTime: now + windowMs };
    
    // Reset if window has expired
    if (now > userRequests.resetTime) {
        userRequests.count = 1;
        userRequests.resetTime = now + windowMs;
    } else {
        userRequests.count++;
    }
    
    ipRequests.set(ip, userRequests);
    
    // Clean up old entries periodically
    if (Math.random() < 0.01) { // 1% chance to clean up on each request
        for (const [key, value] of ipRequests.entries()) {
            if (now > value.resetTime) {
                ipRequests.delete(key);
            }
        }
    }
    
    return userRequests.count <= limit;
}
