import type { ServerLoader, GenerateStaticParams } from "@loly/core";
import { getAllAstronauts } from "@/lib/space-api";

// Enable SSG for astronauts page
export const dynamic = "force-static" as const;

export const getServerSideProps: ServerLoader = async () => {
  const astronauts = getAllAstronauts();

  return {
    props: {
      astronauts,
    },
    metadata: {
      title: "Astronautas | Space Explorer",
      description:
        "Conoce a los héroes que han explorado el espacio exterior.",
    },
  };
};

