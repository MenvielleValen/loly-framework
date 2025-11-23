import type { ApiContext } from "@loly/core";

export async function GET(ctx: ApiContext) {
  const pathParam = ctx.params.path;
  const segments = pathParam.split("/");

  ctx.Response({
    path: pathParam,
    segments,
  });
}
