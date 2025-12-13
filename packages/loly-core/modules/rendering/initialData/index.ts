import type { InitialData } from "../index.types";
import type { LoaderResult } from "@router/index";

/**
 * Builds InitialData in a consistent way.
 *
 * @param urlPath - URL path
 * @param params - Route parameters
 * @param loaderResult - Loader result
 * @returns Initial data object
 */
export function buildInitialData(
  urlPath: string,
  params: Record<string, string>,
  loaderResult: LoaderResult,
): InitialData {
  // Include theme in props so it's available to layouts and pages
  const props = {
    ...(loaderResult.props ?? {}),
    ...(loaderResult.theme ? { theme: loaderResult.theme } : {}),
  };
  
  return {
    pathname: urlPath,
    params,
    props,
    metadata: loaderResult.metadata ?? null,
    className: loaderResult.className,
    error: false,
    notFound: false,
  };
}
