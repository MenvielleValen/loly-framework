import type { ServerLoader, GenerateStaticParams } from "@loly/core";
import { getAllPlanets, getPlanet } from "@/lib/space-api";

// Enable SSG for planets page
export const dynamic = "force-static" as const;

// Generate static params for all planets
export const generateStaticParams: GenerateStaticParams = async () => {
  const planets = getAllPlanets();
  return planets.map((planet) => ({ id: planet.id }));
};

export const getServerSideProps: ServerLoader = async (ctx: any) => {
  const planets = getAllPlanets();

  return {
    props: {
      planets,
    },
    metadata: {
      title: "Planetas | Space Explorer",
      description:
        "Explora los 8 planetas del sistema solar con información detallada.",
    },
  };
};

