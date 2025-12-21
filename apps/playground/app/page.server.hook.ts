import type { ServerLoader } from "@lolyjs/core";

/**
 * Page server hook - provides data for the home page.
 * 
 * File location: app/page.server.hook.ts (same directory as app/page.tsx)
 * 
 * NOTE: Page metadata OVERRIDES layout metadata.
 * Layout provides defaults (like siteName, og:type, etc.), page provides specific values.
 */
export const getServerSideProps: ServerLoader = async () => {
  return {
    props: {},
    metadata: {
      // Page-specific title and description (overrides layout defaults)
      title: "Home",
      description: "Welcome to my application built with Loly Framework.",
      
      // Canonical URL for this page
      canonical: "/",
      
      // Open Graph - inherits og:type, og:siteName from layout, but overrides title/description
      openGraph: {
        title: "Home",
        description: "Welcome to my application built with Loly Framework.",
        url: "/",
      },
      
      // Twitter Card - inherits card type from layout, but overrides content
      twitter: {
        title: "Home",
        description: "Welcome to my application built with Loly Framework.",
      },
    },
  };
};
