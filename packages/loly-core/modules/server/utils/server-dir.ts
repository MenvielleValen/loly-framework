import fs from "fs";
import path from "path";
import { BUILD_FOLDER_NAME } from "@constants/globals";
import { loadModule } from "@router/utils/module-loader";

export const getServerFile = async (projectRoot: string, fileName: string) => {
  const fileTS = path.join(projectRoot, `${fileName}.ts`);
  const serverDir = path.join(projectRoot, BUILD_FOLDER_NAME, "server");

  const isDev = process.env.NODE_ENV === "development";
  let mod: any = null;

  if (isDev) {
    if (!fs.existsSync(fileTS)) {
      return null;
    }

    require("tsx/cjs");
    mod = await loadModule(fileTS, { projectRoot });
  } else {
    // Production: always look for .mjs (ESM only)
    const fileMjs = path.join(serverDir, `${fileName}.mjs`);
    const fileJs = path.join(serverDir, `${fileName}.js`);

    const fileToLoad = fs.existsSync(fileMjs) ? fileMjs : fileJs;
    
    if (!fs.existsSync(fileToLoad)) {
      return null;
    }

    mod = await loadModule(fileToLoad, { projectRoot });
  }

  return mod;
};
