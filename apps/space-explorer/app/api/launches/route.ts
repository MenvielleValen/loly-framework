import type { ApiContext } from "@lolyjs/core";
import { z } from "zod";
import { validate } from "@lolyjs/core";
import { getSpaceXLaunches } from "@/lib/space-api";

const launchesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  upcoming: z.coerce.boolean().optional(),
});

export async function GET(ctx: ApiContext) {
  try {
    const query = validate(launchesQuerySchema, ctx.req.query);
    const { limit, upcoming } = query;

    const launches = await getSpaceXLaunches(limit);

    const filtered = upcoming !== undefined
      ? launches.filter((l) => l.upcoming === upcoming)
      : launches;

    return ctx.Response({
      launches: filtered,
      count: filtered.length,
      total: launches.length,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ValidationError") {
      return ctx.Response(
        {
          error: "Validation failed",
          message: error.message,
        },
        400
      );
    }
    throw error;
  }
}

