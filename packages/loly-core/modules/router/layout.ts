import fs from "fs";
import path from "path";
import { LayoutComponent } from "./index.types";
import { LAYOUT_FILE_BASENAME } from "./constants";
import { isRouteGroup } from "./path";

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
 * Includes layouts from route groups (directories in parentheses).
 * Returns layouts in order from root to most specific: root → route group → nested → page.
 * 
 * @param pageDir - Directory containing the page file
 * @param appDir - Root app directory
 * @returns Object with layout components and files in order from root to most specific
 * 
 * @example
 * // For app/(dashboard)/settings/page.tsx:
 * // Returns layouts from: app/layout.tsx, app/(dashboard)/layout.tsx, app/(dashboard)/settings/layout.tsx (if exists)
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
  // This ensures: root layout → route group layouts → nested layouts → page-specific layouts
  return {
    components: componentsBottomUp.reverse(),
    files: filesBottomUp.reverse(),
  };
}

