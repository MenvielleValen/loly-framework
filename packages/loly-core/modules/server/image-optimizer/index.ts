import sharp from "sharp";
import fs from "fs";
import path from "path";
import { getStaticDir, type FrameworkConfig, type ImageConfig } from "@src/config";
import {
  isRemoteUrl,
  validateRemoteUrl,
  sanitizeImagePath,
  validateImageDimensions,
  validateQuality,
} from "./validation";
import {
  generateCacheKey,
  getCacheDir,
  hasCachedImage,
  readCachedImage,
  writeCachedImage,
  getImageExtension,
  getImageMimeType,
} from "./cache";

export interface OptimizeImageOptions {
  src: string;
  width?: number;
  height?: number;
  quality?: number;
  format?: "webp" | "avif" | "jpeg" | "png" | "auto";
  fit?: "contain" | "cover" | "fill" | "inside" | "outside";
}

export interface OptimizedImageResult {
  buffer: Buffer;
  format: string;
  mimeType: string;
  width: number;
  height: number;
}

/**
 * Downloads a remote image with timeout.
 */
async function downloadRemoteImage(url: string, timeout: number = 10000): Promise<Buffer> {
  // Use native fetch if available (Node 18+), otherwise use undici
  let fetchFn: (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
  
  try {
    // Try to use global fetch (Node 18+)
    if (typeof fetch !== "undefined") {
      fetchFn = fetch as unknown as typeof fetch;
    } else {
      // Fallback to undici
      const { fetch: undiciFetch } = await import("undici");
      fetchFn = undiciFetch as unknown as typeof fetch;
    }
  } catch (error) {
    throw new Error("Failed to load fetch implementation. Node 18+ required or install undici.");
  }
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetchFn(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Loly-Image-Optimizer/1.0",
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Image download timeout after ${timeout}ms`);
    }
    throw error;
  }
}

/**
 * Reads a local image file.
 */
function readLocalImage(src: string, projectRoot: string, config: FrameworkConfig): Buffer {
  // Sanitize path to prevent path traversal
  const sanitized = sanitizeImagePath(src);
  
  // Try static directory first
  const staticDir = getStaticDir(projectRoot, config);
  const staticPath = path.join(staticDir, sanitized);
  
  if (fs.existsSync(staticPath)) {
    return fs.readFileSync(staticPath);
  }
  
  // Try as absolute path (if src starts with /)
  if (src.startsWith("/")) {
    const absolutePath = path.join(projectRoot, sanitized);
    if (fs.existsSync(absolutePath)) {
      return fs.readFileSync(absolutePath);
    }
  }
  
  throw new Error(`Image not found: ${src}`);
}

/**
 * Determines the best output format based on config and source format.
 */
function determineOutputFormat(
  sourceFormat: string,
  requestedFormat: "webp" | "avif" | "jpeg" | "png" | "auto" | undefined,
  config: ImageConfig
): string {
  // Handle SVG separately (will be checked later)
  if (sourceFormat === "svg") {
    return "svg";
  }
  
  if (requestedFormat && requestedFormat !== "auto") {
    return requestedFormat;
  }
  
  // Use first supported format from config
  const supportedFormats = config.formats || ["image/webp"];
  
  // Prefer AVIF if supported, then WebP
  if (supportedFormats.includes("image/avif")) {
    return "avif";
  }
  if (supportedFormats.includes("image/webp")) {
    return "webp";
  }
  
  // Fallback to original format (but not SVG)
  return sourceFormat === "svg" ? "jpeg" : sourceFormat;
}

/**
 * Optimizes an image using Sharp.
 */
export async function optimizeImage(
  options: OptimizeImageOptions,
  projectRoot: string,
  config: FrameworkConfig
): Promise<OptimizedImageResult> {
  const imageConfig = config.images || {};
  
  // Validate dimensions
  const dimValidation = validateImageDimensions(options.width, options.height, imageConfig);
  if (!dimValidation.valid) {
    throw new Error(dimValidation.error);
  }
  
  // Validate quality
  const qualityValidation = validateQuality(options.quality);
  if (!qualityValidation.valid) {
    throw new Error(qualityValidation.error);
  }
  
  // Validate remote URL if needed
  if (isRemoteUrl(options.src)) {
    if (!validateRemoteUrl(options.src, imageConfig)) {
      throw new Error(`Remote image domain not allowed: ${options.src}`);
    }
  }
  
  // Determine output format
  const sourceFormat = path.extname(options.src).slice(1).toLowerCase() || "jpeg";
  const outputFormat = determineOutputFormat(
    sourceFormat,
    options.format,
    imageConfig
  );
  
  // Generate cache key
  const cacheKey = generateCacheKey(
    options.src,
    options.width,
    options.height,
    options.quality || imageConfig.quality || 75,
    outputFormat
  );
  
  const cacheDir = getCacheDir(projectRoot, config);
  const extension = getImageExtension(outputFormat);
  
  // Check cache first
  if (hasCachedImage(cacheKey, extension, cacheDir)) {
    const cached = readCachedImage(cacheKey, extension, cacheDir);
    if (cached) {
      // Get dimensions from cached image metadata
      const metadata = await sharp(cached).metadata();
      return {
        buffer: cached,
        format: outputFormat,
        mimeType: getImageMimeType(outputFormat),
        width: metadata.width || options.width || 0,
        height: metadata.height || options.height || 0,
      };
    }
  }
  
  // Load image
  let imageBuffer: Buffer;
  if (isRemoteUrl(options.src)) {
    imageBuffer = await downloadRemoteImage(options.src);
  } else {
    imageBuffer = readLocalImage(options.src, projectRoot, config);
  }
  
  // Handle SVG separately (Sharp doesn't process SVG)
  if (outputFormat === "svg" || sourceFormat === "svg") {
    if (!imageConfig.dangerouslyAllowSVG) {
      throw new Error("SVG images are not allowed. Set images.dangerouslyAllowSVG to true to enable.");
    }
    // Return SVG as-is (no optimization)
    return {
      buffer: imageBuffer,
      format: "svg",
      mimeType: "image/svg+xml",
      width: options.width || 0,
      height: options.height || 0,
    };
  }
  
  // Process with Sharp
  let sharpInstance = sharp(imageBuffer);
  
  // Get metadata
  const metadata = await sharpInstance.metadata();
  
  // Resize if needed
  if (options.width || options.height) {
    const fit = options.fit || "cover";
    sharpInstance = sharpInstance.resize(options.width, options.height, {
      fit,
      withoutEnlargement: true,
    });
  }
  
  // Convert format and apply quality
  const quality = options.quality || imageConfig.quality || 75;
  
  switch (outputFormat) {
    case "webp":
      sharpInstance = sharpInstance.webp({ quality });
      break;
    case "avif":
      sharpInstance = sharpInstance.avif({ quality });
      break;
    case "jpeg":
    case "jpg":
      sharpInstance = sharpInstance.jpeg({ quality });
      break;
    case "png":
      sharpInstance = sharpInstance.png({ quality: Math.round(quality / 100 * 9) });
      break;
    default:
      sharpInstance = sharpInstance.jpeg({ quality });
  }
  
  // Generate optimized image
  const optimizedBuffer = await sharpInstance.toBuffer();
  
  // Get final dimensions
  const finalMetadata = await sharp(optimizedBuffer).metadata();
  
  // Cache the result
  writeCachedImage(cacheKey, extension, cacheDir, optimizedBuffer);
  
  return {
    buffer: optimizedBuffer,
    format: outputFormat,
    mimeType: getImageMimeType(outputFormat),
    width: finalMetadata.width || options.width || metadata.width || 0,
    height: finalMetadata.height || options.height || metadata.height || 0,
  };
}

