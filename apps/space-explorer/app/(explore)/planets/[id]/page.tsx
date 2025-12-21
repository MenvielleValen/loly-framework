import { Link } from "@lolyjs/core/components";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Globe, ArrowLeft } from "lucide-react";
import type { Planet } from "@/lib/space-api";

type PlanetPageProps = {
  planet: Planet;
};

export default function PlanetPage(props: PlanetPageProps) {
  const { planet } = props || {};

  if (!planet) {
    return null;
  }

  return (
    <main className="min-h-screen bg-background py-12">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link href="/planets">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to planets
          </Link>
        </Button>

        <Card className="border-border/70 bg-card/70">
          <CardHeader>
            <div className="mb-4 flex items-center gap-3">
              <Globe className="h-10 w-10 text-primary" />
              <div>
                <CardTitle className="text-3xl">{planet.name}</CardTitle>
                <CardDescription className="text-base">
                  {planet.description}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <h3 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">
                  Distance from Sun
                </h3>
                <p className="text-2xl font-bold">{planet.distanceFromSun}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <h3 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">
                  Diameter
                </h3>
                <p className="text-2xl font-bold">{planet.diameter}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <h3 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">
                  Mass
                </h3>
                <p className="text-2xl font-bold">{planet.mass}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <h3 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">
                  Orbital Period
                </h3>
                <p className="text-2xl font-bold">{planet.orbitalPeriod}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <h3 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">
                  Day Length
                </h3>
                <p className="text-2xl font-bold">{planet.dayLength}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <h3 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">
                  Number of Moons
                </h3>
                <p className="text-2xl font-bold">{planet.moons}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

