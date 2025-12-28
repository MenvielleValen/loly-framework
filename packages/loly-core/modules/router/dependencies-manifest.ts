import fs from "fs";
import path from "path";
import type { LoadedRoute } from "./index.types";
import { BUILD_FOLDER_NAME } from "@constants/globals";
import { analyzeAllRouteDependencies, type RouteDependencies } from "@build/utils/dependency-analysis";
import { isClientComponent } from "@build/utils/detect-client-components";
import { getChunkNameForComponent } from "@build/utils/client-component-chunk-name";

/**
 * Manifest entry for route dependencies.
 */
export interface RouteDependenciesEntry {
  /**
   * Main chunk for the route (page + layouts)
   */
  mainChunk: string;
  
  /**
   * Whether the page itself is a client component
   */
  isPageClientComponent?: boolean;
  
  /**
   * File path of the page (if it's a client component)
   */
  pageFilePath?: string;
  
  /**
   * Client components imported directly in the page
   */
  directClientComponents: string[];
  
  /**
   * Client components imported in layouts
   */
  layoutClientComponents: string[];
  
  /**
   * Whether each layout is a client component (array matching layoutFiles order)
   */
  isLayoutClientComponent?: boolean[];
  
  /**
   * File paths of layouts that are client components (array matching layoutFiles order)
   */
  layoutFilePaths?: string[];
  
  /**
   * All client components needed (direct + layout + page if client)
   */
  allClientComponents: string[];
  
  /**
   * Chunk names for client components
   */
  clientComponentChunks: string[];
  
  /**
   * All chunks required for this route (main + client components)
   */
  allChunks: string[];
}

/**
 * Dependencies manifest structure.
 */
export interface RouteDependenciesManifest {
  version: 1;
  routes: {
    [pattern: string]: RouteDependenciesEntry;
  };
}

/**
 * Generates the dependencies manifest for all routes.
 * 
 * @param routes - Array of loaded routes
 * @param projectRoot - Root directory of the project
 * @param chunkMap - Map of route patterns to chunk names
 */
export function generateDependenciesManifest(
  routes: LoadedRoute[],
  projectRoot: string,
  chunkMap: Record<string, string>
): void {
  const fwDir = path.join(projectRoot, BUILD_FOLDER_NAME);
  if (!fs.existsSync(fwDir)) {
    fs.mkdirSync(fwDir, { recursive: true });
  }
  
  // Analyze dependencies for all routes
  const routeDependencies = analyzeAllRouteDependencies(routes, {
    projectRoot,
    depth: Infinity, // full recursive
    followBarrelExports: true,
    includeTransitive: true,
  });
  
  // Build manifest
  const manifest: RouteDependenciesManifest = {
    version: 1,
    routes: {},
  };
  
  // Create a map of route patterns to LoadedRoute for quick lookup
  const routeMap = new Map<string, LoadedRoute>();
  for (const route of routes) {
    routeMap.set(route.pattern, route);
  }
  
  for (const [pattern, deps] of routeDependencies.entries()) {
    const mainChunk = chunkMap[pattern] || `route-${pattern.replace(/\//g, "-")}`;
    const route = routeMap.get(pattern);
    
    // Check if the page itself is a client component
    const isPageClientComponent = route?.pageFile ? isClientComponent(route.pageFile) : false;
    const pageFilePath = isPageClientComponent && route?.pageFile
      ? path.relative(projectRoot, route.pageFile).replace(/\\/g, "/")
      : undefined;
    
    // Check which layouts are client components
    const isLayoutClientComponent = route?.layoutFiles
      ? route.layoutFiles.map(lf => isClientComponent(lf))
      : [];
    const layoutFilePaths = route?.layoutFiles
      ? route.layoutFiles
          .map((lf, i) => isLayoutClientComponent[i] ? path.relative(projectRoot, lf).replace(/\\/g, "/") : undefined)
          .filter((p): p is string => p !== undefined)
      : [];
    
    // Map client components to chunks
    const clientComponentChunks = deps.allClientComponents.map(cc =>
      getChunkNameForComponent(cc, projectRoot)
    );
    
    // Combine all chunks
    const allChunks = [mainChunk, ...clientComponentChunks];
    
    // Convert absolute paths to relative paths for manifest
    const toRelative = (absPath: string) => {
      try {
        return path.relative(projectRoot, absPath).replace(/\\/g, "/");
      } catch {
        return absPath;
      }
    };
    
    manifest.routes[pattern] = {
      mainChunk,
      isPageClientComponent,
      pageFilePath,
      directClientComponents: deps.directClientComponents.map(toRelative),
      layoutClientComponents: deps.layoutClientComponents.map(toRelative),
      isLayoutClientComponent: isLayoutClientComponent.length > 0 ? isLayoutClientComponent : undefined,
      layoutFilePaths: layoutFilePaths.length > 0 ? layoutFilePaths : undefined,
      allClientComponents: deps.allClientComponents.map(toRelative),
      clientComponentChunks,
      allChunks: [...new Set(allChunks)], // Remove duplicates
    };
  }
  
  // Save manifest
  const manifestPath = path.join(fwDir, "route-dependencies.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");

  // Also generate client component loaders manifest (functions, bundler-safe)
  writeClientComponentLoadersManifest(projectRoot, manifest);
}

/**
 * Writes a bundler-safe client component loaders manifest.
 *
 * Why: Rspack/Webpack cannot reliably do `import(variableString)` at runtime; it becomes
 * a context import that throws MODULE_NOT_FOUND (exactly the error you're seeing).
 *
 * This file generates static loader functions like:
 *   "components/x.client.tsx": () => import("../components/x.client")
 *
 * The bundler sees these imports at build-time and produces chunks correctly.
 */
function writeClientComponentLoadersManifest(
  projectRoot: string,
  depsManifest: RouteDependenciesManifest
): void {
  const fwDir = path.join(projectRoot, BUILD_FOLDER_NAME);
  if (!fs.existsSync(fwDir)) {
    fs.mkdirSync(fwDir, { recursive: true });
  }

  const outFile = path.join(fwDir, "client-components-loaders.ts");

  const all = new Set<string>();
  for (const entry of Object.values(depsManifest.routes || {})) {
    for (const p of entry.allClientComponents || []) {
      all.add(p);
    }
    if (entry.pageFilePath) {
      all.add(entry.pageFilePath);
    }
    for (const lp of entry.layoutFilePaths || []) {
      all.add(lp);
    }
  }

  const sorted = Array.from(all).filter(Boolean).sort();

  const toImportPath = (relativeFromProjectRoot: string): string => {
    const abs = path.join(projectRoot, relativeFromProjectRoot);
    const relRaw = path.relative(fwDir, abs).replace(/\\/g, "/");
    const rel = relRaw.startsWith(".") ? relRaw : "./" + relRaw;
    // Remove extension so bundler can resolve .tsx/.ts/.jsx/.js
    return rel.replace(/\.(tsx|ts|jsx|js)$/, "");
  };

  const lines: string[] = [];
  lines.push(`export type ClientComponentLoader = () => Promise<any>;`);
  lines.push(`export const clientComponentLoaders: Record<string, ClientComponentLoader> = {`);

  for (const relPath of sorted) {
    const abs = path.join(projectRoot, relPath);
    const chunkName = getChunkNameForComponent(abs, projectRoot);
    const importPath = toImportPath(relPath);
    lines.push(
      `  ${JSON.stringify(relPath)}: () => import(/* webpackChunkName: "${chunkName}" */ ${JSON.stringify(importPath)}),`
    );
  }

  lines.push(`};`);
  lines.push("");

  fs.writeFileSync(outFile, lines.join("\n"), "utf-8");
}

/**
 * Loads the dependencies manifest.
 * 
 * @param projectRoot - Root directory of the project
 * @returns Dependencies manifest or null if not found
 */
export function loadDependenciesManifest(
  projectRoot: string
): RouteDependenciesManifest | null {
  const manifestPath = path.join(projectRoot, BUILD_FOLDER_NAME, "route-dependencies.json");
  
  if (!fs.existsSync(manifestPath)) {
    return null;
  }
  
  try {
    const content = fs.readFileSync(manifestPath, "utf-8");
    return JSON.parse(content) as RouteDependenciesManifest;
  } catch (error) {
    console.warn("[framework] Failed to load dependencies manifest:", error);
    return null;
  }
}

