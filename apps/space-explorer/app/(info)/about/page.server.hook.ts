import type { ServerLoader } from "@lolyjs/core";

/**
 * Server hook for the /about page.
 * This page is inside the (info) route group, so it receives:
 * 1. Props from root layout.server.hook.ts
 * 2. Props from (info)/layout.server.hook.ts
 * 3. Props from this page.server.hook.ts (this file)
 * 
 * All props are merged and available to both the layout and page components.
 */
export const getServerSideProps: ServerLoader = async (ctx) => {
  return {
    props: {
      // Page-specific props can be added here
      // They will be merged with layout props
    },
    metadata: {
      title: "About | Space Explorer",
      description: "Learn more about Space Explorer, a modern web application for exploring space data from NASA and SpaceX.",
    },
  };
};

