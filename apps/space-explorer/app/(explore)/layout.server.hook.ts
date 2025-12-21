import type { ServerLoader } from "@lolyjs/core";

/**
 * Server hook for the (explore) route group layout.
 * This hook provides props that are available to all pages in the (explore) group:
 * - /planets
 * - /launches
 * - /astronauts
 * 
 * These props are merged with page-specific props and are available to both
 * the layout component and the page components.
 */
export const getServerSideProps: ServerLoader = async (ctx) => {
  return {
    props: {
      exploreTitle: "Explore the Universe",
      exploreDescription: "Discover planets, space launches, and astronauts with real data from NASA and SpaceX",
    },
  };
};

