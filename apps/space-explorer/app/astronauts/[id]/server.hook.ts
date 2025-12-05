import type { ServerLoader, GenerateStaticParams } from "@lolyjs/core";
import { getAllAstronauts, getAstronaut } from "@/lib/space-api";

// Enable SSG for individual astronaut pages
export const dynamic = "force-static" as const;

// Generate static params for all astronauts
export const generateStaticParams: GenerateStaticParams = async () => {
  const astronauts = getAllAstronauts();
  return astronauts.map((astronaut) => ({ id: astronaut.id }));
};

export const getServerSideProps: ServerLoader = async (ctx) => {
  const { id } = ctx.params;
  const astronaut = getAstronaut(id as string);

  if (!astronaut) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      astronaut,
    },
    metadata: {
      title: `${astronaut.name} | Space Explorer`,
      description: astronaut.bio || `Perfil de ${astronaut.name}`,
      metaTags: [
        {
          property: "og:title",
          content: `${astronaut.name} | Space Explorer`,
        },
        {
          property: "og:description",
          content: astronaut.bio || `Perfil de ${astronaut.name}`,
        },
      ],
    },
  };
};

