import { ServerLoader } from "@lolyjs/core";

/**
 * Page server hook for dashboard.
 * 
 * Note: ctx.locals.user is already established by global middleware.
 * This hook verifies authentication and provides user data to the page.
 */
export const getServerSideProps: ServerLoader = async (ctx) => {
  const user = ctx.locals?.user; // Disponible gracias a global middleware

  if (!user) {
    return ctx.Redirect("/examples/auth/login", false);
  }

  return {
    props: {
      user,
      message: `Welcome ${user.name}!`,
      dashboardData: {
        stats: {
          total: 100,
          active: 75,
          inactive: 25,
        },
      },
    },
    metadata: {
      title: `Dashboard - ${user.name}`,
      description: `Dashboard for ${user.name}`,
    },
  };
};

