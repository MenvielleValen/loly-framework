import type { ServerLoader } from "@loly/core";
import { getDocsIndex } from "@/lib/site-data";

export const getServerSideProps: ServerLoader = async () => {
  const docs = await getDocsIndex();

  return {
    props: {
      docs,
    },
    metadata: {
      title: "Docs | Loly template",
      description: "Guías renderizadas con loaders server-side.",
    },
    className: "dark",
  };
};

