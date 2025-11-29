export const config = (env: string): any => {
  console.log("[loly.config] Environment:", env);

  return {
    bodyLimit: "1mb",
    // CORS: In production, specify allowed origins explicitly
    // Never use '*' in production!
    corsOrigin: env === "production" 
    ? ["https://allowed-domain.com"]  // Solo este dominio
    : true,
    // Rate limiting configuration
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // General requests per IP
      apiMax: 100, // API requests per IP
      strictMax: 5, // Strict endpoints (auth, etc.)
      // Auto-apply strict rate limiting to routes matching these patterns
      // You can customize these patterns or add your own
      strictPatterns: [
        '/api/auth/**',
        '/api/login/**',
        '/api/register/**',
        '/api/password/**',
        '/api/reset/**',
        '/api/verify/**',
        '/api/test-security', // Example: custom pattern for this test endpoint
        '/api/test-rate-limit', // Test endpoint for rate limiting
      ],
    },
    // Security headers
    security: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          scriptSrc: ["'self'", env === "development" ? "'unsafe-inline' 'unsafe-eval'" : "'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https:"], // Allow fetch to any HTTPS endpoint
          fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
        },
      },
    },
  };
};
