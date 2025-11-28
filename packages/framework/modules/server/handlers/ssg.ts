import fs from "fs";
import path from "path";
import { Response } from "express";

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

  console.log(`[framework][ssg] Serving SSG HTML for ${urlPath} from ${ssgHtmlPath}`);

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
    console.error("[framework][prod] Error reading SSG data:", err);
    return false;
  }
}

