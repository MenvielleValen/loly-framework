import { Response } from "express";
import { LoaderResult } from "@router/index";

/**
 * Handles data request responses (JSON).
 *
 * @param res - Express response object
 * @param loaderResult - Loader result
 * @param theme - Optional theme value to include in response
 * @param layoutProps - Optional layout props (only included when layout hooks were executed)
 * @param pageProps - Optional page props (always included in data requests)
 * @param error - Optional error flag to include in response
 * @param message - Optional error message to include in response
 */
export function handleDataResponse(
  res: Response,
  loaderResult: LoaderResult,
  theme?: string,
  layoutProps?: Record<string, unknown> | null,
  pageProps?: Record<string, unknown> | null,
  error?: boolean,
  message?: string
): void {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  // Build response with separated props if provided, otherwise use combined props
  const response: Record<string, unknown> = {
    // Combined props for backward compatibility
    props: loaderResult.props ?? {},
    metadata: loaderResult.metadata ?? null,
    theme: loaderResult.theme ?? theme ?? null,
    // Include pathname if provided (for rewrites - client needs to know the rewritten path)
    ...(loaderResult.pathname ? { pathname: loaderResult.pathname } : {}),
  };

  // Include separated props if provided (layoutProps only when layout hooks were executed)
  if (layoutProps !== undefined && layoutProps !== null) {
    response.layoutProps = layoutProps;
  }
  if (pageProps !== undefined && pageProps !== null) {
    response.pageProps = pageProps;
  }

  // Include error information if provided
  if (error !== undefined) {
    response.error = error;
  }
  if (message !== undefined) {
    response.message = message;
  }

  res.statusCode = error ? 500 : 200;
  res.end(JSON.stringify(response));
}

/**
 * Handles redirects for HTML responses.
 *
 * @param res - Express response object
 * @param redirect - Redirect configuration
 */
export function handleRedirect(
  res: Response,
  redirect: { destination: string; permanent?: boolean }
): void {
  const { destination, permanent } = redirect;
  res.redirect(permanent ? 301 : 302, destination);
}

/**
 * Handles not found responses for HTML.
 *
 * @param res - Express response object
 * @param urlPath - Optional URL path for error message
 */
export function handleNotFound(res: Response, urlPath?: string): void {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  if (urlPath) {
    res.end(`<h1>404 - Not Found</h1><p>Route not found: ${urlPath}</p>`);
  } else {
    res.end("<h1>404 - Not Found</h1>");
  }
}

