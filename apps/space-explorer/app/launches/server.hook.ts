import type { ServerLoader } from "@loly/core";
import { getSpaceXLaunches } from "@/lib/space-api";

// Use SSR for launches (dynamic data)
export const dynamic = "force-dynamic" as const;

export const getServerSideProps: ServerLoader = async () => {
  const launches = await getSpaceXLaunches(20);

  return {
    props: {
      launches,
    },
    metadata: {
      title: "Lanzamientos | Space Explorer",
      description:
        "Explora los lanzamientos más recientes de SpaceX con datos en tiempo real.",
    },
  };
};

