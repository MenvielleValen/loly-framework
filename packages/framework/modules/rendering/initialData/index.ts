import { InitialData } from "../index.types";
import type { LoaderResult } from "@router/index";

/**
 * Construye InitialData de forma consistente
 */
export function buildInitialData(
  urlPath: string,
  params: Record<string, string>,
  loaderResult: LoaderResult
): InitialData {
  return {
    pathname: urlPath,
    params,
    props: loaderResult.props ?? {},
    metadata: loaderResult.metadata ?? null,
    className: loaderResult.className ?? "",
  };
}
