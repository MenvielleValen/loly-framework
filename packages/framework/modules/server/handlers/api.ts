import { Request, Response } from "express";
import { ApiContext, ApiRoute, matchApiRoute } from "@router/index";

export interface HandleApiRequestOptions {
  apiRoutes: ApiRoute[];
  urlPath: string;
  req: Request;
  res: Response;
  env?: "dev" | "prod";
}

/**
 * Maneja una petición a una ruta API.
 * Unifica la lógica entre dev y prod.
 */
export async function handleApiRequest(
  options: HandleApiRequestOptions
): Promise<void> {
  const { apiRoutes, urlPath, req, res, env = "dev" } = options;

  const matched = matchApiRoute(apiRoutes, urlPath);

  if (!matched) {
    res.status(404).json({ error: "Not Found" });
    return;
  }

  const { route, params } = matched;
  const method = req.method.toUpperCase();
  const handler = route.handlers[method];

  if (!handler) {
    res.setHeader("Allow", Object.keys(route.handlers).join(", "));
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const ctx: ApiContext = {
    req,
    res,
    Response: (body: any = {}, status = 200) => res.status(status).json(body),
    NotFound: (body: any = {}) => res.status(404).json(body),
    params,
    pathname: urlPath,
    locals: {},
  };

  try {
    // Globals middlewares
    const globalMws = route.middlewares ?? [];

    // Method middlewares
    const perMethodMws = route.methodMiddlewares?.[method] ?? [];

    const chain = [...globalMws, ...perMethodMws];

    for (const mw of chain) {
      await Promise.resolve(mw(ctx, async () => {}));
      if (res.headersSent) {
        return;
      }
    }

    // Handler final
    await handler(ctx);
  } catch (err) {
    console.error(`[framework][api][${env}] Error en handler:`, err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
}
