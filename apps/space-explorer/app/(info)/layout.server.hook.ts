import type { ServerLoader } from "@lolyjs/core";

/**
 * Server hook for the (info) route group layout.
 * This hook provides props that are available to all pages in the (info) group:
 * - /about
 * - /contact
 * 
 * These props are merged with page-specific props and are available to both
 * the layout component and the page components.
 */
export const getServerSideProps: ServerLoader = async (ctx) => {
  return {
    props: {
      infoTitle: "About Space Explorer",
      infoDescription: "Learn more about this application and how to get in touch",
    },
  };
};

