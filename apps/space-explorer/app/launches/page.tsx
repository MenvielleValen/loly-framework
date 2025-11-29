import { usePageProps } from "@loly/core/hooks";
import { Link } from "@loly/core/components";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Rocket, ArrowRight, Calendar } from "lucide-react";
import type { SpaceXLaunch } from "@/lib/space-api";

type LaunchesPageProps = {
  launches: SpaceXLaunch[];
};

export default function LaunchesPage() {
  const { props } = usePageProps<LaunchesPageProps>();
  const { launches = [] } = props || {};

  return (
    <main className="min-h-screen bg-background py-12">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight">
            Lanzamientos de SpaceX
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Explora los lanzamientos más recientes de SpaceX
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {launches.map((launch) => (
            <Card
              key={launch.id}
              className="border-border/70 bg-card/70 transition hover:border-primary/40"
            >
              <CardHeader>
                <div className="mb-2 flex items-center gap-2">
                  <Rocket className="h-6 w-6 text-primary" />
                  <CardTitle className="line-clamp-2">{launch.name}</CardTitle>
                </div>
                <CardDescription className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {new Date(launch.date_utc).toLocaleDateString("es-ES", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                        launch.success
                          ? "bg-green-500/10 text-green-500"
                          : launch.upcoming
                          ? "bg-blue-500/10 text-blue-500"
                          : "bg-red-500/10 text-red-500"
                      }`}
                    >
                      {launch.upcoming
                        ? "Próximo"
                        : launch.success
                        ? "Exitoso"
                        : "Fallido"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Vuelo #{launch.flight_number}
                    </span>
                  </div>
                  {launch.details && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {launch.details}
                    </p>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="ghost" size="sm" asChild className="w-full">
                  <Link href={`/launches/${launch.id}`}>
                    Ver detalles <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}

