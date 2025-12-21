import type { RewriteConfig } from "@lolyjs/core";

/**
 * Rewrites configuration for Space Explorer.
 * 
 * This example demonstrates multitenancy by subdomain:
 * - tenant1.localhost:3000/* → /project/tenant1/*
 * - tenant2.localhost:3000/* → /project/tenant2/*
 * 
 * The tenant ID is extracted from the subdomain and injected into the route.
 * 
 * Behavior (like Next.js):
 * - Rewrites are applied ALWAYS if the source pattern matches
 * - If the rewritten route doesn't exist, a 404 will be returned
 * - No fallback to original route - strict behavior like Next.js
 * - System routes (/api/*, /static/*, etc.) are automatically excluded
 * 
 * Note: In development, you can test this by:
 * 1. Adding entries to your /etc/hosts file (or C:\Windows\System32\drivers\etc\hosts on Windows):
 *    127.0.0.1 tenant1.localhost
 *    127.0.0.1 tenant2.localhost
 * 2. Accessing http://tenant1.localhost:3000/dashboard
 * 
 * Or use the path-based rewrite below for easier testing.
 */
export default async function rewrites(): Promise<RewriteConfig> {
  return [
    // Multitenant by subdomain (main use case)
    // Catch-all pattern: tenant1.localhost:3000/* → /project/tenant1/*
    // All routes under the tenant subdomain will be rewritten
    // If a route doesn't exist in /project/[tenantId]/*, it will return 404
    {
      source: "/:path*",
      has: [
        {
          type: "host",
          value: ":tenant.localhost", // Matches tenant1.localhost, tenant2.localhost, etc.
        },
      ],
      destination: "/project/:tenant/:path*",
    },

    // Alternative: Multitenant by path (easier to test in development)
    // /tenant/tenant1/* → /project/tenant1/*
    // This allows testing without subdomain configuration
    {
      source: "/tenant/:tenant/:path*",
      destination: "/project/:tenant/:path*",
    },

    // Example: Rewrite static path
    // /old-about → /about
    // {
    //   source: "/old-about",
    //   destination: "/about",
    // },
  ];
}

