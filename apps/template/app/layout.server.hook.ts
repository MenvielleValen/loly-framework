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
      // App name - available in layout and all pages
      appName: "Loly App",
      
      // Navigation items - customize as needed
      navigation: [
        { href: "/", label: "Home" },
      ],
      
      // Footer data - stable across all pages
      footerLinks: {
        resources: [
          { href: "https://github.com/MenvielleValen/loly-framework", label: "GitHub", external: true },
          { href: "https://github.com/MenvielleValen/loly-framework/blob/main/packages/loly-core/README.md", label: "Documentation", external: true },
        ],
        framework: [
          { href: "https://github.com/MenvielleValen/loly-framework", label: "Loly Framework", external: true },
        ],
      },
      
      // Metadata that could be set at layout level
      siteMetadata: {
        description: "A modern full-stack React framework with native WebSocket support.",
        copyright: "© 2025 Loly App. Made with 💙 using Loly Framework.",
      },
    },
    
    // Layout-level metadata - provides BASE defaults for all pages
    metadata: {
      // Site-wide defaults
      description: "A modern full-stack React framework with native WebSocket support.",
      lang: "en",
      robots: "index, follow",
      themeColor: "#0a0a0a",
      
      // Open Graph defaults (site-wide)
      openGraph: {
        type: "website",
        siteName: "Loly App",
        locale: "en_US",
      },
      
      // Twitter Card defaults
      twitter: {
        card: "summary_large_image",
      },
      
      // Custom meta tags (site-wide)
      metaTags: [
        {
          name: "author",
          content: "Loly Framework",
        },
      ],
    },
  };
};
