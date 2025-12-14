import type { GuardFn, WssContext } from "../types";

/**
 * Executes a guard function to check if an event should be allowed.
 * 
 * @param guardFn - The guard function
 * @param ctx - The WSS context
 * @returns true if allowed, false if blocked
 */
export async function executeGuard(
  guardFn: GuardFn | undefined,
  ctx: WssContext
): Promise<boolean> {
  if (!guardFn) {
    return true; // No guard = allow
  }

  const guardCtx = {
    user: ctx.user,
    req: ctx.req,
    socket: ctx.socket,
    namespace: ctx.pathname,
  };

  const result = await guardFn(guardCtx);
  return result === true;
}
