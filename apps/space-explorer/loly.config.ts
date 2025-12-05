import { ServerConfig } from "@lolyjs/core";

const DEFAULT_CONFIG: ServerConfig = {
  bodyLimit: "1mb",
  corsOrigin: "*",
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 1000,
    strictMax: 5,
    strictPatterns: [
      "/api/search/**",
      "/api/favorites/**",
    ],
  },
};

const PROD_CONFIG: ServerConfig = {
  corsOrigin: ["https://space-explorer.example.com"],
};

const DEV_CONFIG: ServerConfig = {};

export const config = (env: string): ServerConfig => {
  const isDev = env === "development";

  const lolyConfig = isDev ? DEV_CONFIG : PROD_CONFIG;

  return {
    ...DEFAULT_CONFIG,
    ...lolyConfig,
  };
};

