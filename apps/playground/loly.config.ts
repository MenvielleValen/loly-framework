import { ServerConfig, type FrameworkConfig } from "@lolyjs/core";

const DEFAULT_CONFIG: ServerConfig = {
  bodyLimit: "1mb",
  corsOrigin: "*",
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 1000,
    strictMax: 5,
    strictPatterns: [],
  },
};

// Configuración simple - el framework auto-detecta localhost
// Solo configura esto si despliegas a producción real
const PROD_CONFIG: ServerConfig = {
  // En producción real, descomenta y configura tu dominio:
  // corsOrigin: ["https://tu-dominio.com"],
  // realtime: {
  //   allowedOrigins: ["https://tu-dominio.com"],
  // },
};

const DEV_CONFIG: ServerConfig = {};

export const config = (env: string): ServerConfig => {
  const isDev = env === "development";

  const lolyConfig = isDev ? DEV_CONFIG : PROD_CONFIG;

  return {
    ...DEFAULT_CONFIG,
    ...lolyConfig,
  };
};

// Framework configuration (for image optimization, etc.)
// This is exported as default for loadConfig()
const frameworkConfig: Partial<FrameworkConfig> = {
  images: {
    // Allow remote images from example domains (for demo purposes)
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "**.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "via.placeholder.com",
      },
    ],
    // Or use legacy format:
    // domains: ['images.unsplash.com', 'via.placeholder.com'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ["image/webp", "image/avif"],
    quality: 75,
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true, // Allow SVG for demo
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default frameworkConfig;
