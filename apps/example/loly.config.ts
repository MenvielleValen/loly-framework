import { ServerConfig } from "@loly/core";

export const config = (env: string): ServerConfig => {
  console.log("[loly.config] Environment:", env);

  return {
    bodyLimit: "1mb",
    corsOrigin: '*'
  };
};
