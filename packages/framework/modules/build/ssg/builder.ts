import path from "path";
import type { LoadedRoute } from "@router/index";
import { buildPathFromPattern } from "./path";
import { renderStaticRoute } from "./renderer";
import { ensureDir } from "../utils";

/**
 * Builds static pages for routes marked with `dynamic: "force-static"`.
 * 
 * For each static route:
 * 1. Calls `generateStaticParams()` to get all parameter combinations
 * 2. Renders each combination to HTML and data.json
 * 3. Writes files to `.fw/ssg/{path}/index.html` and `data.json`
 * 
 * @param projectRoot - Root directory of the project
 * @param routes - Array of loaded routes
 * 
 * @example
 * await buildStaticPages('/path/to/project', routes);
 * // Static pages generated in .fw/ssg
 */
export async function buildStaticPages(
  projectRoot: string,
  routes: LoadedRoute[]
): Promise<void> {
  const ssgOutDir = path.join(projectRoot, ".fw", "ssg");
  ensureDir(ssgOutDir);

  for (const route of routes) {
    // Only process routes marked as static
    if (route.dynamic !== "force-static") continue;

    let allParams: Array<Record<string, string>> = [];

    // Routes without parameters
    if (route.paramNames.length === 0) {
      allParams = [{}];
    }
    // Routes with parameters need generateStaticParams
    else {
      if (!route.generateStaticParams) {
        console.warn(
          `[framework][ssg] Route ${route.pattern} is force-static but doesn't define generateStaticParams, skipping.`
        );
        continue;
      }
      const sp = await route.generateStaticParams();
      allParams = sp;
    }

    // Render each parameter combination
    for (const params of allParams) {
      const urlPath = buildPathFromPattern(route.pattern, params);
      await renderStaticRoute(projectRoot, ssgOutDir, route, urlPath, params);
    }
  }

  console.log("[framework][ssg] SSG build complete.");
}

