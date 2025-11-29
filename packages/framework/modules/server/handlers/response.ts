import { Response } from "express";
import { LoaderResult } from "@router/index";

/**
 * Handles data request responses (JSON).
 *
 * @param res - Express response object
 * @param loaderResult - Loader result
 * @param theme - Optional theme value to include in response
 */
export function handleDataResponse(
  res: Response,
  loaderResult: LoaderResult,
  theme?: string
): void {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (loaderResult.redirect) {
    res.statusCode = 200;
    res.end(JSON.stringify({ redirect: loaderResult.redirect }));
    return;
  }

  if (loaderResult.notFound) {
    res.statusCode = 404;
    res.end(JSON.stringify({ notFound: true }));
    return;
  }

  res.statusCode = 200;
  res.end(
    JSON.stringify({
      props: loaderResult.props ?? {},
      metadata: loaderResult.metadata ?? null,
      theme: loaderResult.theme ?? theme ?? null,
    })
  );
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

