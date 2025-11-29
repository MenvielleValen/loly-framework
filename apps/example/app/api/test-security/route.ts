import { z } from "zod";
import { validate, ValidationError } from "@loly/core";
import type { ApiContext } from "@loly/core";

const testSchema = z.object({
  message: z.string().min(1).max(500),
});

// Note: Rate limiting is automatically applied based on route patterns in loly.config.ts
// For this test endpoint, you can manually add rate limiting if needed:
// import { strictRateLimiter } from "@loly/core";
// export const beforeApi: ApiMiddleware[] = [strictRateLimiter];

/**
 * Comprehensive security test endpoint.
 * Tests: Rate limiting + Validation + Sanitization
 * 
 * Usage:
 * # Valid request
 * curl -X POST http://localhost:3000/api/test-security \
 *      -H "Content-Type: application/json" \
 *      -d '{"message":"Hello World"}'
 * 
 * # Invalid request (validation)
 * curl -X POST http://localhost:3000/api/test-security \
 *      -H "Content-Type: application/json" \
 *      -d '{"message":""}'
 * 
 * # Test rate limiting (run 10 times quickly)
 * for i in {1..10}; do
 *   curl -X POST http://localhost:3000/api/test-security \
 *        -H "Content-Type: application/json" \
 *        -d '{"message":"Test"}'
 *   echo ""
 * done
 */
export async function POST(ctx: ApiContext) {
  try {
    const body = validate(testSchema, ctx.req.body);
    return ctx.Response({
      success: true,
      message: "All security checks passed",
      data: {
        params: ctx.params,
        query: ctx.req.query,
        body: body,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return ctx.Response(
        {
          error: "Validation failed",
          details: error.format(),
        },
        400
      );
    }
    throw error;
  }
}

