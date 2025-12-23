import type { ApiContext } from "@lolyjs/core";

export async function GET(ctx: ApiContext) {
  return ctx.Response({
    message: "Post route example",
    postId: ctx.params.id,
    originalUrl: ctx.req.originalUrl,
    reqParams: ctx.req.params,
  }, 200);
}

