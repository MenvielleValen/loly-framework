import type { Request } from "express";

/**
 * Rewrite condition types.
 * Used in the `has` array to conditionally apply rewrites.
 */
export type RewriteConditionType = "host" | "header" | "cookie" | "query";

/**
 * Rewrite condition.
 * Defines when a rewrite should be applied.
 */
export interface RewriteCondition {
  type: RewriteConditionType;
  key?: string; // For header, cookie, query
  value: string; // Pattern to match (can include :param for dynamic values)
}

/**
 * Rewrite destination can be:
 * - A string (static or with :param placeholders)
 * - An async function that returns a string (for dynamic rewrites)
 */
export type RewriteDestination =
  | string
  | ((params: Record<string, string>, req: Request) => Promise<string> | string);

/**
 * Rewrite rule configuration.
 * Defines how to rewrite a URL pattern.
 */
export interface RewriteRule {
  source: string; // Pattern to match (e.g., "/:path*", "/tenant/:tenant*")
  destination: RewriteDestination; // Where to rewrite to
  has?: RewriteCondition[]; // Optional conditions (all must match)
}

/**
 * Compiled rewrite rule with pre-compiled regex for performance.
 * This is the internal representation used for processing.
 */
export interface CompiledRewriteRule {
  source: string;
  sourceRegex: RegExp;
  sourceParamNames: string[];
  destination: RewriteDestination;
  has?: RewriteCondition[];
  // Pre-compiled regex for host patterns (if has conditions include host)
  hostRegex?: RegExp;
  hostParamNames?: string[];
}

/**
 * Rewrite configuration.
 * Array of rewrite rules to apply in order.
 */
export type RewriteConfig = RewriteRule[];

/**
 * Result of processing a rewrite.
 */
export interface RewriteResult {
  rewrittenPath: string;
  extractedParams: Record<string, string>;
}

/**
 * Parses a rewrite pattern and extracts parameter names.
 * Similar to buildRegexFromRoutePath but for rewrite patterns.
 * 
 * @param pattern - Pattern to parse (e.g., "/:path*", "/tenant/:tenant*")
 * @returns Object with regex and parameter names
 * 
 * @example
 * parseRewritePattern("/:path*")
 * // { regex: /^\/?(.+)\/?$/, paramNames: ['path'] }
 * 
 * parseRewritePattern("/tenant/:tenant*")
 * // { regex: /^\/tenant\/(.+)\/?$/, paramNames: ['tenant'] }
 */
export function parseRewritePattern(pattern: string): {
  regex: RegExp;
  paramNames: string[];
} {
  // Remove leading/trailing slashes and normalize
  const cleanPattern = pattern.replace(/^\/+|\/+$/g, "") || "";
  
  if (!cleanPattern) {
    // Root pattern
    return {
      regex: /^\/?$/,
      paramNames: [],
    };
  }

  const segments = cleanPattern.split("/").filter(Boolean);
  const paramNames: string[] = [];
  const regexParts: string[] = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];

    // Catch-all: *
    if (seg === "*") {
      if (i !== segments.length - 1) {
        throw new Error(
          `Catch-all "*" in "${pattern}" must be the last segment.`
        );
      }
      regexParts.push("(.+)");
      continue;
    }

    // Named catch-all: :param*
    if (seg.endsWith("*") && seg.startsWith(":")) {
      const paramName = seg.slice(1, -1); // Remove : and *
      if (i !== segments.length - 1) {
        throw new Error(
          `Catch-all segment "${seg}" in "${pattern}" must be the last segment.`
        );
      }
      paramNames.push(paramName);
      regexParts.push("(.+)");
      continue;
    }

    // Named parameter: :param
    if (seg.startsWith(":") && seg.length > 1) {
      const paramName = seg.slice(1);
      paramNames.push(paramName);
      regexParts.push("([^/]+)");
      continue;
    }

    // Static segment - escape special regex characters
    const escaped = seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    regexParts.push(escaped);
  }

  const regexSource = "^/?" + regexParts.join("/") + "/?$";
  const regex = new RegExp(regexSource);

  return { regex, paramNames };
}

/**
 * Extracts parameters from a host pattern.
 * 
 * @param hostPattern - Host pattern (e.g., ":tenant.example.com")
 * @param actualHost - Actual host from request (e.g., "tenant1.example.com")
 * @returns Extracted parameters or null if no match
 * 
 * @example
 * extractHostParams(":tenant.example.com", "tenant1.example.com")
 * // { tenant: "tenant1" }
 */
export function extractHostParams(
  hostPattern: string,
  actualHost: string
): Record<string, string> | null {
  // Convert pattern to regex
  // :tenant.example.com -> ^([^.]+)\.example\.com$
  const regexPattern = hostPattern
    .replace(/:([^.]+)/g, "([^.]+)") // Replace :param with capture group
    .replace(/\./g, "\\.") // Escape dots
    .replace(/\*/g, ".*"); // Replace * with .*

  const regex = new RegExp(`^${regexPattern}$`);
  const match = regex.exec(actualHost);

  if (!match) return null;

  // Extract parameter names from pattern
  const paramNames: string[] = [];
  const paramPattern = /:([^.]+)/g;
  let paramMatch;
  while ((paramMatch = paramPattern.exec(hostPattern)) !== null) {
    paramNames.push(paramMatch[1]);
  }

  // Build params object
  const params: Record<string, string> = {};
  paramNames.forEach((name, idx) => {
    params[name] = match[idx + 1] || "";
  });

  return params;
}

/**
 * Evaluates rewrite conditions against a request.
 * All conditions must match for the rewrite to apply.
 * 
 * @param conditions - Array of conditions to evaluate
 * @param req - Express request object
 * @returns Object with match result and extracted parameters
 */
export function evaluateRewriteConditions(
  conditions: RewriteCondition[],
  req: Request
): { matches: boolean; params: Record<string, string> } {
  const extractedParams: Record<string, string> = {};

  for (const condition of conditions) {
    switch (condition.type) {
      case "host": {
        // Get host without port (req.get("host") includes port, req.hostname doesn't)
        // Try multiple sources to get the host
        const hostWithPort = req.get("host") || req.hostname || req.get("x-forwarded-host")?.split(",")[0] || "";
        // Remove port if present (e.g., "tenant1.localhost:3000" -> "tenant1.localhost")
        const host = hostWithPort.split(":")[0];
        
        // Debug logging for host matching
        if (process.env.NODE_ENV === "development") {
          console.log("[rewrites] Host matching:", {
            pattern: condition.value,
            actualHost: host,
            hostWithPort,
            reqHost: req.get("host"),
            reqHostname: req.hostname,
          });
        }
        
        const hostParams = extractHostParams(condition.value, host);
        if (!hostParams) {
          if (process.env.NODE_ENV === "development") {
            console.log("[rewrites] Host params extraction failed:", {
              pattern: condition.value,
              actualHost: host,
            });
          }
          return { matches: false, params: {} };
        }
        Object.assign(extractedParams, hostParams);
        break;
      }

      case "header": {
        if (!condition.key) {
          return { matches: false, params: {} };
        }
        const headerValue = req.get(condition.key.toLowerCase());
        if (!headerValue || headerValue !== condition.value) {
          return { matches: false, params: {} };
        }
        break;
      }

      case "cookie": {
        if (!condition.key) {
          return { matches: false, params: {} };
        }
        const cookieValue = req.cookies?.[condition.key];
        if (!cookieValue || cookieValue !== condition.value) {
          return { matches: false, params: {} };
        }
        break;
      }

      case "query": {
        if (!condition.key) {
          return { matches: false, params: {} };
        }
        const queryValue = req.query[condition.key];
        if (!queryValue || String(queryValue) !== condition.value) {
          return { matches: false, params: {} };
        }
        break;
      }

      default:
        return { matches: false, params: {} };
    }
  }

  return { matches: true, params: extractedParams };
}

/**
 * Replaces parameters in a destination pattern.
 * 
 * @param destination - Destination pattern (e.g., "/project/:tenant/:path*")
 * @param params - Parameters to replace (e.g., { tenant: "tenant1", path: "dashboard" })
 * @returns Resolved destination path
 * 
 * @example
 * replaceDestinationParams("/project/:tenant/:path*", { tenant: "tenant1", path: "dashboard" })
 * // "/project/tenant1/dashboard"
 */
export function replaceDestinationParams(
  destination: string,
  params: Record<string, string>
): string {
  let result = destination;

  // Replace named parameters
  for (const [key, value] of Object.entries(params)) {
    // Replace :param and :param* patterns
    const pattern = new RegExp(`:${key}(?:\\*)?`, "g");
    result = result.replace(pattern, value);
  }

  return result;
}

/**
 * Processes rewrites for a given URL path.
 * Applies rewrites in order and returns the first match.
 * 
 * @param urlPath - URL path to process (e.g., "/dashboard")
 * @param compiledRewrites - Array of compiled rewrite rules
 * @param req - Express request object
 * @returns Rewrite result or null if no match
 */
export async function processRewrites(
  urlPath: string,
  compiledRewrites: CompiledRewriteRule[],
  req: Request
): Promise<RewriteResult | null> {
  // Normalize path (remove trailing slash for matching)
  const normalizedPath = urlPath.replace(/\/$/, "") || "/";

  // Skip rewrites for system routes that should never be rewritten
  // Note: API routes (/api/*) CAN be rewritten (like Next.js)
  // WSS routes (/wss/*) should NOT be rewritten (WebSocket handled separately)
  if (
    normalizedPath.startsWith("/static/") || // Static assets (client.js, client.css, etc.)
    normalizedPath.startsWith("/__fw/") || // Framework internal routes (hot reload, etc.)
    normalizedPath === "/favicon.ico" || // Favicon
    normalizedPath.startsWith("/wss/") // WebSocket routes - handled separately by Socket.IO
  ) {
    if (process.env.NODE_ENV === "development") {
      console.log("[rewrites] Skipping rewrite for system route:", normalizedPath);
    }
    return null;
  }

  // Debug logging
  if (process.env.NODE_ENV === "development") {
    console.log("[rewrites] Processing rewrites:", {
      urlPath,
      normalizedPath,
      host: req.get("host"),
      hostname: req.hostname,
      compiledRewritesCount: compiledRewrites.length,
    });
  }

  for (const rewrite of compiledRewrites) {
    // Check conditions first (early exit for performance)
    let conditionParams: Record<string, string> = {};
    if (rewrite.has && rewrite.has.length > 0) {
      const conditionResult = evaluateRewriteConditions(rewrite.has, req);
      if (!conditionResult.matches) {
        if (process.env.NODE_ENV === "development") {
          console.log("[rewrites] Condition not matched:", {
            source: rewrite.source,
            conditions: rewrite.has,
          });
        }
        continue; // Skip this rewrite if conditions don't match
      }
      conditionParams = conditionResult.params;
      if (process.env.NODE_ENV === "development") {
        console.log("[rewrites] Condition matched:", {
          source: rewrite.source,
          conditionParams,
        });
      }
    }

    // Match source pattern
    const sourceMatch = rewrite.sourceRegex.exec(normalizedPath);
    if (!sourceMatch) {
      if (process.env.NODE_ENV === "development") {
        console.log("[rewrites] Source pattern not matched:", {
          source: rewrite.source,
          normalizedPath,
          sourceRegex: rewrite.sourceRegex.toString(),
        });
      }
      continue; // Skip if source doesn't match
    }
    
    if (process.env.NODE_ENV === "development") {
      console.log("[rewrites] Source pattern matched:", {
        source: rewrite.source,
        normalizedPath,
        match: sourceMatch[0],
      });
    }

    // Extract parameters from source
    const sourceParams: Record<string, string> = {};
    rewrite.sourceParamNames.forEach((name, idx) => {
      sourceParams[name] = decodeURIComponent(sourceMatch[idx + 1] || "");
    });

    // Merge all parameters (source + conditions)
    const allParams = { ...sourceParams, ...conditionParams };

    // Resolve destination
    let destination: string;
    if (typeof rewrite.destination === "function") {
      // Async function - execute it
      destination = await rewrite.destination(allParams, req);
    } else {
      // Static string - replace parameters
      destination = replaceDestinationParams(rewrite.destination, allParams);
    }

    // Normalize the destination path (ensure it starts with / and doesn't have double slashes)
    const normalizedDestination = destination
      .replace(/\/+/g, "/") // Replace multiple slashes with single slash
      .replace(/^([^/])/, "/$1") // Ensure it starts with /
      .replace(/\/$/, "") || "/"; // Remove trailing slash, but keep "/" for root

    if (process.env.NODE_ENV === "development") {
      console.log("[rewrites] Rewrite successful:", {
        originalPath: urlPath,
        rewrittenPath: normalizedDestination,
        allParams,
      });
    }

    return {
      rewrittenPath: normalizedDestination,
      extractedParams: allParams,
    };
  }

  return null; // No rewrite matched
}

/**
 * Validates rewrite rules to prevent infinite loops and conflicts.
 * 
 * @param rules - Array of rewrite rules to validate
 * @throws Error if validation fails
 */
export function validateRewrites(rules: RewriteRule[]): void {
  // Check for potential infinite loops
  // A simple check: if source and destination are the same, it could cause issues
  for (const rule of rules) {
    if (typeof rule.destination === "string") {
      // Basic check: if source matches destination pattern exactly, warn
      // This is a simple heuristic - more complex loops would need deeper analysis
      if (rule.source === rule.destination) {
        console.warn(
          `[framework][rewrites] Rewrite rule has identical source and destination: "${rule.source}". This may cause issues.`
        );
      }
    }
  }

  // Check for duplicate sources (not necessarily an error, but worth noting)
  const sources = new Set<string>();
  for (const rule of rules) {
    if (sources.has(rule.source)) {
      console.warn(
        `[framework][rewrites] Duplicate rewrite source pattern: "${rule.source}". Only the first match will be used.`
      );
    }
    sources.add(rule.source);
  }
}

/**
 * Compiles rewrite rules for performance.
 * Pre-compiles regex patterns to avoid re-compiling on each request.
 * 
 * @param rules - Array of rewrite rules to compile
 * @returns Array of compiled rewrite rules
 */
export function compileRewriteRules(rules: RewriteRule[]): CompiledRewriteRule[] {
  // Validate rewrites before compiling
  validateRewrites(rules);

  return rules.map((rule) => {
    const { regex, paramNames } = parseRewritePattern(rule.source);

    // Pre-compile host regex if has conditions include host
    let hostRegex: RegExp | undefined;
    let hostParamNames: string[] | undefined;

    if (rule.has) {
      const hostCondition = rule.has.find((c) => c.type === "host");
      if (hostCondition) {
        const hostPattern = hostCondition.value;
        // Convert host pattern to regex for matching
        const hostRegexPattern = hostPattern
          .replace(/:([^.]+)/g, "([^.]+)")
          .replace(/\./g, "\\.")
          .replace(/\*/g, ".*");
        hostRegex = new RegExp(`^${hostRegexPattern}$`);

        // Extract host parameter names
        hostParamNames = [];
        const paramPattern = /:([^.]+)/g;
        let paramMatch;
        while ((paramMatch = paramPattern.exec(hostPattern)) !== null) {
          hostParamNames.push(paramMatch[1]);
        }
      }
    }

    return {
      source: rule.source,
      sourceRegex: regex,
      sourceParamNames: paramNames,
      destination: rule.destination,
      has: rule.has,
      hostRegex,
      hostParamNames,
    };
  });
}

