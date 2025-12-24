import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getBuildDir, type FrameworkConfig } from "@src/config";

/**
 * Generates a hash for cache key based on image source and optimization parameters.
 */
export function generateCacheKey(
  src: string,
  width?: number,
  height?: number,
  quality?: number,
  format?: string
): string {
  const data = `${src}-${width || ""}-${height || ""}-${quality || ""}-${format || ""}`;
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Gets the cache directory path for optimized images.
 */
export function getCacheDir(projectRoot: string, config: FrameworkConfig): string {
  const buildDir = getBuildDir(projectRoot, config);
  return path.join(buildDir, "cache", "images");
}

/**
 * Ensures the cache directory exists.
 */
export function ensureCacheDir(cacheDir: string): void {
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
}

/**
 * Gets the cached image file path if it exists.
 */
export function getCachedImagePath(
  cacheKey: string,
  extension: string,
  cacheDir: string
): string {
  return path.join(cacheDir, `${cacheKey}.${extension}`);
}

/**
 * Checks if a cached image exists.
 */
export function hasCachedImage(
  cacheKey: string,
  extension: string,
  cacheDir: string
): boolean {
  const cachedPath = getCachedImagePath(cacheKey, extension, cacheDir);
  return fs.existsSync(cachedPath);
}

/**
 * Reads a cached image from disk.
 */
export function readCachedImage(
  cacheKey: string,
  extension: string,
  cacheDir: string
): Buffer | null {
  const cachedPath = getCachedImagePath(cacheKey, extension, cacheDir);
  
  try {
    if (fs.existsSync(cachedPath)) {
      return fs.readFileSync(cachedPath);
    }
  } catch (error) {
    // If read fails, return null (cache miss)
    console.warn(`[image-optimizer] Failed to read cached image: ${cachedPath}`, error);
  }
  
  return null;
}

/**
 * Writes an optimized image to cache.
 */
export function writeCachedImage(
  cacheKey: string,
  extension: string,
  cacheDir: string,
  imageBuffer: Buffer
): void {
  ensureCacheDir(cacheDir);
  const cachedPath = getCachedImagePath(cacheKey, extension, cacheDir);
  
  try {
    fs.writeFileSync(cachedPath, imageBuffer);
  } catch (error) {
    console.warn(`[image-optimizer] Failed to write cached image: ${cachedPath}`, error);
  }
}

/**
 * Gets the MIME type for a given image format/extension.
 */
export function getImageMimeType(format: string): string {
  const formatMap: Record<string, string> = {
    webp: "image/webp",
    avif: "image/avif",
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    svg: "image/svg+xml",
  };
  
  const normalized = format.toLowerCase();
  return formatMap[normalized] || "image/jpeg";
}

/**
 * Gets the file extension from a MIME type or format string.
 */
export function getImageExtension(format: string): string {
  const formatMap: Record<string, string> = {
    "image/webp": "webp",
    "image/avif": "avif",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/svg+xml": "svg",
    webp: "webp",
    avif: "avif",
    jpeg: "jpg",
    jpg: "jpg",
    png: "png",
    gif: "gif",
    svg: "svg",
  };
  
  const normalized = format.toLowerCase();
  return formatMap[normalized] || "jpg";
}

