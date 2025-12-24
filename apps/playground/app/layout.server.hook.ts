import type { ServerLoader } from "@lolyjs/core";

/**
 * Layout server hook - provides stable data that persists across page navigations.
 * This data is available to both the layout and all pages.
 *
 * File location: app/layout.server.hook.ts (same directory as app/layout.tsx)
 *
 * NOTE: Metadata defined here acts as BASE/fallback for all pages.
 * Pages can override specific fields, but layout metadata provides defaults.
 * 
 * ✅ This demonstrates top-level await in ESM!
 */

// Top-level await to load navigation
// This executes when the module loads, not inside the function
const loadNavigation = async () => {
  // Simulate load from API/DB (in production this could be a real call)
  await new Promise((resolve) => setTimeout(resolve, 10));

  return [
    { href: "/", label: "Home" },
    { href: "/examples/redirects", label: "Redirect Examples" },
    { href: "/examples/auth/dashboard", label: "Auth Example" },
    { href: "/examples/auth/login", label: "Login Example" },
    { href: "/examples/esm/top-level-await", label: "Top-Level Await" },
    { href: "/examples/esm/import-meta", label: "Import.meta" },
    { href: "/examples/esm/dynamic-imports", label: "Dynamic Imports" },
    { href: "/examples/esm/async-init", label: "Async Init" },
    { href: "/examples/image-optimization", label: "Image Optimizer" },
  ];
};

// Top-level await - Does NOT work in CJS
const navigation = await loadNavigation();

export const getServerSideProps: ServerLoader = async () => {
  return {
    props: {
      appName: "Loly Playground",
      navigation,
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
