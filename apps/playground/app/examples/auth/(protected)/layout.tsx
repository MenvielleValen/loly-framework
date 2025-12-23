import React from "react";
import { Link } from "@lolyjs/core/components";

type User = {
  id: string;
  name: string;
};

type AuthLayoutProps = {
  children: React.ReactNode;
  user?: User | null;
};

export default function AuthLayout({ children, user }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/examples/auth/dashboard" className="font-semibold">
                Auth Example
              </Link>
              <nav className="flex gap-2">
                <Link
                  href="/examples/auth/dashboard"
                  className="px-3 py-1 text-sm rounded hover:bg-accent"
                >
                  Dashboard
                </Link>
                <Link
                  href="/examples/auth/profile"
                  className="px-3 py-1 text-sm rounded hover:bg-accent"
                >
                  Profile
                </Link>
              </nav>
            </div>
            {user && (
              <div className="flex items-center gap-4">
                <span className="text-sm">Welcome, {user.name}!</span>
                <Link
                  href="/examples/auth/login"
                  className="px-3 py-1 text-sm rounded bg-muted hover:bg-muted/80"
                >
                  Logout
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}

