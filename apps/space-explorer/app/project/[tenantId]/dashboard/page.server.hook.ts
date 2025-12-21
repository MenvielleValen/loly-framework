import type { ServerLoader } from "@lolyjs/core";

/**
 * Server hook for tenant dashboard.
 * 
 * The tenantId comes from the rewrite rule that extracts it from:
 * - Subdomain: tenant1.localhost → tenantId = "tenant1"
 * - Path: /tenant/tenant1/dashboard → tenantId = "tenant1"
 * 
 * The tenant ID is also available in:
 * - ctx.params.tenantId (from route matching)
 * - ctx.req.query.tenant (injected by rewrite)
 * - ctx.req.locals.tenant (injected by rewrite)
 */
export const getServerSideProps: ServerLoader = async (ctx) => {
  const { params, req } = ctx;

  // Get tenant ID from route params (extracted by rewrite)
  const tenantId = params.tenantId as string;

  // Also available from rewrite injection
  const tenantFromQuery = req.query.tenant as string | undefined;
  const tenantFromLocals = (req as any).locals?.tenant as string | undefined;

  // Get host for display
  const host = req.get("host") || req.hostname || undefined;

  // In a real app, you would:
  // 1. Validate the tenant exists
  // 2. Load tenant-specific data
  // 3. Check permissions
  // 4. etc.

  return {
    props: {
      tenantId,
      host,
      // Include these for debugging
      _debug: {
        tenantFromQuery,
        tenantFromLocals,
        allQueryParams: req.query,
      },
    },
    metadata: {
      title: `Dashboard - ${tenantId} | Space Explorer`,
      description: `Tenant dashboard for ${tenantId}`,
    },
  };
};

