import React from "react";
import { Link } from "@lolyjs/core/components";

export default function LoginPage() {
  const handleLogin = (userId: string) => {
    // Simulate setting a session cookie
    // In a real app, this would be done via API route
    document.cookie = `session=${userId}; path=/; max-age=3600`;
    // Navigate to dashboard
    window.location.href = "/examples/auth/dashboard";
  };

  return (
    <div className="max-w-md mx-auto mt-16">
      <div className="p-6 border border-border rounded-lg">
        <h1 className="text-3xl font-bold mb-4">Login</h1>
        <p className="text-muted-foreground mb-6">
          Click a user to login. This will set a session cookie and redirect to the dashboard.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => handleLogin("user-123")}
            className="w-full px-4 py-3 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Login as Test User (user-123)
          </button>
          <button
            onClick={() => handleLogin("user-456")}
            className="w-full px-4 py-3 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Login as Admin User (user-456)
          </button>
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h2 className="font-semibold mb-2">How it works:</h2>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Clicking a user sets a session cookie</li>
            <li>You&apos;re redirected to /dashboard (server-side redirect)</li>
            <li>Global middleware reads the cookie and sets ctx.locals.user</li>
            <li>Layout hook verifies user exists (already set by global middleware)</li>
            <li>Page hook can access ctx.locals.user safely</li>
          </ul>
        </div>

        <div className="mt-6 pt-6 border-t border-border">
          <Link
            href="/examples/auth/dashboard"
            className="text-sm text-muted-foreground hover:underline"
          >
            Try accessing dashboard without login (will redirect back here)
          </Link>
        </div>
      </div>
    </div>
  );
}

