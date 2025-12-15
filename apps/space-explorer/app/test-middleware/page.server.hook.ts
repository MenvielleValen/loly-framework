import type { RouteMiddleware, ServerLoader } from "@lolyjs/core";

// Test middleware that adds data to ctx.locals
export const beforeServerData: RouteMiddleware[] = [
  async (ctx, next) => {
    // Add test data to locals
    ctx.locals.testData = {
      message: "Middleware executed!",
      timestamp: new Date().toISOString(),
      pathname: ctx.pathname,
    };
    
    await next();
  },
];

export const getServerSideProps: ServerLoader = async (ctx) => {
  // Access data from middleware
  const testData = ctx.locals.testData;
  
  return {
    props: {
      middlewareData: testData,
      message: "Page hook executed after middleware",
    },
    metadata: {
      title: "Test Middleware | Space Explorer",
      description: "Test page to verify beforeServerData works",
    },
  };
};
