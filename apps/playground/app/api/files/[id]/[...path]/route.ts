import type { ApiContext } from "@lolyjs/core";

export async function GET(ctx: ApiContext) {
  return ctx.Response({
    message: "File path route",
    fileId: ctx.params.id,
    filePath: ctx.params.path,
    originalUrl: ctx.req.originalUrl,
    reqParams: ctx.req.params,
  }, 200);
}

