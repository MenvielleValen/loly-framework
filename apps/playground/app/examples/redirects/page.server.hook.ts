import type { ServerLoader } from "@lolyjs/core";

export const getServerSideProps: ServerLoader = async (ctx) => {
  // Get message from query string (set by redirects)
  const message = ctx.req.query.message as string | undefined;

  return {
    props: {
      message: message ? decodeURIComponent(message) : undefined,
    },
    metadata: {
      title: "Redirect & Not Found Examples",
      description: "Examples demonstrating ctx.Redirect() and ctx.NotFound()",
    },
  };
};

