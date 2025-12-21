import type { ServerLoader, GenerateStaticParams } from "@lolyjs/core";
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
      title: "Astronauts | Space Explorer",
      description:
        "Meet the heroes who have explored outer space.",
    },
  };
};

