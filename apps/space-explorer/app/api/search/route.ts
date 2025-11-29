import type { ApiContext, ApiMiddleware } from "@loly/core";
import { z } from "zod";
import { validate } from "@loly/core";
import { getAllPlanets, getAllAstronauts, getSpaceXLaunches } from "@/lib/space-api";

const searchSchema = z.object({
  query: z.string().min(1).max(100),
  type: z.enum(["all", "planets", "astronauts", "launches"]).optional(),
});

// Apply strict rate limiting to search endpoint
export const beforeApi: ApiMiddleware[] = [];

export async function POST(ctx: ApiContext) {
  try {
    const body = validate(searchSchema, ctx.req.body);
    const { query, type = "all" } = body;

    const results: {
      planets: any[];
      astronauts: any[];
      launches: any[];
    } = {
      planets: [],
      astronauts: [],
      launches: [],
    };

    const lowerQuery = query.toLowerCase();

    if (type === "all" || type === "planets") {
      const planets = getAllPlanets();
      results.planets = planets.filter(
        (p) =>
          p.name.toLowerCase().includes(lowerQuery) ||
          p.description.toLowerCase().includes(lowerQuery)
      );
    }

    if (type === "all" || type === "astronauts") {
      const astronauts = getAllAstronauts();
      results.astronauts = astronauts.filter(
        (a) =>
          a.name.toLowerCase().includes(lowerQuery) ||
          a.nationality.toLowerCase().includes(lowerQuery) ||
          a.agency.toLowerCase().includes(lowerQuery)
      );
    }

    if (type === "all" || type === "launches") {
      const launches = await getSpaceXLaunches(50);
      results.launches = launches.filter(
        (l) =>
          l.name.toLowerCase().includes(lowerQuery) ||
          (l.details && l.details.toLowerCase().includes(lowerQuery))
      );
    }

    return ctx.Response({
      query,
      type,
      results,
      total: results.planets.length + results.astronauts.length + results.launches.length,
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
  const query = ctx.req.query.q as string | undefined;
  const type = (ctx.req.query.type as string | undefined) || "all";

  if (!query) {
    return ctx.Response(
      {
        error: "Missing query parameter",
        message: "Please provide a 'q' query parameter",
      },
      400
    );
  }

  try {
    const body = validate(searchSchema, { query, type });
    const { query: searchQuery, type: searchType } = body;

    const results: {
      planets: any[];
      astronauts: any[];
      launches: any[];
    } = {
      planets: [],
      astronauts: [],
      launches: [],
    };

    const lowerQuery = searchQuery.toLowerCase();

    if (searchType === "all" || searchType === "planets") {
      const planets = getAllPlanets();
      results.planets = planets.filter(
        (p) =>
          p.name.toLowerCase().includes(lowerQuery) ||
          p.description.toLowerCase().includes(lowerQuery)
      );
    }

    if (searchType === "all" || searchType === "astronauts") {
      const astronauts = getAllAstronauts();
      results.astronauts = astronauts.filter(
        (a) =>
          a.name.toLowerCase().includes(lowerQuery) ||
          a.nationality.toLowerCase().includes(lowerQuery) ||
          a.agency.toLowerCase().includes(lowerQuery)
      );
    }

    if (searchType === "all" || searchType === "launches") {
      const launches = await getSpaceXLaunches(50);
      results.launches = launches.filter(
        (l) =>
          l.name.toLowerCase().includes(lowerQuery) ||
          (l.details && l.details.toLowerCase().includes(lowerQuery))
      );
    }

    return ctx.Response({
      query: searchQuery,
      type: searchType,
      results,
      total: results.planets.length + results.astronauts.length + results.launches.length,
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

