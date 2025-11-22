import type { ApiContext, ApiMiddleware } from "@loly/core";

export const beforeApi: ApiMiddleware[] = [
  async (ctx, next) => {
    const auth = ctx.req.headers["authorization"];

    if (!auth) {
      ctx.res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // En un caso real, validar token aquí:
    ctx.locals.user = { id: "123", name: "Valentín" };

    await next();
  },
];

export async function GET(ctx: ApiContext) {
  const name = (ctx.req.query.name as string) ?? "mundo";

  ctx.res.status(200).json({
    message: `Hola ${name} desde app/api/hello/route.ts`,
    time: new Date().toISOString(),
  });
}
