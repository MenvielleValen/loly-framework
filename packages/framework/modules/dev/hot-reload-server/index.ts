import path from "path";

export function clearAppRequireCache(appDir: string) {
  const appDirNormalized = path.resolve(appDir);

  for (const id of Object.keys(require.cache)) {
    if (id.startsWith(appDirNormalized)) {
      delete require.cache[id];
    }
  }
}
