import { usePageProps } from "@loly/core/hooks";
import { Link } from "@loly/core/components";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, ArrowLeft, Flag, Rocket } from "lucide-react";
import type { Astronaut } from "@/lib/space-api";

type AstronautPageProps = {
  astronaut: Astronaut;
};

export default function AstronautPage() {
  const { props } = usePageProps<AstronautPageProps>();
  const { astronaut } = props || {};

  if (!astronaut) {
    return null;
  }

  return (
    <main className="min-h-screen bg-background py-12">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link href="/astronauts">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a astronautas
          </Link>
        </Button>

        <Card className="border-border/70 bg-card/70">
          <CardHeader>
            <div className="mb-4 flex items-center gap-3">
              <Users className="h-10 w-10 text-primary" />
              <div>
                <CardTitle className="text-3xl">{astronaut.name}</CardTitle>
                <CardDescription className="flex items-center gap-2 text-base">
                  <Flag className="h-4 w-4" />
                  {astronaut.nationality} · {astronaut.agency}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {astronaut.bio && (
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <h3 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">
                  Biografía
                </h3>
                <p className="text-sm leading-relaxed">{astronaut.bio}</p>
              </div>
            )}

            {astronaut.missions && astronaut.missions.length > 0 && (
              <div>
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase text-muted-foreground">
                  <Rocket className="h-4 w-4" />
                  Misiones
                </h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {astronaut.missions.map((mission) => (
                    <div
                      key={mission}
                      className="rounded-lg border border-border bg-muted/30 p-3"
                    >
                      <p className="font-medium">{mission}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

