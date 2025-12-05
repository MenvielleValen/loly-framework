import type { ApiContext } from "@lolyjs/core";
import { getSpaceXLaunch } from "@/lib/space-api";

export async function GET(ctx: ApiContext) {
  const { id } = ctx.params;
  const launch = await getSpaceXLaunch(id as string);

  if (!launch) {
    return ctx.Response(
      {
        error: "Launch not found",
      },
      404
    );
  }

  return ctx.Response({
    launch,
  });
}

