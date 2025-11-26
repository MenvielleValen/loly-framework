import type { ApiContext, ApiMiddleware } from "@loly/core";
import { getLivePulse } from "@/lib/site-data";

export const beforeApi: ApiMiddleware[] = [
  async (ctx, next) => {
    ctx.locals.startedAt = Date.now();
    await next();
  },
];

export async function GET(ctx: ApiContext) {
  const metrics = await getLivePulse();
  const processing = Date.now() - (ctx.locals.startedAt ?? Date.now());

  ctx.res.status(200).json({
    ...metrics,
    processingMs: processing,
    generatedAt: new Date().toISOString(),
  });
}

