import type { ServerLoader } from "@lolyjs/core";

/**
 * Example: Conditional Redirect
 * 
 * This demonstrates redirecting based on conditions such as:
 * - Query parameters
 * - Authentication status
 * - Data availability
 * - User permissions
 */
export const getServerSideProps: ServerLoader = async (ctx) => {
  // Check if redirect query parameter is present
  const shouldRedirect = ctx.req.query.redirect === "true";

  if (shouldRedirect) {
    // Redirect to home page
    return ctx.Redirect("/examples/redirects?message=Redirected+from+conditional+example");
  }

  // Normal behavior - return props
  return {
    props: {
      shouldRedirect: false,
    },
    metadata: {
      title: "Conditional Redirect Example",
      description: "Example of conditional redirect based on query parameters",
    },
  };
};

