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
  return {
    props: {
      appName: "Loly Playground",
      navigation: [
        { href: "/", label: "Home" },
        { href: "/examples/redirects", label: "Redirect Examples" },
      ],
    },

    // Layout-level metadata - provides BASE defaults for all pages
    metadata: {
      // Site-wide defaults
      description: "A modern web application built with Loly Framework.",
      lang: "en",
      robots: "index, follow",
      themeColor: "#0a0a0a",

      // Open Graph defaults (site-wide)
      openGraph: {
        type: "website",
        siteName: "My App",
        locale: "en_US",
      },

      // Twitter Card defaults
      twitter: {
        card: "summary_large_image",
      },
    },
  };
};
