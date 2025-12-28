import { ServerLoader } from "@lolyjs/core";

/**
 * Layout server hook for auth-protected routes.
 * 
 * Note: ctx.locals.user is already established by global middleware.
 * This hook just makes the routing decision (redirect if not authenticated).
 */
export const getServerSideProps: ServerLoader = async (ctx) => {
  // ctx.locals.user is already set by the global middleware
  const user = ctx.locals?.user;

  if (!user) {
    return ctx.Redirect("/examples/auth/login", false);
  }

  return {
    props: {
      user,
    },
  };
};

