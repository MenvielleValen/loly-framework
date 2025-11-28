import type { GenerateStaticParams, ServerLoader } from "@loly/core";
import { getDocById, getDocsIndex } from "@/lib/site-data";

export const dynamic = "force-static" as const; // ⭐ SSG

export const generateStaticParams: GenerateStaticParams = async () => {
  const docs = await getDocsIndex();

  console.log("SSG", docs)


  return docs.map((doc) => ({ id: doc.id }));
};


export const getServerSideProps: ServerLoader = async (ctx) => {
  const doc = await getDocById(ctx.params.id);

  console.log("RSC", doc)

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

