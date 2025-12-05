import type { ServerLoader, GenerateStaticParams } from "@lolyjs/core";
import { getAllPlanets, getPlanet } from "@/lib/space-api";

// Enable SSG for individual planet pages
export const dynamic = "force-static" as const;

// Generate static params for all planets
export const generateStaticParams: GenerateStaticParams = async () => {
  const planets = getAllPlanets();
  return planets.map((planet) => ({ id: planet.id }));
};

export const getServerSideProps: ServerLoader = async (ctx) => {
  const { id } = ctx.params;
  const planet = getPlanet(id as string);

  if (!planet) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      planet,
    },
    metadata: {
      title: `${planet.name} | Space Explorer`,
      description: planet.description,
      metaTags: [
        {
          property: "og:title",
          content: `${planet.name} | Space Explorer`,
        },
        {
          property: "og:description",
          content: planet.description,
        },
      ],
    },
  };
};

