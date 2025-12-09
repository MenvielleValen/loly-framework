import type { ServerLoader } from "@lolyjs/core";
import { getNASAPOD, getSpaceXLaunches } from "@/lib/space-api";

export const getServerSideProps: ServerLoader = async () => {
  const [apod, launches] = await Promise.all([
    getNASAPOD().catch(() => null),
    getSpaceXLaunches(3).catch(() => []),
  ]);

  return {
    props: {
      apod,
      recentLaunches: launches,
    },
    metadata: {
      title: "Space Explorer | Exploring the Universe",
      description:
        "Discover the universe with real data from NASA and SpaceX. Planets, launches, astronauts and more.",
      metaTags: [
        {
          property: "og:title",
          content: "Space Explorer | Exploring the Universe",
        },
        {
          property: "og:description",
          content:
            "Discover the universe with real data from NASA and SpaceX.",
        },
        {
          property: "og:type",
          content: "website",
        },
      ],
    },
  };
};

