import { usePageProps } from "@lolyjs/core/hooks";
import { Link } from "@lolyjs/core/components";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Rocket, ArrowLeft, Calendar, ExternalLink } from "lucide-react";
import type { SpaceXLaunch } from "@/lib/space-api";

type LaunchPageProps = {
  launch: SpaceXLaunch;
};

export default function LaunchPage() {
  const { props } = usePageProps<LaunchPageProps>();
  const { launch } = props || {};

  if (!launch) {
    return null;
  }

  return (
    <main className="min-h-screen bg-background py-12">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link href="/launches">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a lanzamientos
          </Link>
        </Button>

        <Card className="border-border/70 bg-card/70">
          <CardHeader>
            <div className="mb-4 flex items-center gap-3">
              <Rocket className="h-10 w-10 text-primary" />
              <div>
                <CardTitle className="text-3xl">{launch.name}</CardTitle>
                <CardDescription className="flex items-center gap-2 text-base">
                  <Calendar className="h-4 w-4" />
                  {new Date(launch.date_utc).toLocaleDateString("es-ES", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${
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
              <span className="text-sm text-muted-foreground">
                Vuelo #{launch.flight_number}
              </span>
            </div>

            {launch.details && (
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <h3 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">
                  Detalles
                </h3>
                <p className="text-sm leading-relaxed">{launch.details}</p>
              </div>
            )}

            {launch.links && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold uppercase text-muted-foreground">
                  Enlaces
                </h3>
                <div className="flex flex-wrap gap-2">
                  {launch.links.webcast && (
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={launch.links.webcast}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Ver webcast <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  {launch.links.article && (
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={launch.links.article}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Artículo <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  {launch.links.wikipedia && (
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={launch.links.wikipedia}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Wikipedia <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

