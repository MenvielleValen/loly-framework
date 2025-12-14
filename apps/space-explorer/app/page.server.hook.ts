import type { ServerLoader } from "@lolyjs/core";
import { getNASAPOD, getSpaceXLaunches } from "@/lib/space-api";

/**
 * Page server hook - provides data for the home page.
 * 
 * File location: app/page.server.hook.ts (same directory as app/page.tsx)
 * 
 * Note: The framework also supports the legacy name `server.hook.ts` for backward compatibility,
 * but `page.server.hook.ts` is preferred for consistency with `layout.server.hook.ts`.
 * 
 * NOTE: Page metadata OVERRIDES layout metadata.
 * Layout provides defaults (like siteName, og:type, etc.), page provides specific values.
 */
export const getServerSideProps: ServerLoader = async () => {
  const [apod, launches] = await Promise.all([
    getNASAPOD().catch(() => null),
    getSpaceXLaunches(3).catch(() => []),
  ]);

  // Use APOD image for Open Graph if available
  const ogImage = apod?.url || undefined;

  return {
    props: {
      apod,
      recentLaunches: launches,
    },
    metadata: {
      // Page-specific title and description (overrides layout defaults)
      title: "Space Explorer | Exploring the Universe",
      description:
        "Discover the universe with real data from NASA and SpaceX. Planets, launches, astronauts and more.",
      
      // Canonical URL for this page
      canonical: "https://space-explorer.example.com/",
      
      // Open Graph - inherits og:type, og:siteName from layout, but overrides title/description/image
      openGraph: {
        title: "Space Explorer | Exploring the Universe",
        description: "Discover the universe with real data from NASA and SpaceX. Planets, launches, astronauts and more.",
        url: "https://space-explorer.example.com/",
        // If APOD image is available, use it for OG image
        ...(ogImage && {
          image: {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: apod?.title || "Space Explorer - Astronomy Picture of the Day",
          },
        }),
        // og:type and og:siteName come from layout (not overridden here)
      },
      
      // Twitter Card - inherits card type from layout, but overrides content
      twitter: {
        title: "Space Explorer | Exploring the Universe",
        description: "Discover the universe with real data from NASA and SpaceX.",
        // If APOD image is available, use it for Twitter
        ...(ogImage && {
          image: ogImage,
          imageAlt: apod?.title || "Space Explorer - Astronomy Picture of the Day",
        }),
        // twitter:card comes from layout (not overridden here)
      },
      
      // Additional page-specific meta tags
      metaTags: [
        {
          name: "keywords",
          content: "space, NASA, SpaceX, astronomy, planets, launches, astronauts, APOD",
        },
      ],
    },
  };
};

