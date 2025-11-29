import { z, ZodSchema, ZodError } from "zod";

/**
 * Validation error with detailed information.
 */
export class ValidationError extends Error {
  constructor(
    public errors: z.ZodIssue[],
    message = "Validation failed"
  ) {
    super(message);
    this.name = "ValidationError";
  }

  /**
   * Formats validation errors into a user-friendly format.
   */
  format(): Record<string, string[]> {
    const formatted: Record<string, string[]> = {};
    for (const error of this.errors) {
      const path = error.path.join(".");
      if (!formatted[path]) {
        formatted[path] = [];
      }
      formatted[path].push(error.message);
    }
    return formatted;
  }
}

/**
 * Validates data against a Zod schema.
 * 
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validated data
 * @throws ValidationError if validation fails
 */
export function validate<T>(
  schema: ZodSchema<T>,
  data: unknown
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError(error.errors);
    }
    throw error;
  }
}

/**
 * Safely validates data and returns a result object.
 * 
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Result object with success flag and data/error
 */
export function safeValidate<T>(
  schema: ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: ValidationError } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        error: new ValidationError(error.errors),
      };
    }
    throw error;
  }
}

/**
 * Common validation schemas for reuse.
 */
export const commonSchemas = {
  /**
   * Validates a string parameter (e.g., route params).
   */
  stringParam: z.string().min(1).max(255),

  /**
   * Validates an optional string parameter.
   */
  optionalStringParam: z.string().max(255).optional(),

  /**
   * Validates a numeric ID parameter.
   */
  idParam: z.string().regex(/^\d+$/, "ID must be numeric").transform(Number),

  /**
   * Validates a UUID parameter.
   */
  uuidParam: z.string().uuid("Invalid UUID format"),

  /**
   * Validates pagination parameters.
   */
  pagination: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).default("1"),
    limit: z.string().regex(/^\d+$/).transform(Number).default("10"),
  }),

  /**
   * Validates a search query parameter.
   */
  searchQuery: z.string().min(1).max(100).optional(),
};

