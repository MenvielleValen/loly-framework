import type { RouteMiddleware } from "@loly/core";
import { getRequestLogger } from "@loly/core";

export const requestLogger: RouteMiddleware = async (ctx, next) => {
  const logger = getRequestLogger(ctx.req);
  const startTime = Date.now();

  logger.info("Request started", {
    method: ctx.req.method,
    path: ctx.pathname,
    userAgent: ctx.req.headers["user-agent"],
  });

  await next();

  const duration = Date.now() - startTime;
  logger.info("Request completed", {
    method: ctx.req.method,
    path: ctx.pathname,
    status: ctx.res.statusCode,
    duration: `${duration}ms`,
  });
};

