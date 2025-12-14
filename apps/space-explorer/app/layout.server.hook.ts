import type { ServerLoader } from "@lolyjs/core";

/**
 * Layout server hook - provides stable data that persists across page navigations.
 * This data is available to both the layout and all pages.
 * 
 * File location: app/layout.server.hook.ts (same directory as app/layout.tsx)
 * 
 * NOTE: Metadata defined here acts as BASE/fallback for all pages.
 * Pages can override specific fields, but layout metadata provides defaults.
 */
export const getServerSideProps: ServerLoader = async () => {
  // Simulate fetching stable data (like user, app config, navigation, etc.)
  // In a real app, this might come from a database, API, or config
  
  return {
    props: {
      // App name - available in layout and all pages
      appName: "Space Explorer",
      
      // Navigation items - could come from CMS or config
      navigation: [
        { href: "/planets", label: "Planets" },
        { href: "/launches", label: "Launches" },
        { href: "/astronauts", label: "Astronauts" },
        { href: "/apod", label: "APOD" },
      ],
      
      // Footer data - stable across all pages
      footerLinks: {
        explore: [
          { href: "/planets", label: "Planets" },
          { href: "/launches", label: "Launches" },
          { href: "/astronauts", label: "Astronauts" },
          { href: "/apod", label: "Picture of the Day" },
        ],
        apis: [
          { href: "https://api.nasa.gov", label: "NASA API", external: true },
          { href: "https://docs.spacexdata.com", label: "SpaceX API", external: true },
          { href: "/api/search", label: "API Search" },
        ],
        framework: [
          { href: "https://github.com", label: "Loly Framework", external: true },
        ],
      },
      
      // Metadata that could be set at layout level
      siteMetadata: {
        description: "Exploring the universe with real data from NASA and SpaceX.",
        copyright: "© 2025 Space Explorer. Made with 💙 using Loly Framework.",
      },
    },
    
    // Layout-level metadata - provides BASE defaults for all pages
    // Pages can override specific fields, but these will be used as fallbacks
    metadata: {
      // Site-wide defaults
      description: "Exploring the universe with real data from NASA and SpaceX.",
      lang: "en",
      robots: "index, follow",
      themeColor: "#0a0a0a",
      
      // Open Graph defaults (site-wide)
      openGraph: {
        type: "website",
        siteName: "Space Explorer",
        locale: "en_US",
        // Note: og:title and og:description will be set by pages
        // og:image can be set here for a default site image
      },
      
      // Twitter Card defaults
      twitter: {
        card: "summary_large_image",
        // Note: twitter:title, twitter:description, twitter:image will be set by pages
      },
      
      // Custom meta tags (site-wide)
      metaTags: [
        {
          name: "author",
          content: "Space Explorer Team",
        },
      ],
      
      // Custom link tags (e.g., preconnect for external resources)
      links: [
        {
          rel: "preconnect",
          href: "https://api.nasa.gov",
        },
        {
          rel: "preconnect",
          href: "https://api.spacexdata.com",
        },
      ],
    },
  };
};

