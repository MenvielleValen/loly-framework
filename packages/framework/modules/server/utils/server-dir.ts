import fs from "fs";
import path from "path";

export const getServerFile = async (projectRoot: string, fileName: string) => {
  const fileTS = path.join(projectRoot, `${fileName}.ts`);
  const fileJS = path.join(projectRoot, ".fw", "server", `${fileName}.js`);

  const isDev = process.env.NODE_ENV === "development";
  let mod: any = null;

  if (isDev) {
    if (!fs.existsSync(fileTS)) {
      return null;
    }

    require("tsx/cjs");
    mod = require(fileTS);
  } else {
    if (!fs.existsSync(fileJS)) {
      return null;
    }

    mod = require(fileJS);
  }

  return mod;
};
