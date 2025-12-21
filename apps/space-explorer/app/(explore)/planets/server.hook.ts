import type { ServerLoader, GenerateStaticParams } from "@lolyjs/core";
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
      title: "Planets | Space Explorer",
      description:
        "Explore the 8 planets of the solar system with detailed information.",
    },
  };
};

