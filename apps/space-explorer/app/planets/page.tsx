import { Link } from "@lolyjs/core/components";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Globe, ArrowRight } from "lucide-react";
import type { Planet } from "@/lib/space-api";

type PlanetsPageProps = {
  // Props from page server.hook.ts (app/planets/page.server.hook.ts or app/planets/server.hook.ts)
  planets: Planet[];
  // Props from planets layout server.hook.ts (app/planets/layout.server.hook.ts)
  sectionTitle?: string;
  sectionDescription?: string;
  sectionConfig?: {
    enableSearch: boolean;
    itemsPerPage: number;
  };
  // Props from root layout server.hook.ts (app/layout.server.hook.ts) - also available!
  appName?: string;
};

export default function PlanetsPage(props: PlanetsPageProps) {
  // Props from page server.hook.ts
  const { planets = [] } = props || {};
  
  // Props from planets layout server.hook.ts (nested layout)
  const { sectionTitle, sectionDescription, sectionConfig } = props || {};
  
  // Props from root layout server.hook.ts
  const { appName } = props || {};

  // Use layout props if available, otherwise use defaults
  const title = sectionTitle || "Planets of the Solar System";
  const description = sectionDescription || "Explore the 8 planets of our solar system";

  return (
    <main className="min-h-screen bg-background py-12">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            {description}
          </p>
          {sectionConfig?.enableSearch && (
            <p className="mt-2 text-sm text-muted-foreground">
              Search enabled • Showing {planets.length} planets
            </p>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {planets.map((planet) => (
            <Card
              key={planet.id}
              className="border-border/70 bg-card/70 transition hover:border-primary/40"
            >
              <CardHeader>
                <div className="mb-2 flex items-center gap-2">
                  <Globe className="h-6 w-6 text-primary" />
                  <CardTitle>{planet.name}</CardTitle>
                </div>
                <CardDescription className="line-clamp-2">
                  {planet.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Distance from Sun:</span>{" "}
                  <span className="text-muted-foreground">
                    {planet.distanceFromSun}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="font-medium">Diameter:</span>{" "}
                  <span className="text-muted-foreground">
                    {planet.diameter}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="font-medium">Moons:</span>{" "}
                  <span className="text-muted-foreground">{planet.moons}</span>
                </div>
              </CardContent>
              <div className="px-6 pb-6">
                <Button variant="ghost" size="sm" asChild className="w-full">
                  <Link href={`/planets/${planet.id}`}>
                    View details <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}

