import type { ApiContext } from "@lolyjs/core";

export async function GET(ctx: ApiContext) {
  return ctx.Response({
    message: "Catch-all route example",
    path: ctx.params.path,
    originalUrl: ctx.req.originalUrl,
    reqParams: ctx.req.params,
    query: ctx.req.query,
  }, 200);
}

