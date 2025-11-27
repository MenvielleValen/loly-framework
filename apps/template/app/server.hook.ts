import type { RouteMiddleware, ServerLoader } from "@loly/core";
import {
  getDocsIndex,
  getLaunchInsights,
  getLivePulse,
} from "@/lib/site-data";

declare module "@loly/core" {
  interface RouteLocals {
    requestStartedAt?: number;
  }
}

export const beforeServerData: RouteMiddleware[] = [
  async (ctx, next) => {
    ctx.locals.requestStartedAt = Date.now();
    await next();
  },
];

export const getServerSideProps: ServerLoader = async (ctx) => {
  const [launchData, docsIndex, livePulse] = await Promise.all([
    getLaunchInsights(),
    getDocsIndex(),
    getLivePulse(),
  ]);

  const renderTime =
    Date.now() - (ctx.locals.requestStartedAt ?? Date.now());

  return {
    props: {
      appName: launchData.appName,
      data: launchData,
      docsIndex,
      insights: {
        ...livePulse,
        renderTime,
      },
    },
    metadata: {
      title: `${launchData.appName} | Product template`,
      description: launchData.hero.punchline,
    },
  };
};
