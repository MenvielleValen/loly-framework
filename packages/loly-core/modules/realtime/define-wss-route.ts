import type {
  WssRouteDefinition,
  WssEventDefinition,
  AuthFn,
  WssHandler,
} from "./types";

/**
 * Defines a WebSocket route with authentication, hooks, and event handlers.
 * 
 * This is the new, recommended way to define WSS routes. It provides:
 * - Type safety
 * - Built-in validation
 * - Auth hooks
 * - Connection/disconnection hooks
 * - Per-event validation, guards, and rate limiting
 * 
 * @example
 * ```ts
 * import { defineWssRoute } from "@lolyjs/core";
 * import { z } from "zod";
 * 
 * export default defineWssRoute({
 *   auth: async (ctx) => {
 *     const token = ctx.req.headers.authorization;
 *     return await verifyToken(token);
 *   },
 *   onConnect: (ctx) => {
 *     console.log("User connected:", ctx.user?.id);
 *   },
 *   events: {
 *     message: {
 *       schema: z.object({ text: z.string() }),
 *       guard: ({ user }) => !!user,
 *       handler: (ctx) => {
 *         ctx.actions.broadcast("message", ctx.data);
 *       }
 *     }
 *   }
 * });
 * ```
 */
export function defineWssRoute<TUser = any>(
  definition: WssRouteDefinition<TUser>
): WssRouteDefinition<TUser> {
  // Runtime validation in dev mode
  if (process.env.NODE_ENV !== "production") {
    validateRouteDefinition(definition);
  }

  return definition;
}

/**
 * Validates a route definition structure.
 */
function validateRouteDefinition<TUser>(
  definition: WssRouteDefinition<TUser>
): void {
  if (!definition) {
    throw new Error(
      "[loly:realtime] Route definition is required. " +
      "Use defineWssRoute({ events: { ... } })"
    );
  }

  if (!definition.events || typeof definition.events !== "object") {
    throw new Error(
      "[loly:realtime] Route definition must have an 'events' object. " +
      "Example: defineWssRoute({ events: { message: { handler: ... } } })"
    );
  }

  if (Object.keys(definition.events).length === 0) {
    throw new Error(
      "[loly:realtime] Route definition must have at least one event handler"
    );
  }

  // Validate each event
  for (const [eventName, eventDef] of Object.entries(definition.events)) {
    if (typeof eventName !== "string" || eventName.trim() === "") {
      throw new Error(
        "[loly:realtime] Event names must be non-empty strings"
      );
    }

    // Reserved event name
    if (eventName === "__loly:error") {
      throw new Error(
        "[loly:realtime] '__loly:error' is a reserved event name"
      );
    }

    // Validate event definition
    if (typeof eventDef === "function") {
      // Simple handler function - valid
      continue;
    }

    if (typeof eventDef !== "object" || eventDef === null) {
      throw new Error(
        `[loly:realtime] Event '${eventName}' must be a handler function or an object with a 'handler' property`
      );
    }

    if (typeof eventDef.handler !== "function") {
      throw new Error(
        `[loly:realtime] Event '${eventName}' must have a 'handler' function`
      );
    }

    // Validate schema if present
    if (eventDef.schema !== undefined) {
      if (
        typeof eventDef.schema !== "object" ||
        eventDef.schema === null ||
        (typeof eventDef.schema.parse !== "function" &&
          typeof eventDef.schema.safeParse !== "function")
      ) {
        throw new Error(
          `[loly:realtime] Event '${eventName}' schema must be a Zod or Valibot schema ` +
          "(must have 'parse' or 'safeParse' method)"
        );
      }
    }

    // Validate rateLimit if present
    if (eventDef.rateLimit !== undefined) {
      if (
        typeof eventDef.rateLimit !== "object" ||
        eventDef.rateLimit === null ||
        typeof eventDef.rateLimit.eventsPerSecond !== "number" ||
        eventDef.rateLimit.eventsPerSecond <= 0
      ) {
        throw new Error(
          `[loly:realtime] Event '${eventName}' rateLimit must have a positive 'eventsPerSecond' number`
        );
      }
    }

    // Validate guard if present
    if (eventDef.guard !== undefined && typeof eventDef.guard !== "function") {
      throw new Error(
        `[loly:realtime] Event '${eventName}' guard must be a function`
      );
    }
  }

  // Validate hooks
  if (definition.auth !== undefined && typeof definition.auth !== "function") {
    throw new Error(
      "[loly:realtime] 'auth' must be a function"
    );
  }

  if (
    definition.onConnect !== undefined &&
    typeof definition.onConnect !== "function"
  ) {
    throw new Error(
      "[loly:realtime] 'onConnect' must be a function"
    );
  }

  if (
    definition.onDisconnect !== undefined &&
    typeof definition.onDisconnect !== "function"
  ) {
    throw new Error(
      "[loly:realtime] 'onDisconnect' must be a function"
    );
  }
}
