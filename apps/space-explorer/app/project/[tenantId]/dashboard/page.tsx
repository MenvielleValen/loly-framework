import { Link } from "@lolyjs/core/components";

interface DashboardProps {
  tenantId: string;
  host?: string;
}

export default function TenantDashboard({ tenantId, host }: DashboardProps) {
  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground">Tenant Dashboard</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          This page demonstrates URL rewrites with multitenancy
        </p>
      </div>

      <div className="space-y-6">
        {/* Tenant Info Card */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-2xl font-semibold text-card-foreground">
            Tenant Information
          </h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-muted-foreground">Tenant ID:</span>
              <span className="rounded-md bg-primary/10 px-2 py-1 font-mono text-sm font-semibold text-primary">
                {tenantId}
              </span>
            </div>
            {host && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground">Host:</span>
                <span className="font-mono text-sm">{host}</span>
              </div>
            )}
          </div>
        </div>

        {/* How It Works Card */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-2xl font-semibold text-card-foreground">
            How Rewrites Work
          </h2>
          <div className="space-y-3 text-muted-foreground">
            <p>
              This page is accessed via a rewrite rule that extracts the tenant ID from the
              subdomain or path.
            </p>
            <div className="rounded-md bg-muted p-4 font-mono text-sm">
              <div className="mb-2 text-foreground">Original URL:</div>
              <div className="text-muted-foreground">
                {host ? `${host}/dashboard` : `/tenant/${tenantId}/dashboard`}
              </div>
              <div className="mt-4 mb-2 text-foreground">Rewritten to:</div>
              <div className="text-primary">/project/{tenantId}/dashboard</div>
            </div>
            <p className="text-sm">
              The URL in your browser stays the same, but internally the framework routes to
              this page with the tenant ID extracted from the rewrite.
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-2xl font-semibold text-card-foreground">
            Explore More
          </h2>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/planets"
              className="rounded-md border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
            >
              View Planets
            </Link>
            <Link
              href="/launches"
              className="rounded-md border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
            >
              View Launches
            </Link>
            <Link
              href="/astronauts"
              className="rounded-md border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
            >
              View Astronauts
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

