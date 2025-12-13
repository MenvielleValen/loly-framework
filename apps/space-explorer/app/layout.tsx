import React from "react";
import { ThemeProvider } from "@lolyjs/core/themes";
import { ThemeSwitch } from "@/components/shared/theme-switch";
import { Link } from "@lolyjs/core/components";
import { Rocket } from "lucide-react";

type LayoutProps = {
  children: React.ReactNode;
  // Props from layout server.hook.ts - available in all pages
  appName?: string;
  navigation?: Array<{ href: string; label: string }>;
  footerLinks?: {
    explore: Array<{ href: string; label: string; external?: boolean }>;
    apis: Array<{ href: string; label: string; external?: boolean }>;
    framework: Array<{ href: string; label: string; external?: boolean }>;
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
    appName = "Space Explorer",
    navigation = [
      { href: "/planets", label: "Planets" },
      { href: "/launches", label: "Launches" },
      { href: "/astronauts", label: "Astronauts" },
      { href: "/apod", label: "APOD" },
    ],
    footerLinks,
    siteMetadata,
    theme,
  } = props;
  return (
    <ThemeProvider initialTheme={theme}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[linear-gradient(135deg,oklch(0.7_0.25_200),oklch(0.75_0.2_180))]">
                <Rocket className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-foreground">
                {appName}
              </span>
            </Link>
            <div className="hidden items-center gap-6 md:flex">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ThemeSwitch />
            <Link
              href="https://github.com/MenvielleValen/loly-framework"
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="GitHub"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
            </Link>
          </div>
        </nav>
      </header>

      {children}

      {/* Footer */}
      <footer className="border-t border-border bg-muted/20">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[linear-gradient(135deg,oklch(0.7_0.25_200),oklch(0.75_0.2_180))]">
                  <Rocket className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-bold text-foreground">
                  Space Explorer
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {siteMetadata?.description || "Exploring the universe with real data from NASA and SpaceX."}
              </p>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                Explore
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {(footerLinks?.explore || []).map((item) => (
                  <li key={item.href}>
                    {item.external ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-foreground"
                      >
                        {item.label}
                      </a>
                    ) : (
                      <Link href={item.href} className="hover:text-foreground">
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                APIs
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {(footerLinks?.apis || []).map((item) => (
                  <li key={item.href}>
                    {item.external ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-foreground"
                      >
                        {item.label}
                      </a>
                    ) : (
                      <Link href={item.href} className="hover:text-foreground">
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                Framework
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {(footerLinks?.framework || []).map((item) => (
                  <li key={item.href}>
                    {item.external ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-foreground"
                      >
                        {item.label}
                      </a>
                    ) : (
                      <Link href={item.href} className="hover:text-foreground">
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
                <li>
                  <span className="text-xs">SSR + SSG + API Routes</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 border-t border-border pt-8 text-center text-sm text-muted-foreground">
            {siteMetadata?.copyright || "© 2025 Space Explorer. Made with 💙 using Loly Framework."}
          </div>
        </div>
      </footer>
    </ThemeProvider>
  );
}
