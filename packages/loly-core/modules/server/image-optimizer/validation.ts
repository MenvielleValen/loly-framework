import type { ImageConfig, RemotePattern } from "@src/config";
import path from "path";

/**
 * Checks if a URL is a remote URL (http/https).
 */
export function isRemoteUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

/**
 * Sanitizes an image path to prevent path traversal attacks.
 */
export function sanitizeImagePath(imagePath: string): string {
  // Remove any path traversal attempts
  const normalized = path.normalize(imagePath).replace(/^(\.\.(\/|\\|$))+/, "");
  // Remove leading slashes and backslashes
  return normalized.replace(/^[/\\]+/, "");
}

/**
 * Converts a remote pattern to a regex for matching.
 */
function patternToRegex(pattern: RemotePattern): RegExp {
  const parts: string[] = [];
  
  // Protocol
  if (pattern.protocol) {
    parts.push(pattern.protocol === "https" ? "https" : "http");
  } else {
    parts.push("https?"); // Match both http and https
  }
  
  parts.push("://");
  
  // Hostname - support wildcards
  let hostnamePattern = pattern.hostname
    .replace(/\./g, "\\.")
    .replace(/\*\*/g, ".*")
    .replace(/\*/g, "[^.]*");
  parts.push(hostnamePattern);
  
  // Port
  if (pattern.port) {
    parts.push(`:${pattern.port}`);
  }
  
  // Pathname
  if (pattern.pathname) {
    let pathnamePattern = pattern.pathname
      .replace(/\*\*/g, ".*")
      .replace(/\*/g, "[^/]*");
    parts.push(pathnamePattern);
  } else {
    parts.push(".*"); // Match any pathname if not specified
  }
  
  const regexSource = `^${parts.join("")}`;
  return new RegExp(regexSource);
}

/**
 * Validates if a remote URL matches any of the allowed patterns.
 */
export function validateRemoteUrl(url: string, config: ImageConfig): boolean {
  if (!config.remotePatterns && !config.domains) {
    return false; // No remote images allowed if no config
  }
  
  try {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol.replace(":", "") as "http" | "https";
    const hostname = urlObj.hostname;
    const port = urlObj.port || "";
    const pathname = urlObj.pathname;
    
    // Check remotePatterns first (more flexible)
    if (config.remotePatterns && config.remotePatterns.length > 0) {
      for (const pattern of config.remotePatterns) {
        const regex = patternToRegex(pattern);
        const testUrl = `${protocol}://${hostname}${port ? `:${port}` : ""}${pathname}`;
        
        if (regex.test(testUrl)) {
          // Additional checks
          if (pattern.protocol && pattern.protocol !== protocol) {
            continue;
          }
          if (pattern.port && pattern.port !== port) {
            continue;
          }
          
          return true;
        }
      }
    }
    
    // Fallback to legacy domains format
    if (config.domains && config.domains.length > 0) {
      for (const domain of config.domains) {
        // Support wildcards in domain
        const domainPattern = domain
          .replace(/\./g, "\\.")
          .replace(/\*\*/g, ".*")
          .replace(/\*/g, "[^.]*");
        const regex = new RegExp(`^${domainPattern}$`);
        
        if (regex.test(hostname)) {
          // Only allow HTTPS in production for legacy domains (security best practice)
          if (process.env.NODE_ENV === "production" && protocol !== "https") {
            continue;
          }
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    // Invalid URL
    return false;
  }
}

/**
 * Validates image dimensions against maximum allowed sizes.
 */
export function validateImageDimensions(
  width: number | undefined,
  height: number | undefined,
  config: ImageConfig
): { valid: boolean; error?: string } {
  const maxWidth = config.maxWidth || 3840;
  const maxHeight = config.maxHeight || 3840;
  
  if (width !== undefined && (width <= 0 || width > maxWidth)) {
    return {
      valid: false,
      error: `Image width must be between 1 and ${maxWidth}, got ${width}`,
    };
  }
  
  if (height !== undefined && (height <= 0 || height > maxHeight)) {
    return {
      valid: false,
      error: `Image height must be between 1 and ${maxHeight}, got ${height}`,
    };
  }
  
  return { valid: true };
}

/**
 * Validates image quality parameter.
 */
export function validateQuality(quality: number | undefined): { valid: boolean; error?: string } {
  if (quality === undefined) {
    return { valid: true };
  }
  
  if (typeof quality !== "number" || quality < 1 || quality > 100) {
    return {
      valid: false,
      error: `Image quality must be between 1 and 100, got ${quality}`,
    };
  }
  
  return { valid: true };
}

