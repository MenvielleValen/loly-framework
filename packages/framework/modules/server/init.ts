import fs from "fs";
import path from "path";
import http from "http";

export interface InitServerData {
  server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>;
}

/**
 * Ejecuta init.server.ts si existe en el proyecto.
 */
export async function runInitIfExists(
  projectRoot: string,
  serverData: InitServerData
): Promise<Record<string, any>> {
  const initTS = path.join(projectRoot, "init.server.ts");

  if (!fs.existsSync(initTS)) {
    console.log("[framework] No hay init.server.ts en", projectRoot);
    return {};
  }

  console.log("[framework] Ejecutando init.server.ts...");

  // 👇 Registramos el loader de TS/TSX UNA sola vez
  require("tsx/cjs");

  const mod = require(initTS);

  if (typeof mod.init === "function") {
    const serverContext: any = { ...serverData };
    await mod.init({ serverContext });
    console.log("[framework] init.server.ts ejecutado con éxito");
    return serverContext;
  }

  console.warn(
    "[framework] init.server.ts encontrado pero sin export init({ serverContext })"
  );
  return {};
}

