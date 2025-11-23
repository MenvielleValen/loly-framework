import type { ApiContext, ApiMiddleware } from "@loly/core";
import { BlogModel } from "config/db/schemas/blog.schema";
import {
  attachUserForRead,
  captureSlug,
  validatePostBody,
} from "middlewares/captureSlug";

// ✅ Aplica a TODOS los métodos de esta ruta
export const beforeApi: ApiMiddleware[] = [captureSlug];


// ✅ Aplica SOLO a GET
export const beforeGET: ApiMiddleware[] = [attachUserForRead];

export async function GET(ctx: ApiContext) {
  const name = (ctx.locals.user as string) ?? "mundo";
  const slug = ctx.locals.slug;

  const blog = await BlogModel.findOne({ slug });

  if(!blog){
    return ctx.res.status(404).json({})
  }

  return ctx.res.status(200).json(blog);
}


// ✅ Aplica SOLO a POST
export const beforePOST: ApiMiddleware[] = [validatePostBody];

export async function POST(ctx: ApiContext) {
  const slug = ctx.locals.slug;
  const body = ctx.req.body;

  const newBlog = new BlogModel({
    slug,
    title: `Post: ${slug}`,
    content: `Contenido SSR para el post "${slug}"`,
    viewedBy: "anónimo",
  })

  const saved = await newBlog.save();

  return ctx.res.status(201).json({saved});
}