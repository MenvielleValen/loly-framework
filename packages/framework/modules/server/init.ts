import fs from "fs";
import path from "path";
import http from "http";

export interface InitServerData {
  server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>;
}

export async function runInitIfExists(
  projectRoot: string,
  serverData: InitServerData
): Promise<Record<string, any>> {
  const initTS = path.join(projectRoot, "init.server.ts");
  const initJS = path.join(projectRoot, ".fw", "server", "init.server.js");

  const isDev = process.env.NODE_ENV === "development";
  let mod: any = null;

  if (isDev) {
    if (!fs.existsSync(initTS)) {
      console.log("[framework] No hay init.server.ts en", projectRoot);
      return {};
    }

    console.log("[framework] Ejecutando init.server.ts (DEV)...");
    require("tsx/cjs"); // solo en dev
    mod = require(initTS);
  } else {
    if (!fs.existsSync(initJS)) {
      console.log(
        "[framework] No hay init.server.js compilado en .fw/server — ¿corriste loly build?"
      );
      return {};
    }

    console.log("[framework] Ejecutando init.server.js (PROD)...");
    mod = require(initJS);
  }

  if (typeof mod.init === "function") {
    const serverContext: any = { ...serverData };
    await mod.init({ serverContext });
    console.log("[framework] init ejecutado con éxito");
    return serverContext;
  }

  console.warn("[framework] init encontrado pero sin export init()");
  return {};
}
