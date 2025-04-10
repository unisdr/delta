import { json } from "@remix-run/node";
import { getEffectDetailsHandler, EffectDetailsError } from "~/backend.server/handlers/analytics/effectDetails";
import { sanitizeInput, checkRateLimit } from "~/utils/security";

/**
 * Effect Details API Endpoint
 * 
 * @route GET /api/analytics/effect-details
 * @param {Object} request - The request object
 * @returns {Promise<Response>} JSON response with effect details data
 * 
 * Security measures:
 * - Input sanitization
 * - Rate limiting (100 requests per 15 minutes)
 * - Error handling with appropriate status codes
 * - No sensitive data exposure
 */
export async function loader({ request }: { request: Request }) {
  try {
    // Apply rate limiting
    if (!checkRateLimit(request)) {
      return json(
        {
          success: false,
          error: 'Too many requests from this IP, please try again later',
          code: 'RATE_LIMIT_EXCEEDED'
        },
        {
          status: 429,
          headers: {
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff',
            'Retry-After': '900' // 15 minutes in seconds
          }
        }
      );
    }

    // Parse and sanitize query parameters
    const url = new URL(request.url);
    const params = {
      sectorId: sanitizeInput(url.searchParams.get("sectorId")),
      subSectorId: sanitizeInput(url.searchParams.get("subSectorId")),
      hazardTypeId: sanitizeInput(url.searchParams.get("hazardTypeId")),
      hazardClusterId: sanitizeInput(url.searchParams.get("hazardClusterId")),
      specificHazardId: sanitizeInput(url.searchParams.get("specificHazardId")),
      geographicLevelId: sanitizeInput(url.searchParams.get("geographicLevelId")),
      fromDate: sanitizeInput(url.searchParams.get("fromDate")),
      toDate: sanitizeInput(url.searchParams.get("toDate")),
      disasterEventId: sanitizeInput(url.searchParams.get("disasterEventId")),
    };

    const data = await getEffectDetailsHandler(params);

    return json(data, {
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block'
      }
    });
  } catch (error) {
    console.error('API Error:', error);

    if (error instanceof EffectDetailsError) {
      return json(
        {
          success: false,
          error: error.message,
          code: error.code
        },
        {
          status: error.code === 'INVALID_PARAMS' ? 400 : 500,
          headers: {
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff'
          }
        }
      );
    }

    return json(
      {
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff'
        }
      }
    );
  }
}
