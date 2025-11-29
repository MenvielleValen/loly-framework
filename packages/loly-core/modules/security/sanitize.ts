/**
 * Security utilities for input sanitization.
 */

/**
 * Sanitizes a string by removing potentially dangerous characters.
 * Basic sanitization - for production, consider using a library like DOMPurify.
 * 
 * @param input - String to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  if (typeof input !== "string") {
    return String(input);
  }

  // Remove null bytes
  let sanitized = input.replace(/\0/g, "");

  // Remove control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "");

  return sanitized;
}

/**
 * Sanitizes an object by recursively sanitizing all string values.
 * 
 * @param obj - Object to sanitize
 * @returns Sanitized object
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== "object") {
    return typeof obj === "string" ? (sanitizeString(obj) as any) : obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item)) as any;
  }

  const sanitized: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (typeof value === "string") {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === "object" && value !== null) {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
  }

  return sanitized;
}

/**
 * Sanitizes route parameters.
 * 
 * @param params - Route parameters object
 * @returns Sanitized parameters
 */
export function sanitizeParams<T extends Record<string, string | string[]>>(
  params: T
): T {
  const sanitized: any = {};
  for (const key in params) {
    if (Object.prototype.hasOwnProperty.call(params, key)) {
      const value = params[key];
      if (Array.isArray(value)) {
        sanitized[key] = value.map((v) => sanitizeString(String(v)));
      } else {
        sanitized[key] = sanitizeString(String(value));
      }
    }
  }
  return sanitized;
}

/**
 * Sanitizes query parameters.
 * 
 * @param query - Query parameters object
 * @returns Sanitized query parameters
 */
export function sanitizeQuery<T extends Record<string, any>>(query: T): T {
  return sanitizeObject(query);
}

