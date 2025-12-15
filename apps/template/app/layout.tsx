import React from "react";
import { ThemeProvider } from "@lolyjs/core/themes";
import { ThemeSwitch } from "@/components/shared/theme-switch";
import { Link } from "@lolyjs/core/components";
import {
  ArrowRight,
  BookOpen,
  FileText,
  Github,
  Lightbulb,
  Sparkles,
} from "lucide-react";

type LayoutProps = {
  children: React.ReactNode;
  // Props from layout server.hook.ts - available in all pages
  appName?: string;
  navigation?: Array<{ href: string; label: string }>;
  footerLinks?: {
    resources?: Array<{ href: string; label: string; external?: boolean }>;
    framework?: Array<{ href: string; label: string; external?: boolean }>;
  };
  siteMetadata?: {
    description: string;
    copyright: string;
  };
  // Props from page server.hook.ts (if any) - can be used here too
  theme?: string;
};

export default function RootLayout(props: LayoutProps) {
  const {
    children,
    appName = "Loly App",
    navigation = [{ href: "/", label: "Home" }],
    footerLinks,
    siteMetadata,
    theme,
  } = props;

  return (
    <ThemeProvider initialTheme={theme}>
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="group flex items-center gap-2.5 transition-all"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/90 to-primary shadow-lg shadow-primary/20 transition-all group-hover:shadow-xl group-hover:shadow-primary/30 group-hover:scale-105">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold tracking-tight text-foreground">
                {appName}
              </span>
            </Link>
            <div className="hidden items-center gap-1 md:flex">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-accent/50 hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeSwitch />
            <Link
              href="https://github.com/MenvielleValen/loly-framework"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-all hover:bg-accent hover:text-foreground hover:border-border/60"
              aria-label="GitHub"
            >
              <Github className="h-4 w-4" />
            </Link>
          </div>
        </nav>
      </header>

      {children}

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <Link
                href="/"
                className="group mb-6 inline-flex items-center gap-2.5 transition-all"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/90 to-primary shadow-lg shadow-primary/20 transition-all group-hover:shadow-xl group-hover:shadow-primary/30 group-hover:scale-105">
                  <Sparkles className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold tracking-tight text-foreground">
                  {appName}
                </span>
              </Link>
              <p className="text-base text-muted-foreground leading-relaxed max-w-md">
                {siteMetadata?.description ||
                  "A modern full-stack React framework with native WebSocket support."}
              </p>
              <div className="mt-6 flex items-center gap-3">
                <Link
                  href="https://github.com/MenvielleValen/loly-framework"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-all hover:bg-accent hover:text-foreground hover:border-primary/30"
                  aria-label="GitHub"
                >
                  <Github className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div>
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
                <BookOpen className="h-4 w-4 text-primary" />
                Resources
              </h3>
              <ul className="space-y-3 text-sm">
                {(footerLinks?.resources || []).map((item) => (
                  <li key={item.href}>
                    {item.external ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground transition-colors hover:text-foreground inline-flex items-center gap-1.5 group"
                      >
                        {item.label}
                        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                      </a>
                    ) : (
                      <Link
                        href={item.href}
                        className="text-muted-foreground transition-colors hover:text-foreground inline-flex items-center gap-1.5 group"
                      >
                        {item.label}
                        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Lightbulb className="h-4 w-4 text-primary" />
                Framework
              </h3>
              <ul className="space-y-3 text-sm">
                {(footerLinks?.framework || []).map((item) => (
                  <li key={item.href}>
                    {item.external ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground transition-colors hover:text-foreground inline-flex items-center gap-1.5 group"
                      >
                        {item.label}
                        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                      </a>
                    ) : (
                      <Link
                        href={item.href}
                        className="text-muted-foreground transition-colors hover:text-foreground inline-flex items-center gap-1.5 group"
                      >
                        {item.label}
                        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    )}
                  </li>
                ))}
                <li className="pt-2 border-t border-border/50">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <FileText className="h-3 w-3" />
                    SSR + SSG + API Routes
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-border pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground text-center sm:text-left">
              {siteMetadata?.copyright ||
                "© 2025 Loly App. Made with 💙 using Loly Framework."}
            </p>
          </div>
        </div>
      </footer>
    </ThemeProvider>
  );
}
