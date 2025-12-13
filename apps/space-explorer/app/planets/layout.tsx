import React from "react";
import { Link } from "@lolyjs/core/components";

type PlanetsLayoutProps = {
  children: React.ReactNode;
  // Props from planets layout server.hook.ts
  sectionTitle?: string;
  sectionDescription?: string;
  // Props from root layout server.hook.ts (also available!)
  appName?: string;
};

export default function PlanetsLayout(props: PlanetsLayoutProps) {
  const {
    children,
    sectionTitle = "Planets",
    sectionDescription = "Explore our solar system",
    appName,
  } = props;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
      {/* Section Header */}
      <div className="mb-8 border-b border-border pb-6">
        <h1 className="text-3xl font-bold text-foreground">{sectionTitle}</h1>
        <p className="mt-2 text-muted-foreground">{sectionDescription}</p>
        {appName && (
          <p className="mt-1 text-sm text-muted-foreground">
            Part of {appName}
          </p>
        )}
      </div>

      {/* Navigation breadcrumb or section nav */}
      <nav className="mb-6">
        <Link
          href="/planets"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          ← Back to Planets
        </Link>
      </nav>

      {/* Page content */}
      {children}
    </div>
  );
}

