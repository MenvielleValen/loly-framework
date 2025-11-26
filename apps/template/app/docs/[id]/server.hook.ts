import type { ServerLoader } from "@loly/core";
import { getDocById } from "@/lib/site-data";

export const getServerSideProps: ServerLoader = async (ctx) => {
  const doc = await getDocById(ctx.params.id);

  return {
    props: {
      doc: doc ?? null,
    },
    metadata: {
      title: doc ? `${doc.title} | Docs` : "Docs | No encontrada",
      description: doc?.summary ?? "Guía no encontrada",
    },
    className: "dark",
  };
};

