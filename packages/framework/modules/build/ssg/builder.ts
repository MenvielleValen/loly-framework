import path from "path";
import type { LoadedRoute } from "@router/index";
import { buildPathFromPattern } from "./path";
import { renderStaticRoute } from "./renderer";
import { ensureDir } from "../utils";
import { BUILD_FOLDER_NAME } from "@constants/globals";

/**
 * Builds static pages for routes marked with `dynamic: "force-static"`.
 * 
 * For each static route:
 * 1. Calls `generateStaticParams()` to get all parameter combinations
 * 2. Renders each combination to HTML and data.json
 * 3. Writes files to `{BUILD_FOLDER_NAME}/ssg/{path}/index.html` and `data.json`
 * 
 * @param projectRoot - Root directory of the project
 * @param routes - Array of loaded routes
 * 
 * @example
 * await buildStaticPages('/path/to/project', routes);
 *
 */
export async function buildStaticPages(
  projectRoot: string,
  routes: LoadedRoute[]
): Promise<void> {
  const ssgOutDir = path.join(projectRoot, BUILD_FOLDER_NAME, "ssg");
  ensureDir(ssgOutDir);

  for (const route of routes) {
    // Only process routes marked as static
    if (route.dynamic !== "force-static") continue;

    let allParams: Array<Record<string, string>> = [];

    if (route.paramNames.length === 0) {
      allParams = [{}];
    } else {
      if (!route.generateStaticParams) {
        continue;
      }
      const sp = await route.generateStaticParams();
      allParams = sp;
    }
    for (const params of allParams) {
      const urlPath = buildPathFromPattern(route.pattern, params);
      await renderStaticRoute(projectRoot, ssgOutDir, route, urlPath, params);
    }
  }
}

