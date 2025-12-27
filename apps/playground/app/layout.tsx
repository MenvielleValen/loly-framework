import React from "react";
import { ThemeProvider } from "@lolyjs/core/themes";
import { ClientOnly } from "@lolyjs/core/components";
import { ThemeSwitch } from "@/components/shared/theme-switch";

type LayoutProps = {
  children: React.ReactNode;
  // Props from page server.hook.ts (if any) - can be used here too
  theme?: string;
};

export default function RootLayout(props: LayoutProps) {
  const { children, theme } = props;

  return (
    <ThemeProvider initialTheme={theme}>
      <div className="min-h-screen">
        {/* Header with client-only theme switch */}
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center justify-between px-4">
            <nav className="flex items-center gap-6">
              <a href="/" className="font-semibold">
                Loly Playground
              </a>
              <a href="/examples/client-components" className="text-sm text-muted-foreground hover:text-foreground">
                Client Components
              </a>
            </nav>
            <ClientOnly fallback={<div className="h-9 w-16 rounded-full bg-muted" />}>
              <ThemeSwitch />
            </ClientOnly>
          </div>
        </header>
        {children}
      </div>
    </ThemeProvider>
  );
}
