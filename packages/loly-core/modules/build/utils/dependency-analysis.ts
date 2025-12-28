import fs from "fs";
import path from "path";
import type { LoadedRoute } from "@router/index";
import { extractImports, resolveImportPath, filterLocalImports } from "./import-extractor";
import { isClientComponentFile } from "./detect-client-components";
import { isBarrelExportFile, resolveBarrelImportToClientComponents } from "./barrel-export-resolver";

/**
 * Options for dependency analysis.
 */
export interface AnalysisOptions {
  /**
   * Maximum depth for recursive analysis (1 = direct only, Infinity = full recursive).
   * Default: 1 (Phase 1 - direct only)
   */
  depth?: number;
  
  /**
   * Whether to follow barrel exports (re-exports).
   * Default: true
   */
  followBarrelExports?: boolean;
  
  /**
   * Whether to include transitive dependencies.
   * Default: false (Phase 1)
   */
  includeTransitive?: boolean;
  
  /**
   * Project root directory (for resolving aliases).
   */
  projectRoot?: string;
}

/**
 * Result of dependency analysis for a route.
 */
export interface RouteDependencies {
  /**
   * Route pattern (e.g., "/", "/blog/[slug]")
   */
  routePattern: string;
  
  /**
   * Client components imported directly in the page.
   */
  directClientComponents: string[];
  
  /**
   * Client components imported directly in layouts.
   */
  layoutClientComponents: string[];
  
  /**
   * All client components needed for this route (direct + layout).
   */
  allClientComponents: string[];
  
  /**
   * Chunk names required for this route.
   */
  requiredChunks: string[];
  
  /**
   * Transitive client components (for Phase 2+).
   * Only populated if includeTransitive is true.
   */
  transitiveClientComponents?: string[];
}

/**
 * Base interface for dependency analyzers.
 * Designed to be extensible for Phase 2 (recursive) and Phase 3 (optimized).
 */
export interface DependencyAnalyzer {
  /**
   * Analyzes dependencies for a route.
   * 
   * @param route - The route to analyze
   * @param options - Analysis options
   * @returns Route dependencies
   */
  analyze(route: LoadedRoute, options?: AnalysisOptions): RouteDependencies;
}

/**
 * Phase 1: Direct dependency analyzer.
 * 
 * Analyzes only direct imports in pages and layouts.
 * Does not follow Server Component → Server Component → Client Component chains.
 */
export class DirectDependencyAnalyzer implements DependencyAnalyzer {
  private cache = new Map<string, RouteDependencies>();
  
  analyze(route: LoadedRoute, options: AnalysisOptions = {}): RouteDependencies {
    // Check cache
    const cacheKey = `${route.pattern}-${JSON.stringify(options)}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }
    
    const projectRoot = options.projectRoot || this.findProjectRoot(route.pageFile);
    const followBarrel = options.followBarrelExports !== false;
    
    // Analyze page
    const pageClientComponents = this.analyzeFile(
      route.pageFile,
      projectRoot,
      followBarrel
    );
    
    // Analyze layouts
    const layoutClientComponents: string[] = [];
    for (const layoutFile of route.layoutFiles) {
      const layoutComps = this.analyzeFile(layoutFile, projectRoot, followBarrel);
      layoutClientComponents.push(...layoutComps);
    }
    
    // Combine all client components
    const allClientComponents = [
      ...new Set([...pageClientComponents, ...layoutClientComponents]),
    ];
    
    
    // Calculate required chunks (will be done later in manifest generation)
    const requiredChunks: string[] = [];
    
    const result: RouteDependencies = {
      routePattern: route.pattern,
      directClientComponents: pageClientComponents,
      layoutClientComponents: [...new Set(layoutClientComponents)],
      allClientComponents,
      requiredChunks,
    };
    
    // Cache result
    this.cache.set(cacheKey, result);
    
    return result;
  }
  
  /**
   * Analyzes a single file for client component imports.
   */
  private analyzeFile(
    filePath: string,
    projectRoot: string,
    followBarrel: boolean
  ): string[] {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    
    
    const clientComponents: string[] = [];
    const imports = extractImports(filePath);
    
    const localImports = filterLocalImports(imports, filePath, projectRoot);
    for (const imp of localImports) {
      const resolved = resolveImportPath(imp.importPath, filePath, projectRoot);
      if (!resolved) continue;
      
      // Check if it's a barrel export
      if (followBarrel && isBarrelExportFile(resolved)) {
        const barrelComponents = resolveBarrelImportToClientComponents(
          imp.importPath,
          filePath,
          projectRoot
        );
        clientComponents.push(...barrelComponents);
        continue;
      }
      
      // Check if it's a direct client component (by filename extension)
      if (isClientComponentFile(resolved)) {
        clientComponents.push(resolved);
      }
    }
    
    return [...new Set(clientComponents)]; // Remove duplicates
  }
  
  /**
   * Finds project root by looking for package.json.
   */
  private findProjectRoot(startPath: string): string {
    let current = path.resolve(startPath);
    
    while (current !== path.dirname(current)) {
      if (fs.existsSync(path.join(current, "package.json"))) {
        return current;
      }
      current = path.dirname(current);
    }
    
    return path.dirname(startPath);
  }
  
  /**
   * Clears the analysis cache.
   */
  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * Phase 2: Recursive dependency analyzer.
 * 
 * Analiza imports locales recursivamente (Server -> Server -> Client),
 * siguiendo barrels si se solicita. Evita ciclos con un conjunto de visitados.
 */
export class RecursiveDependencyAnalyzer implements DependencyAnalyzer {
  private cache = new Map<string, RouteDependencies>();

  analyze(route: LoadedRoute, options: AnalysisOptions = {}): RouteDependencies {
    const cacheKey = `${route.pattern}-recursive-${JSON.stringify(options)}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const projectRoot = options.projectRoot || this.findProjectRoot(route.pageFile);
    const followBarrel = options.followBarrelExports !== false;
    const maxDepth = options.depth ?? Infinity;

    const seen = new Set<string>();

    const pageClientComponents = this.analyzeFileRecursive(
      route.pageFile,
      projectRoot,
      followBarrel,
      0,
      maxDepth,
      seen
    );

    const layoutClientComponents: string[] = [];
    for (const layoutFile of route.layoutFiles) {
      layoutClientComponents.push(
        ...this.analyzeFileRecursive(
          layoutFile,
          projectRoot,
          followBarrel,
          0,
          maxDepth,
          seen
        )
      );
    }

    const allClientComponents = [
      ...new Set([...pageClientComponents, ...layoutClientComponents]),
    ];

    const result: RouteDependencies = {
      routePattern: route.pattern,
      directClientComponents: pageClientComponents,
      layoutClientComponents: [...new Set(layoutClientComponents)],
      allClientComponents,
      requiredChunks: [],
      transitiveClientComponents: allClientComponents,
    };

    this.cache.set(cacheKey, result);
    return result;
  }

  private analyzeFileRecursive(
    filePath: string,
    projectRoot: string,
    followBarrel: boolean,
    depth: number,
    maxDepth: number,
    seen: Set<string>
  ): string[] {
    if (!filePath || !fs.existsSync(filePath)) {
      return [];
    }

    const normPath = path.resolve(filePath);
    if (seen.has(normPath)) return [];
    seen.add(normPath);

    const clientComponents: string[] = [];
    const imports = extractImports(filePath);
    const localImports = filterLocalImports(imports, filePath, projectRoot);

    for (const imp of localImports) {
      const resolved = resolveImportPath(imp.importPath, filePath, projectRoot);
      if (!resolved) continue;

      // Barrel re-exports
      if (followBarrel && isBarrelExportFile(resolved)) {
        const barrelComponents = resolveBarrelImportToClientComponents(
          imp.importPath,
          filePath,
          projectRoot
        );
        clientComponents.push(...barrelComponents);
        continue;
      }

      if (isClientComponentFile(resolved)) {
        clientComponents.push(resolved);
        continue;
      }

      // Recurse into non-client local modules if depth allows
      if (depth + 1 <= maxDepth) {
        clientComponents.push(
          ...this.analyzeFileRecursive(
            resolved,
            projectRoot,
            followBarrel,
            depth + 1,
            maxDepth,
            seen
          )
        );
      }
    }

    return [...new Set(clientComponents)];
  }

  private findProjectRoot(startPath: string): string {
    let current = path.resolve(startPath);
    while (current !== path.dirname(current)) {
      if (fs.existsSync(path.join(current, "package.json"))) {
        return current;
      }
      current = path.dirname(current);
    }
    return path.dirname(startPath);
  }

  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * Creates a dependency analyzer based on the analysis mode.
 * 
 * @param mode - Analysis mode ("direct" for Phase 1, "recursive" for Phase 2, etc.)
 * @returns Dependency analyzer instance
 */
export function createDependencyAnalyzer(
  mode: "direct" | "recursive" | "optimized" = "direct"
): DependencyAnalyzer {
  switch (mode) {
    case "direct":
      return new DirectDependencyAnalyzer();
    case "recursive":
      return new RecursiveDependencyAnalyzer();
    // Phase 3: case "optimized": return new OptimizedDependencyAnalyzer();
    default:
      return new DirectDependencyAnalyzer();
  }
}

/**
 * Analyzes dependencies for all routes.
 * 
 * @param routes - Array of loaded routes
 * @param options - Analysis options
 * @returns Map of route pattern to dependencies
 */
export function analyzeAllRouteDependencies(
  routes: LoadedRoute[],
  options: AnalysisOptions = {}
): Map<string, RouteDependencies> {
  const analyzer = createDependencyAnalyzer(
    options.includeTransitive ? "recursive" : "direct"
  );
  
  const dependencies = new Map<string, RouteDependencies>();
  
  for (const route of routes) {
    const deps = analyzer.analyze(route, options);
    dependencies.set(route.pattern, deps);
  }
  
  return dependencies;
}

