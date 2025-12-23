import React from "react";
import { Link } from "@lolyjs/core/components";

type User = {
  id: string;
  name: string;
};

type DashboardProps = {
  user?: User | null;
  message?: string;
  dashboardData?: {
    stats: {
      total: number;
      active: number;
      inactive: number;
    };
  };
};

export default function DashboardPage({ user, message, dashboardData }: DashboardProps) {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>

      {message && (
        <div className="mb-6 p-4 bg-muted rounded-lg">
          <p className="font-medium">{message}</p>
        </div>
      )}

      {dashboardData && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="p-4 border border-border rounded-lg">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Total</h3>
            <p className="text-2xl font-bold">{dashboardData.stats.total}</p>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Active</h3>
            <p className="text-2xl font-bold text-green-600">{dashboardData.stats.active}</p>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Inactive</h3>
            <p className="text-2xl font-bold text-red-600">{dashboardData.stats.inactive}</p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="p-4 border border-border rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Client-Side Navigation Test</h2>
          <p className="text-muted-foreground mb-4">
            Navigate to other pages using the links below. The global middleware will execute on
            each navigation, ensuring ctx.locals.user is always available.
          </p>
          <div className="flex gap-2">
            <Link
              href="/examples/auth/profile"
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Go to Profile (SPA)
            </Link>
            <Link
              href="/examples/auth/login"
              className="px-4 py-2 border border-border rounded hover:bg-accent"
            >
              Go to Login
            </Link>
          </div>
        </div>

        {user && (
          <div className="p-4 border border-border rounded-lg">
            <h2 className="text-xl font-semibold mb-2">User Info</h2>
            <p>
              <strong>ID:</strong> {user.id}
            </p>
            <p>
              <strong>Name:</strong> {user.name}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

