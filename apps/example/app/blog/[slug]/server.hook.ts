import type {
  ServerContext,
  LoaderResult,
  RouteMiddleware,
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
        `${process.env.BASE_URL}/api/blog/${ctx.params.slug}`,
        {
          headers: {
            user: ctx.locals.user?.name || "No context",
          },
        }
      );

      ctx.locals.post = data;
    } catch (error) {
      ctx.locals.post = null;

      console.error(error);
    }

    await next();
  },
];

// Loader estilo getServerSideProps
export async function getServerSideProps(
  ctx: ServerContext
): Promise<LoaderResult> {  // Simula usuario desde SSR
  const user = { id: "1", name: "John Doe", role: "admin" };

  const post =  ctx.locals.post;

  return {
    props: {
      post,
      user,
    },
    metadata: {
      title: `Post ${post?.slug}`,
      description: `Detalle del post ${post?.slug}`,
    },
  };
}
