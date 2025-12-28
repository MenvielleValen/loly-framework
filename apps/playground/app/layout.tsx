import React from "react";
import { ClientOnly } from "@lolyjs/core/components";
import { ThemeSwitch } from "@/components/shared/theme-switch.client";

type LayoutProps = {
  children: React.ReactNode;
  // Props from page server.hook.ts (if any) - can be used here too
  theme?: string;
};

export default function RootLayout(props: LayoutProps) {
  const { children, theme } = props;

  return (
    <div className="min-h-screen">
      {/* Header with client-only theme switch */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between px-4">
          <nav className="flex items-center gap-6">
            <a href="/" className="font-semibold">
              Loly Playground
            </a>
            <a
              href="/examples/client-components"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Client Components
            </a>
            <a
              href="/examples/client-components/dependency-analysis"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Dependency Analysis
            </a>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
