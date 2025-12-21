import type { ServerLoader } from "@lolyjs/core";

/**
 * Example: Permanent Redirect (301)
 * 
 * This redirects permanently to the home page.
 * Search engines will update their index to use the new URL.
 */
export const getServerSideProps: ServerLoader = async (ctx) => {
  // Redirect permanently to home
  return ctx.Redirect("/", true); // permanent = true (301)
};

