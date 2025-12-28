import React, { Suspense, useEffect, useState } from "react";

const LazyHello = React.lazy(() => import("./SuspenseHello.client"));
const LazyCounter = React.lazy(() => import("./SuspenseCounter.client"));

export function SuspenseDemo() {
  return (
    <div className="space-y-6">
      <Section title="Suspense boundary with lazy islands" subtitle="Fallback should appear until the client chunk loads.">
        <Suspense fallback={<Placeholder label="Loading lazy hello..." />}>
          <LazyHello />
        </Suspense>
      </Section>

      <Section title="Immediate island (no suspense)" subtitle="Mounts right after hydration without fallback.">
        <ImmediateIsland />
      </Section>

      <Section title="Nested Suspense islands" subtitle="Multiple lazy islands can stream independently.">
        <div className="space-y-3">
          <Suspense fallback={<Placeholder label="Loading counter..." />}>
            <LazyCounter />
          </Suspense>
          <Suspense fallback={<Placeholder label="Loading hello again..." />}>
            <LazyHello />
          </Suspense>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="p-6 border rounded-lg space-y-3">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function Placeholder({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse" />
      {label}
    </div>
  );
}

function ImmediateIsland() {
  const [mountedAt, setMountedAt] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    setMountedAt(`${now.toLocaleTimeString()} .${now.getMilliseconds()}`);
  }, []);

  return (
    <div className="rounded-md bg-muted/50 p-4 text-sm">
      <div className="font-medium">Immediate island</div>
      <p className="text-muted-foreground">Mounted at: {mountedAt ?? "..."}</p>
    </div>
  );
}

