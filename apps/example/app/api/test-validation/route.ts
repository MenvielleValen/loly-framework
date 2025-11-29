import { z } from "zod";
import { validate, ValidationError } from "@loly/core";
import type { ApiContext } from "@loly/core";

const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().min(0).max(150).optional(),
});

/**
 * Test endpoint for input validation.
 * 
 * Valid request:
 * curl -X POST http://localhost:3000/api/test-validation \
 *      -H "Content-Type: application/json" \
 *      -d '{"name":"John Doe","email":"john@example.com","age":30}'
 * 
 * Invalid request:
 * curl -X POST http://localhost:3000/api/test-validation \
 *      -H "Content-Type: application/json" \
 *      -d '{"name":"John Doe","email":"invalid-email"}'
 */
export async function POST(ctx: ApiContext) {
  try {
    const body = validate(createUserSchema, ctx.req.body);
    return ctx.Response({
      success: true,
      message: "Validation passed",
      data: body,
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

