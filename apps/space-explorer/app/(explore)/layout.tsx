import React from "react";
import { Link } from "@lolyjs/core/components";
import { Rocket, Globe, Users } from "lucide-react";

type ExploreLayoutProps = {
  children: React.ReactNode;
  // Props from (explore)/layout.server.hook.ts
  exploreTitle?: string;
  exploreDescription?: string;
  // Props from root layout.server.hook.ts (also available!)
  appName?: string;
};

/**
 * Layout for the (explore) route group.
 * This layout applies to all routes inside (explore):
 * - /planets (from app/(explore)/planets/page.tsx)
 * - /launches (from app/(explore)/launches/page.tsx)
 * - /astronauts (from app/(explore)/astronauts/page.tsx)
 * 
 * Note: The route group (explore) doesn't appear in the URL!
 */
export default function ExploreLayout(props: ExploreLayoutProps) {
  const {
    children,
    exploreTitle = "Explore Space",
    exploreDescription = "Discover planets, launches, and astronauts",
    appName,
  } = props;

  return (
    <div className="explore-layout">
      {/* Route Group Banner - Clear visual indicator */}
      <div className="border-b-2 border-primary/20 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
        <div className="mx-auto max-w-7xl px-6 py-5 lg:px-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Rocket className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-foreground">{exploreTitle}</h2>
                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">
                  EXPLORE GROUP
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{exploreDescription}</p>
            </div>
          </div>
          
          {/* Navigation within explore group */}
          <nav className="flex gap-2">
            <Link
              href="/planets"
              className="flex items-center gap-2 rounded-lg border border-border bg-background/50 px-4 py-2 text-sm font-medium text-foreground transition-all hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
            >
              <Globe className="h-4 w-4" />
              Planets
            </Link>
            <Link
              href="/launches"
              className="flex items-center gap-2 rounded-lg border border-border bg-background/50 px-4 py-2 text-sm font-medium text-foreground transition-all hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
            >
              <Rocket className="h-4 w-4" />
              Launches
            </Link>
            <Link
              href="/astronauts"
              className="flex items-center gap-2 rounded-lg border border-border bg-background/50 px-4 py-2 text-sm font-medium text-foreground transition-all hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
            >
              <Users className="h-4 w-4" />
              Astronauts
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

