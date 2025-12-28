import { BarrelCard, BarrelCTA } from "@/components/examples/barrel";

export default function BarrelReexportsPage() {
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Barrel Re-exports</h1>
          <p className="text-muted-foreground">
            Los islands se importan desde un barrel (index.ts) para validar detección y generación de loaders.
          </p>
        </header>
        <div className="space-y-4">
          <BarrelCard />
          <BarrelCTA />
        </div>
      </div>
    </div>
  );
}

