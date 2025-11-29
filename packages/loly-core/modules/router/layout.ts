import fs from "fs";
import path from "path";
import { LayoutComponent } from "./index.types";
import { LAYOUT_FILE_BASENAME } from "./constants";

/**
 * Finds a layout file in the given directory.
 * 
 * Checks for layout files in this order:
 * 1. layout.tsx
 * 2. layout.ts
 * 3. layout.jsx
 * 4. layout.js
 * 
 * @param dir - Directory to search for layout file
 * @returns Full path to layout file, or null if not found
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
 * 
 * Walks up from the page directory to the app root, collecting layouts
 * at each level. Returns layouts in order from root to most specific.
 * 
 * @param pageDir - Directory containing the page file
 * @param appDir - Root app directory
 * @returns Object with layout components and their file paths
 * 
 * @example
 * // app/layout.tsx (root)
 * // app/blog/layout.tsx (blog)
 * // app/blog/[slug]/page.tsx (page)
 * 
 * loadLayoutsForDir('app/blog/[slug]', 'app')
 * // Returns: [RootLayout, BlogLayout] (in that order)
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

