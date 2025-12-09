import type { ServerLoader } from "@lolyjs/core";
import { getSpaceXLaunches } from "@/lib/space-api";

// Use SSR for launches (dynamic data)
export const dynamic = "force-dynamic" as const;

export const getServerSideProps: ServerLoader = async () => {
  const launches = await getSpaceXLaunches(20);

  return {
    props: {
        launches,
        randomNumber: Math.floor(Math.random() * 100),
    },
    metadata: {
      title: "Launches | Space Explorer",
      description:
        "Explore the most recent SpaceX launches with real-time data.",
    },
  };
};

