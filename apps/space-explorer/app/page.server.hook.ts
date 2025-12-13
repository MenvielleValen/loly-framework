import type { ServerLoader } from "@lolyjs/core";
import { getNASAPOD, getSpaceXLaunches } from "@/lib/space-api";

/**
 * Page server hook - provides data for the home page.
 * 
 * File location: app/page.server.hook.ts (same directory as app/page.tsx)
 * 
 * Note: The framework also supports the legacy name `server.hook.ts` for backward compatibility,
 * but `page.server.hook.ts` is preferred for consistency with `layout.server.hook.ts`.
 */
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

