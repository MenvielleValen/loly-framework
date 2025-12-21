import React from "react";
import { Link } from "@lolyjs/core/components";
import { Info, Mail } from "lucide-react";

type InfoLayoutProps = {
  children: React.ReactNode;
  // Props from (info)/layout.server.hook.ts
  infoTitle?: string;
  infoDescription?: string;
  // Props from root layout.server.hook.ts (also available!)
  appName?: string;
};

/**
 * Layout for the (info) route group.
 * This layout applies to all routes inside (info):
 * - /about (from app/(info)/about/page.tsx)
 * - /contact (from app/(info)/contact/page.tsx)
 * 
 * Note: The route group (info) doesn't appear in the URL!
 */
export default function InfoLayout(props: InfoLayoutProps) {
  const {
    children,
    infoTitle = "Information",
    infoDescription = "Learn more about Space Explorer",
    appName,
  } = props;

  return (
    <div className="info-layout">
      {/* Route Group Banner - Clear visual indicator */}
      <div className="border-b-2 border-blue-500/20 bg-gradient-to-r from-blue-500/5 via-blue-500/10 to-blue-500/5">
        <div className="mx-auto max-w-7xl px-6 py-5 lg:px-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <Info className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-foreground">{infoTitle}</h2>
                <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-semibold text-blue-500">
                  INFO GROUP
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{infoDescription}</p>
            </div>
          </div>
          
          {/* Navigation within info group */}
          <nav className="flex gap-2">
            <Link
              href="/about"
              className="flex items-center gap-2 rounded-lg border border-border bg-background/50 px-4 py-2 text-sm font-medium text-foreground transition-all hover:border-blue-500/50 hover:bg-blue-500/5 hover:text-blue-500"
            >
              <Info className="h-4 w-4" />
              About
            </Link>
            <Link
              href="/contact"
              className="flex items-center gap-2 rounded-lg border border-border bg-background/50 px-4 py-2 text-sm font-medium text-foreground transition-all hover:border-blue-500/50 hover:bg-blue-500/5 hover:text-blue-500"
            >
              <Mail className="h-4 w-4" />
              Contact
            </Link>
          </nav>
        </div>
      </div>

      {/* Page content */}
      <div className="min-h-[calc(100vh-14rem)]">
        {children}
      </div>
    </div>
  );
}

