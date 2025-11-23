import type { ServerLoader, MetadataLoader, GenerateStaticParams } from "@loly/core";

export const dynamic = "force-static" as const; // ⭐ SSG

// ⭐ Listado de slugs a prerenderizar en build
export const generateStaticParams: GenerateStaticParams = async () => {
  // esto podría venir de BD, FS, etc.
  const slugs = ["hello-world", "ssg-rocks", "otro-post"];
  return slugs.map((slug) => ({ slug }));
};

export const getServerSideProps: ServerLoader = async (ctx) => {
  const slug = ctx.params.slug;

  return {
    props: {
      slug,
      content: `Contenido xs para ${slug}`,
    },
    metadata: {
      title: `EL 1 test ${slug} – My Framework Dev`,
      description: `Detalle del post estático "${slug}"`,
    }
  };
};