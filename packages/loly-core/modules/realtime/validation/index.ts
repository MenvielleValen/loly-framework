import type { Schema, WssContext } from "../types";

/**
 * Validates event data against a schema.
 * 
 * @param schema - The validation schema (Zod/Valibot compatible)
 * @param data - The data to validate
 * @returns Validation result with success flag and data/error
 */
export function validateSchema(
  schema: Schema | undefined,
  data: any
): { success: boolean; data?: any; error?: any } {
  if (!schema) {
    return { success: true, data };
  }

  // Try safeParse first (Zod/Valibot style)
  if (typeof schema.safeParse === "function") {
    const result = schema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return { success: false, error: result.error };
    }
  }

  // Fallback to parse (Zod style)
  if (typeof schema.parse === "function") {
    try {
      const parsed = schema.parse(data);
      return { success: true, data: parsed };
    } catch (error) {
      return { success: false, error };
    }
  }

  // Unknown schema type
  return {
    success: false,
    error: new Error("Schema must have 'parse' or 'safeParse' method"),
  };
}
