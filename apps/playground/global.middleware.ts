import type { GlobalMiddleware } from "@lolyjs/core";

// Mock session storage (in production, this would come from cookies/database)
const mockUsers = new Map<string, { id: string; name: string }>();

// Setup mock users (this runs when the module is loaded)
mockUsers.set("user-123", { id: "user-123", name: "Test User" });
mockUsers.set("user-456", { id: "user-456", name: "Admin User" });

/**
 * Global middleware that establishes user session context.
 * This runs on EVERY request (both SSR and SPA navigation) before route processing.
 * It only establishes context (ctx.locals), it does NOT make routing decisions.
 */
export const globalMiddlewares: GlobalMiddleware[] = [
  async (ctx, next) => {
    // Only bootstrap: read cookie, establish context
    const sessionCookie = ctx.req.cookies?.session;

    if (sessionCookie && mockUsers.has(sessionCookie)) {
      ctx.locals.user = mockUsers.get(sessionCookie);
      ctx.locals.session = { id: sessionCookie };
    } else {
      ctx.locals.user = null;
      ctx.locals.session = null;
    }

    await next();
  },
];

