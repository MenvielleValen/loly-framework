import type { ApiMiddleware } from "@loly/core";

export const captureSlug: ApiMiddleware = async (ctx, next) => {
  ctx.locals.slug = ctx.params.id;
  await next();
};

export const attachUserForRead: ApiMiddleware = async (ctx, next) => {
  ctx.locals.user = ctx.req.headers["user"];
  await next();
};

export const validatePostBody: ApiMiddleware = async (ctx, next) => {
  if (!ctx.req.body || typeof ctx.req.body !== "object") {
    ctx.res.status(402).json({ error: "Invalid body" });
    return;
  }
  await next();
};
