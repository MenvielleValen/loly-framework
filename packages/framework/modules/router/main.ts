/**
 * Router module - Legacy compatibility exports.
 * 
 * This file re-exports all router functionality from the refactored modules.
 * All functions have been moved to dedicated modules for better organization:
 * 
 * - `loader-pages.ts` - Page route loading
 * - `loader-api.ts` - API route loading
 * - `matcher.ts` - Route matching
 * - `manifest.ts` - Client manifest generation
 * - `path.ts` - Path and regex utilities
 * - `layout.ts` - Layout loading
 * - `loader.ts` - Server hook loading
 * 
 * @deprecated Import directly from `@router/index` instead of this file.
 * This file is kept for backward compatibility.
 */

// Re-export all public functions from the refactored modules
export {
  loadRoutes,
  loadApiRoutes,
  matchRoute,
  matchApiRoute,
  writeClientRoutesManifest,
  buildRoutePathFromDir,
  buildRegexFromRoutePath,
  loadLayoutsForDir,
  findLayoutFileInDir,
  loadLoaderForDir,
  loadRoutesFromManifest,
} from "./index";
