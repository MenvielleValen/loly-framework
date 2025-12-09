import { Link } from "@lolyjs/core/components";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, ArrowRight, Flag } from "lucide-react";
import type { Astronaut } from "@/lib/space-api";

type AstronautsPageProps = {
  astronauts: Astronaut[];
};

export default function AstronautsPage(props: AstronautsPageProps) {
  const { astronauts = [] } = props || {};

  return (
    <main className="min-h-screen bg-background py-12">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight">Astronautas</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Meet the heroes who have explored space
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {astronauts.map((astronaut) => (
            <Card
              key={astronaut.id}
              className="border-border/70 bg-card/70 transition hover:border-primary/40"
            >
              <CardHeader>
                <div className="mb-2 flex items-center gap-2">
                  <Users className="h-6 w-6 text-primary" />
                  <CardTitle>{astronaut.name}</CardTitle>
                </div>
                <CardDescription className="flex items-center gap-2">
                  <Flag className="h-4 w-4" />
                  {astronaut.nationality} · {astronaut.agency}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {astronaut.bio && (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {astronaut.bio}
                  </p>
                )}
                {astronaut.missions && astronaut.missions.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                      Missions
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {astronaut.missions.map((mission) => (
                        <span
                          key={mission}
                          className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary"
                        >
                          {mission}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
              <div className="px-6 pb-6">
                <Button variant="ghost" size="sm" asChild className="w-full">
                  <Link href={`/astronauts/${astronaut.id}`}>
                    View profile <ArrowRight className="ml-2 h-4 w-4" />
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

