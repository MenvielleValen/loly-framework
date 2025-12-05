import { ServerConfig } from "@lolyjs/core";

const DEFAULT_CONFIG: ServerConfig = {
  bodyLimit: "1mb",
  corsOrigin: "*",
};

const PROD_CONFIG: ServerConfig = {};

const DEV_CONFIG: ServerConfig = {};

export const config = (env: string): ServerConfig => {
  const isDev = env === 'development'

  const lolyConfig = isDev ? DEV_CONFIG : PROD_CONFIG;

  return {
    ...DEFAULT_CONFIG,
    ...lolyConfig,
  };
};
