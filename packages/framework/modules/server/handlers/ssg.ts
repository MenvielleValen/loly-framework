import fs from "fs";
import path from "path";
import { Response } from "express";
import { createModuleLogger } from "@logger/index";

const logger = createModuleLogger("ssg");

/**
 * Gets the SSG directory path for a route.
 *
 * @param baseDir - Base SSG output directory
 * @param urlPath - URL path
 * @returns Directory path for the route
 */
export function getSsgDirForPath(baseDir: string, urlPath: string): string {
  const clean = urlPath === "/" ? "" : urlPath.replace(/^\/+/, "");
  return path.join(baseDir, clean);
}

/**
 * Gets the SSG HTML file path for a URL.
 *
 * @param baseDir - Base SSG output directory
 * @param urlPath - URL path
 * @returns HTML file path
 */
export function getSsgHtmlPath(baseDir: string, urlPath: string): string {
  const dir = getSsgDirForPath(baseDir, urlPath);
  return path.join(dir, "index.html");
}

/**
 * Gets the SSG data.json file path for a URL.
 *
 * @param baseDir - Base SSG output directory
 * @param urlPath - URL path
 * @returns Data JSON file path
 */
export function getSsgDataPath(baseDir: string, urlPath: string): string {
  const dir = getSsgDirForPath(baseDir, urlPath);
  return path.join(dir, "data.json");
}

/**
 * Attempts to serve SSG HTML if it exists.
 *
 * @param res - Express response object
 * @param ssgOutDir - SSG output directory
 * @param urlPath - URL path
 * @returns True if served, false if not found
 */
export function tryServeSsgHtml(
  res: Response,
  ssgOutDir: string,
  urlPath: string
): boolean {
  const ssgHtmlPath = getSsgHtmlPath(ssgOutDir, urlPath);

  if (!fs.existsSync(ssgHtmlPath)) {
    return false;
  }

  logger.info("Serving SSG HTML", { urlPath, ssgHtmlPath });

  // For SSG files, we need to allow 'unsafe-inline' since we can't generate nonces
  // for static HTML files. Override the CSP header set by Helmet.
  // Note: setHeader will override any existing header with the same name
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "script-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https:; " +
    "font-src 'self' data: https://fonts.gstatic.com; " +
    "object-src 'none'; " +
    "media-src 'self' https:; " +
    "frame-src 'none';"
  );

  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  const stream = fs.createReadStream(ssgHtmlPath, { encoding: "utf-8" });
  stream.pipe(res);
  return true;
}

/**
 * Attempts to serve SSG data.json if it exists.
 *
 * @param res - Express response object
 * @param ssgOutDir - SSG output directory
 * @param urlPath - URL path
 * @returns True if served, false if not found
 */
export function tryServeSsgData(
  res: Response,
  ssgOutDir: string,
  urlPath: string
): boolean {
  const ssgDataPath = getSsgDataPath(ssgOutDir, urlPath);

  if (!fs.existsSync(ssgDataPath)) {
    return false;
  }

  try {
    const raw = fs.readFileSync(ssgDataPath, "utf-8");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(200).end(raw);
    return true;
  } catch (err) {
    logger.error("Error reading SSG data", err, { urlPath, ssgDataPath });
    return false;
  }
}

