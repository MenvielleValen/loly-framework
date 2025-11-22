import type { ApiContext, ApiMiddleware } from "@loly/core";

const captureSlug: ApiMiddleware = async (ctx, next) => {
  ctx.locals.slug = ctx.params.id;
  await next();
};

const attachUserForRead: ApiMiddleware = async (ctx, next) => {
  ctx.locals.user = ctx.req.headers["user"];
  await next();
};

const validatePostBody: ApiMiddleware = async (ctx, next) => {
    console.log("body", ctx.req.body);
  if (!ctx.req.body || typeof ctx.req.body !== "object") {
    ctx.res.status(402).json({ error: "Invalid body" });
    return;
  }
  await next();
};

// ✅ Aplica a TODOS los métodos de esta ruta
export const beforeApi: ApiMiddleware[] = [captureSlug];

// ✅ Aplica SOLO a GET
export const beforeGET: ApiMiddleware[] = [attachUserForRead];

// ✅ Aplica SOLO a POST
export const beforePOST: ApiMiddleware[] = [validatePostBody];

export async function GET(ctx: ApiContext) {
  const name = (ctx.locals.user as string) ?? "mundo";
  const slug = ctx.locals.slug;

  ctx.res.status(200).json({
    slug,
    title: `Post: ${slug}`,
    content: `Contenido SSR para el post "${slug}"`,
    viewedBy: name ?? "anónimo",
  });
}

export async function POST(ctx: ApiContext) {
  const slug = ctx.locals.slug;
  const body = ctx.req.body;

  ctx.res.status(201).json({
    slug,
    created: true,
    body,
  });
}
