import { ServerLoader } from "@lolyjs/core";

/**
 * Page server hook for profile.
 * 
 * Note: ctx.locals.user is already established by global middleware.
 * This demonstrates that the global middleware works correctly in SPA navigation.
 */
export const getServerSideProps: ServerLoader = async (ctx) => {
  const user = ctx.locals?.user; // Disponible gracias a global middleware

  if (!user) {
    return ctx.Redirect("/examples/auth/login", false);
  }

  return {
    props: {
      user,
      profileData: {
        email: `${user.id}@example.com`,
        memberSince: "2024-01-01",
      },
    },
    metadata: {
      title: `Profile - ${user.name}`,
      description: `Profile page for ${user.name}`,
    },
  };
};

