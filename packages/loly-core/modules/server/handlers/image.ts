import { Request, Response } from "express";
import { optimizeImage } from "../image-optimizer";
import type { FrameworkConfig } from "@src/config";

export interface ImageHandlerOptions {
  req: Request;
  res: Response;
  projectRoot: string;
  config: FrameworkConfig;
}

/**
 * Handles image optimization requests.
 * Endpoint: /_loly/image?src=...&w=800&h=600&q=75&format=webp
 */
export async function handleImageRequest(options: ImageHandlerOptions): Promise<void> {
  const { req, res, projectRoot, config } = options;
  
  try {
    // Parse query parameters
    const src = req.query.src as string;
    const width = req.query.w ? parseInt(req.query.w as string, 10) : undefined;
    const height = req.query.h ? parseInt(req.query.h as string, 10) : undefined;
    const quality = req.query.q ? parseInt(req.query.q as string, 10) : undefined;
    const format = req.query.format as "webp" | "avif" | "jpeg" | "png" | "auto" | undefined;
    const fit = req.query.fit as "contain" | "cover" | "fill" | "inside" | "outside" | undefined;
    
    // Validate required parameters
    if (!src) {
      res.status(400).json({
        error: "Missing required parameter: src",
      });
      return;
    }
    
    // Validate src is a string
    if (typeof src !== "string") {
      res.status(400).json({
        error: "Parameter 'src' must be a string",
      });
      return;
    }
    
    // Optimize image
    const result = await optimizeImage(
      {
        src,
        width,
        height,
        quality,
        format,
        fit,
      },
      projectRoot,
      config
    );
    
    // Set headers
    const imageConfig = config.images || {};
    const cacheTTL = imageConfig.minimumCacheTTL || 60;
    
    res.setHeader("Content-Type", result.mimeType);
    res.setHeader("Content-Length", result.buffer.length);
    res.setHeader("Cache-Control", `public, max-age=${cacheTTL}, immutable`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    
    // Send image
    res.send(result.buffer);
  } catch (error) {
    // Handle different error types
    if (error instanceof Error) {
      // Domain not allowed
      if (error.message.includes("not allowed")) {
        res.status(403).json({
          error: "Forbidden",
          message: error.message,
        });
        return;
      }
      
      // Image not found
      if (error.message.includes("not found") || error.message.includes("Image not found")) {
        res.status(404).json({
          error: "Not Found",
          message: error.message,
        });
        return;
      }
      
      // Validation errors
      if (error.message.includes("must be")) {
        res.status(400).json({
          error: "Bad Request",
          message: error.message,
        });
        return;
      }
      
      // Download/timeout errors
      if (error.message.includes("timeout") || error.message.includes("download")) {
        res.status(504).json({
          error: "Gateway Timeout",
          message: error.message,
        });
        return;
      }
    }
    
    // Generic server error
    console.error("[image-optimizer] Error processing image:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to process image",
    });
  }
}

