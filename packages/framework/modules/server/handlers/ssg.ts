import fs from "fs";
import path from "path";
import { Response } from "express";

/**
 * Obtiene el directorio SSG para una ruta.
 */
export function getSsgDirForPath(baseDir: string, urlPath: string): string {
  const clean = urlPath === "/" ? "" : urlPath.replace(/^\/+/, "");
  return path.join(baseDir, clean);
}

/**
 * Obtiene la ruta del HTML SSG para una URL.
 */
export function getSsgHtmlPath(baseDir: string, urlPath: string): string {
  const dir = getSsgDirForPath(baseDir, urlPath);
  return path.join(dir, "index.html");
}

/**
 * Obtiene la ruta del data.json SSG para una URL.
 */
export function getSsgDataPath(baseDir: string, urlPath: string): string {
  const dir = getSsgDirForPath(baseDir, urlPath);
  return path.join(dir, "data.json");
}

/**
 * Intenta servir el HTML SSG si existe.
 * Retorna true si se sirvió, false si no existe.
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

  console.log("[SSG]", urlPath);
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  const stream = fs.createReadStream(ssgHtmlPath, { encoding: "utf-8" });
  stream.pipe(res);
  return true;
}

/**
 * Intenta servir el data.json SSG si existe.
 * Retorna true si se sirvió, false si no existe.
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
    console.error("[framework][prod] Error leyendo SSG data:", err);
    return false;
  }
}

