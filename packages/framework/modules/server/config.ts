import { getServerFile } from "./utils/server-dir";

export const CONFIG_FILE_NAME = "loly.config";

export interface ServerConfig {
    bodyLimit?: string;
    corsOrigin?: string;
}

const DEFAULT_CONFIG: ServerConfig = {
    bodyLimit: '1mb',
    corsOrigin: '*',
}

export async function getServerConfig(
  projectRoot: string,
): Promise<ServerConfig> {
  let mod: any = await getServerFile(projectRoot, CONFIG_FILE_NAME);

  if (typeof mod?.config === "function") {

    const options = mod?.config(process.env.NODE_ENV) as ServerConfig;

    return {
        ...DEFAULT_CONFIG,
        ...options,
    }
  }

  return DEFAULT_CONFIG;
}
