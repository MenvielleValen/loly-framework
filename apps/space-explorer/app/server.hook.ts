import type { ServerLoader } from "@loly/core";
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
      title: "Space Explorer | Explorando el Universo",
      description:
        "Descubre el universo con datos reales de NASA y SpaceX. Planetas, lanzamientos, astronautas y más.",
      metaTags: [
        {
          property: "og:title",
          content: "Space Explorer | Explorando el Universo",
        },
        {
          property: "og:description",
          content:
            "Descubre el universo con datos reales de NASA y SpaceX.",
        },
        {
          property: "og:type",
          content: "website",
        },
      ],
    },
  };
};

