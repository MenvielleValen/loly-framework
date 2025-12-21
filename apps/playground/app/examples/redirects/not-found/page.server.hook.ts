import type { ServerLoader } from "@lolyjs/core";

/**
 * Example: Not Found (404)
 * 
 * This demonstrates returning a 404 Not Found response.
 * Useful when a resource doesn't exist or shouldn't be accessible.
 */
export const getServerSideProps: ServerLoader = async (ctx) => {
  // Return 404 Not Found
  return ctx.NotFound();
};

