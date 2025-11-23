import type {
  ServerContext,
  LoaderResult,
  RouteMiddleware,
  MetadataLoader,
} from "@loly/core";
import axios from "axios";

// Middleware de ejemplo: simula un usuario logueado
export const beforeServerData: RouteMiddleware[] = [
  async (ctx, next) => {
    // En un caso real, podrías leer cookies, headers, etc.
    ctx.locals.user = {
      id: "123",
      name: "Valentín",
      role: "admin",
    };

    await next();
  },
  async (ctx, next) => {
    try {
      const { data } = await axios.get(
        `http://localhost:3000/api/blog/${ctx.params.slug}`,
        {
          headers: {
            user: ctx.locals.user?.name || "No context",
          },
        }
      );

      console.log(data);

      ctx.locals.post = data;
    } catch (error) {
      ctx.locals.post = null;
    }

    await next();
  },
];

// Loader estilo getServerSideProps
export async function getServerSideProps(
  ctx: ServerContext
): Promise<LoaderResult> {
  const user = ctx.locals.user;
  const post = ctx.locals.post;

  return {
    props: {
      post,
      user,
    },
  };
}

export const getMetadata: MetadataLoader = async (ctx) => {
  const slug = ctx.params.slug;
  return {
    title: `Post ${slug} – My Framework Dev`,
    description: `Detalle del post "${slug}"`,
  };
};
