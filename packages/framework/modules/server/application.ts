import http from "http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { getServerConfig } from "@server/config";

interface SetupAppOptions {
  projectRoot: string;
}

export const setupApplication = async ({
  projectRoot,
}: SetupAppOptions): Promise<{
  app: express.Express;
  httpServer: http.Server<
    typeof http.IncomingMessage,
    typeof http.ServerResponse
  >;
}> => {
  const app = express();

  const serverConfig = await getServerConfig(projectRoot);

  const { bodyLimit, corsOrigin } = serverConfig;

  app.use(
    helmet({
      contentSecurityPolicy: false,
    })
  );

  app.use(
    cors({
      origin: corsOrigin,
      credentials: true,
    })
  );

  app.use(express.json({ limit: bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: bodyLimit }));

  // Create http server
  const httpServer = http.createServer(app);

  return {
    app,
    httpServer,
  };
};
