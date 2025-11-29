import type { ApiContext } from "@loly/core";

/**
 * Test endpoint to verify input sanitization.
 * 
 * Usage:
 * curl "http://localhost:3000/api/test-sanitize?test=<script>alert('xss')</script>&normal=value"
 */
export async function GET(ctx: ApiContext) {
  return ctx.Response({
    message: "Sanitization test",
    params: ctx.params,
    query: ctx.req.query,
    note: "Check that dangerous characters in params/query are sanitized",
  });
}

