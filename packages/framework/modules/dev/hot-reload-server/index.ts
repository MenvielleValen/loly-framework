import path from "path";

/**
 * Clears the require cache for files in the app directory.
 *
 * @param appDir - App directory path
 */
export function clearAppRequireCache(appDir: string) {
  const appDirNormalized = path.resolve(appDir);

  for (const id of Object.keys(require.cache)) {
    if (id.startsWith(appDirNormalized)) {
      delete require.cache[id];
    }
  }
}
