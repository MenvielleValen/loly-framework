import http from "http";
import { getServerFile } from "./utils/server-dir";

export const INIT_FILE_NAME = 'init.server';

export interface InitServerData {
  server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>;
}

export async function runInitIfExists(
  projectRoot: string,
  serverData: InitServerData
): Promise<Record<string, any>> {
  try {
    let mod: any = await getServerFile(projectRoot, INIT_FILE_NAME);

    if (typeof mod?.init === "function") {
      const serverContext: any = { ...serverData };
      await mod.init({ serverContext });

      return serverContext;
    }
  } catch (error) {
    console.error(`[Init] Failed to load or execute ${INIT_FILE_NAME}.ts:`, error);
    // Don't throw - allow server to start even if init fails
    // This prevents init errors from blocking the entire server
  }

  return {};
}
