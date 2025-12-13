import fs from "fs";
import path from "path";
import { LayoutComponent } from "./index.types";
import { LAYOUT_FILE_BASENAME } from "./constants";

/**
 * Finds a layout file in the given directory.
 * Checks for layout.tsx, layout.ts, layout.jsx, or layout.js.
 */
export function findLayoutFileInDir(dir: string): string | null {
  const candidates = [
    `${LAYOUT_FILE_BASENAME}.tsx`,
    `${LAYOUT_FILE_BASENAME}.ts`,
    `${LAYOUT_FILE_BASENAME}.jsx`,
    `${LAYOUT_FILE_BASENAME}.js`,
  ];

  for (const file of candidates) {
    const fullPath = path.join(dir, file);
    if (fs.existsSync(fullPath)) return fullPath;
  }

  return null;
}

/**
 * Loads all layout components for a page directory.
 * Walks up from the page directory to the app root, collecting layouts at each level.
 * Returns layouts in order from root to most specific.
 */
export function loadLayoutsForDir(
  pageDir: string,
  appDir: string
): { components: LayoutComponent[]; files: string[] } {
  const componentsBottomUp: LayoutComponent[] = [];
  const filesBottomUp: string[] = [];

  let currentDir = pageDir;
  const appDirResolved = path.resolve(appDir);

  while (true) {
    const layoutFile = findLayoutFileInDir(currentDir);
    if (layoutFile) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require(layoutFile);
      const LayoutComp: LayoutComponent = mod.default;
      if (LayoutComp) {
        componentsBottomUp.push(LayoutComp);
        filesBottomUp.push(layoutFile);
      }
    }

    const currentResolved = path.resolve(currentDir);
    if (currentResolved === appDirResolved) break;

    const parent = path.dirname(currentDir);
    if (parent === currentDir) break; // Reached filesystem root
    currentDir = parent;
  }

  // Reverse to get root → most specific order
  return {
    components: componentsBottomUp.reverse(),
    files: filesBottomUp.reverse(),
  };
}

