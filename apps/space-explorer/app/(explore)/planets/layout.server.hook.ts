import type { ServerLoader } from "@lolyjs/core";

/**
 * Planets layout server hook - provides section-specific data.
 * This demonstrates nested layout server hooks.
 * 
 * File location: app/planets/layout.server.hook.ts (same directory as app/planets/layout.tsx)
 * 
 * Props from this layout hook will be merged with:
 * 1. Props from root layout (app/layout.server.hook.ts)
 * 2. Props from page (app/planets/page.server.hook.ts or app/planets/[id]/page.server.hook.ts)
 * 
 * Order: root layout props → nested layout props → page props (page overrides)
 */
export const getServerSideProps: ServerLoader = async () => {
  return {
    props: {
      // Section-specific data
      sectionTitle: "Planets Explorer",
      sectionDescription: "Discover the planets in our solar system and beyond 33",
      
      // This could come from a CMS, database, or config
      sectionConfig: {
        enableSearch: true,
        itemsPerPage: 12,
      },
    },
  };
};

