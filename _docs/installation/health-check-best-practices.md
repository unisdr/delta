# Health Check Best Practices for Node.js Applications

## Executive Summary

This document outlines recommended best practices for implementing health check endpoints in Node.js applications, specifically tailored for the DTS Shared Instance. These recommendations are based on industry standards and research into health check implementations across similar applications.

## 1. Basic Implementation

We recommend implementing a `/health` endpoint that follows these best practices:

```typescript
// app/routes/api+/health.tsx
import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { db } from "~/drizzle/db.server";
import { sql } from "drizzle-orm";

export async function loader({ request }: LoaderFunctionArgs) {
  const startTime = process.hrtime();
  
  try {
    // Basic system information
    const healthData = {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || "unknown",
      
      // System metrics
      memory: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
        unit: "MB"
      },
      
      // Check database connection
      database: "checking"
    };
    
    // Test database connection
    try {
      // Simple query to test connection
      await db.execute(sql`SELECT 1`);
      healthData.database = "connected";
    } catch (error) {
      healthData.database = "disconnected";
      healthData.status = "error";
      return json({ ...healthData, error: "Database connection failed" }, { status: 503 });
    }
    
    // Calculate response time
    const hrtime = process.hrtime(startTime);
    const responseTime = (hrtime[0] * 1000 + hrtime[1] / 1000000).toFixed(2);
    
    return json({
      ...healthData,
      responseTime: `${responseTime}ms`
    });
  } catch (error) {
    return json({
      status: "error",
      timestamp: new Date().toISOString(),
      error: "Health check failed"
    }, { status: 500 });
  }
}
```

## 2. Key Components to Include

### Basic Status Information
- Overall status (ok/error)
- Timestamp
- Application uptime
- Application version

### System Metrics
- Memory usage
- Response time

### Dependency Checks
- Database connectivity
- External service availability (if applicable)

## 3. Response Status Codes

- **200 OK**: Everything is functioning properly
- **503 Service Unavailable**: Critical dependencies (like database) are unavailable
- **500 Internal Server Error**: Unexpected errors during health check

## 4. Security Considerations

For production environments, consider:
- Adding basic authentication for detailed health information
- Creating separate public/private health endpoints
- Limiting information exposed in public endpoints

## 5. Monitoring Integration

The health endpoint can be integrated with:
- Kubernetes liveness/readiness probes
- Cloud provider health checks
- Monitoring tools like Pingdom, New Relic, or Freshping

## 6. Advanced Features (Optional)

For more comprehensive monitoring:
- Add custom checks for specific business logic
- Include tenant-specific health information (for multi-tenant systems)
- Implement different verbosity levels based on request parameters

## Recommendations for DTS

Based on the DTS project architecture (Clean Architecture with Domain-Driven Design):

### Implementation Location
- Create the endpoint at `app/routes/api+/health.tsx` following Remix conventions
- Add database checks in the Data Access Layer

### Integration with Existing Architecture
- Follow the established pattern for API endpoints
- Maintain separation of concerns by delegating database checks to the appropriate models

### Deployment Considerations
- Configure Kubernetes probes to use this endpoint if deploying to Kubernetes
- Set up monitoring alerts based on health check responses

## Implementation Timeline

If approved, we recommend the following implementation timeline:
1. Initial implementation: 1-2 days
2. Testing and integration: 1 day
3. Documentation updates: 0.5 day

## Conclusion

Implementing a health check endpoint will improve the reliability and maintainability of the DTS Shared Instance by providing:
- Early detection of system issues
- Better integration with monitoring tools
- Improved operational visibility

