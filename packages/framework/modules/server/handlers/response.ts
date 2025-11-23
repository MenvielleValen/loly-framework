import { Response } from "express";
import { LoaderResult } from "@router/index";

/**
 * Maneja respuestas de data request (JSON).
 */
export function handleDataResponse(
  res: Response,
  loaderResult: LoaderResult
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
    })
  );
}

/**
 * Maneja redirects para HTML.
 */
export function handleRedirect(
  res: Response,
  redirect: { destination: string; permanent?: boolean }
): void {
  const { destination, permanent } = redirect;
  res.redirect(permanent ? 301 : 302, destination);
}

/**
 * Maneja notFound para HTML.
 */
export function handleNotFound(res: Response, urlPath?: string): void {
  res.statusCode = 404;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  if (urlPath) {
    res.end(`<h1>404 - Not Found</h1><p>No se encontró ruta para ${urlPath}</p>`);
  } else {
    res.end("<h1>404 - Not Found</h1>");
  }
}

