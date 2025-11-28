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
        console.warn(
          `[framework][ssg] Route ${route.pattern} is marked as force-static but has no generateStaticParams function. Skipping.`
        );
        continue;
      }
      
      try {
        console.log(`[framework][ssg] Generating static params for route: ${route.pattern}`);
        
        // Add timeout to detect hanging
        let timeoutId: NodeJS.Timeout | null = null;
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error(`generateStaticParams for route ${route.pattern} timed out after 30 seconds`));
          }, 30000);
        });
        
        const sp = await Promise.race([
          route.generateStaticParams(),
          timeoutPromise
        ]) as Array<Record<string, string>>;
        
        // Clear timeout if it's still pending
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        allParams = sp;
        console.log(`[framework][ssg] Generated ${sp.length} static params for route: ${route.pattern}`);
      } catch (error) {
        console.error(
          `[framework][ssg] Error generating static params for route ${route.pattern}:`,
          error
        );
        throw error;
      }
    }
    for (const params of allParams) {
      const urlPath = buildPathFromPattern(route.pattern, params);
      await renderStaticRoute(projectRoot, ssgOutDir, route, urlPath, params);
    }
  }
  
  console.log(`[framework][ssg] Finished building all static pages`);
}

