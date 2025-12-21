import type { ServerLoader } from "@lolyjs/core";

/**
 * Example: Temporary Redirect (302)
 * 
 * This redirects temporarily to the examples page.
 * The original URL should still be used.
 */
export const getServerSideProps: ServerLoader = async (ctx) => {
  // Redirect temporarily to examples page
  return ctx.Redirect("/examples/redirects", false); // permanent = false (302)
};

