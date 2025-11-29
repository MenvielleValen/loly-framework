import type { ApiContext, ApiMiddleware } from "@loly/core";
import { z } from "zod";
import { validate } from "@loly/core";
import { strictRateLimiter } from "@loly/core";

const favoriteSchema = z.object({
  type: z.enum(["planet", "launch", "astronaut"]),
  id: z.string().min(1),
});

// In-memory storage (in production, use a database)
const favorites: Map<string, Set<string>> = new Map();

// Apply strict rate limiting
export const beforeApi: ApiMiddleware[] = [strictRateLimiter];

export async function POST(ctx: ApiContext) {
  try {
    const body = validate(favoriteSchema, ctx.req.body);
    const { type, id } = body;

    // Get user ID from headers (simulated - in production use auth)
    const userId = ctx.req.headers["x-user-id"] || "anonymous";

    if (!favorites.has(userId as string)) {
      favorites.set(userId as string, new Set());
    }

    const userFavorites = favorites.get(userId as string)!;
    const favoriteKey = `${type}:${id}`;
    userFavorites.add(favoriteKey);

    return ctx.Response(
      {
        success: true,
        message: "Added to favorites",
        favorite: { type, id },
      },
      201
    );
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

export async function DELETE(ctx: ApiContext) {
  try {
    const body = validate(favoriteSchema, ctx.req.body);
    const { type, id } = body;

    const userId = ctx.req.headers["x-user-id"] || "anonymous";
    const userFavorites = favorites.get(userId as string);

    if (!userFavorites) {
      return ctx.Response(
        {
          error: "No favorites found",
        },
        404
      );
    }

    const favoriteKey = `${type}:${id}`;
    userFavorites.delete(favoriteKey);

    return ctx.Response({
      success: true,
      message: "Removed from favorites",
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

export async function GET(ctx: ApiContext) {
  const userId = ctx.req.headers["x-user-id"] || "anonymous";
  const userFavorites = favorites.get(userId as string) || new Set();

  const favoritesList = Array.from(userFavorites).map((fav) => {
    const [type, id] = fav.split(":");
    return { type, id };
  });

  return ctx.Response({
    favorites: favoritesList,
    count: favoritesList.length,
  });
}

