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
      title: "Loly Framework | Modern Full-Stack React Framework",
      description:
        "Build modern web applications with Loly Framework. Full-stack React with SSR, SSG, API routes, WebSockets, and more.",
      
      // Canonical URL for this page
      canonical: "/",
      
      // Open Graph - inherits og:type, og:siteName from layout, but overrides title/description
      openGraph: {
        title: "Loly Framework | Modern Full-Stack React Framework",
        description: "Build modern web applications with Loly Framework. Full-stack React with SSR, SSG, API routes, WebSockets, and more.",
        url: "/",
      },
      
      // Twitter Card - inherits card type from layout, but overrides content
      twitter: {
        title: "Loly Framework | Modern Full-Stack React Framework",
        description: "Build modern web applications with Loly Framework.",
      },
      
      // Additional page-specific meta tags
      metaTags: [
        {
          name: "keywords",
          content: "loly, framework, react, full-stack, ssr, ssg, websocket, typescript",
        },
      ],
    },
  };
};
