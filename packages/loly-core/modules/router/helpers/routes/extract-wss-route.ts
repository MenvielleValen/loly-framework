import type {
  WssRouteDefinition,
  WssEventDefinition,
  AuthFn,
  WssHandler,
  GuardFn,
} from "@realtime/types";

/**
 * Normalized internal structure for WSS routes.
 * This is what we use internally after loading and normalizing the route definition.
 */
export interface NormalizedWssRoute {
  namespace: string;
  auth?: AuthFn;
  onConnect?: WssHandler;
  onDisconnect?: (ctx: any, reason?: string) => void | Promise<void>;
  events: Map<
    string,
    {
      schema?: any;
      rateLimit?: { eventsPerSecond: number; burst?: number };
      guard?: GuardFn;
      handler: WssHandler;
    }
  >;
}

/**
 * Extracts and normalizes a WSS route from a module.
 * Supports the new defineWssRoute() format only.
 * 
 * @param mod - The loaded module
 * @param namespace - The namespace path (inferred from folder structure)
 * @returns Normalized route or null if invalid
 */
export function extractDefineWssRoute(
  mod: any,
  namespace: string
): NormalizedWssRoute | null {
  // Check if module exports default (new format)
  if (!mod.default) {
    // Check for legacy format
    if (mod.events && Array.isArray(mod.events)) {
      throw new Error(
        `[loly:realtime] BREAKING CHANGE: 'export const events = []' is no longer supported.\n` +
        `Please use 'export default defineWssRoute({ events: { ... } })' instead.\n` +
        `See migration guide: https://loly.dev/docs/migration\n` +
        `File: ${mod.__filename || "unknown"}`
      );
    }

    // No default export and no legacy format
    return null;
  }

  const routeDef = mod.default as WssRouteDefinition;

  // Validate it's a valid route definition
  if (!routeDef || typeof routeDef !== "object" || !routeDef.events) {
    throw new Error(
      `[loly:realtime] Module must export default from defineWssRoute().\n` +
      `Expected: export default defineWssRoute({ events: { ... } })\n` +
      `File: ${mod.__filename || "unknown"}`
    );
  }

  // Normalize events
  const normalizedEvents = new Map<
    string,
    {
      schema?: any;
      rateLimit?: { eventsPerSecond: number; burst?: number };
      guard?: GuardFn;
      handler: WssHandler;
    }
  >();

  for (const [eventName, eventDef] of Object.entries(routeDef.events)) {
    if (typeof eventDef === "function") {
      // Simple handler function
      normalizedEvents.set(eventName.toLowerCase(), {
        handler: eventDef,
      });
    } else if (eventDef && typeof eventDef === "object" && eventDef.handler) {
      // Object with handler and optional config
      normalizedEvents.set(eventName.toLowerCase(), {
        schema: eventDef.schema,
        rateLimit: eventDef.rateLimit,
        guard: eventDef.guard,
        handler: eventDef.handler,
      });
    } else {
      throw new Error(
        `[loly:realtime] Invalid event definition for '${eventName}'. ` +
        `Event must be a handler function or an object with a 'handler' property.\n` +
        `File: ${mod.__filename || "unknown"}`
      );
    }
  }

  return {
    namespace,
    auth: routeDef.auth,
    onConnect: routeDef.onConnect,
    onDisconnect: routeDef.onDisconnect,
    events: normalizedEvents,
  };
}
