import { usePageProps } from "@lolyjs/core/hooks";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Rocket, Globe, Calendar, Sparkles, ArrowRight } from "lucide-react";
import type { NASAPOD, SpaceXLaunch } from "@/lib/space-api";
import { cn } from "@/lib/utils";

type HomePageProps = {
  apod: NASAPOD | null;
  recentLaunches: SpaceXLaunch[];
};

// Format date consistently for SSR/client hydration
// Using manual formatting instead of toLocaleDateString to avoid hydration mismatches
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const months = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
  ];
  const day = date.getUTCDate();
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  return `${day} de ${month} de ${year}`;
}

export default function HomePage(props: any) {  // Ensure consistent default values to avoid hydration mismatches
  const apod = props?.apod ?? null;
  const recentLaunches = props?.recentLaunches ?? [];

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,oklch(0.3_0.15_220),transparent_50%),radial-gradient(circle_at_70%_60%,oklch(0.25_0.12_200),transparent_60%)] blur-3xl opacity-70" />
        <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-sm text-primary">
              <Sparkles className="size-4 animate-pulse" />
              Explorando el universo con datos reales
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
              Bienvenido a{" "}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Space Explorer
              </span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              Descubre planetas, lanzamientos espaciales, astronautas y las
              imágenes más increíbles del cosmos. Todo con datos en tiempo real
              de NASA y SpaceX.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <a href="/planets" className={cn(buttonVariants({ size: "lg" }))}>
                Explorar Planetas
              </a>
              <a href="/launches" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
                Ver Lanzamientos
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/70 bg-card/60">
            <CardHeader>
              <Globe className="mb-2 h-8 w-8 text-primary" />
              <CardTitle>8 Planetas</CardTitle>
              <CardDescription>
                Explora todos los planetas del sistema solar
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <a href="/planets" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
                Ver todos <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </CardFooter>
          </Card>

          <Card className="border-border/70 bg-card/60">
            <CardHeader>
              <Rocket className="mb-2 h-8 w-8 text-primary" />
              <CardTitle>Lanzamientos</CardTitle>
              <CardDescription>
                Últimos lanzamientos de SpaceX en tiempo real
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <a href="/launches" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
                Ver lanzamientos <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </CardFooter>
          </Card>

          <Card className="border-border/70 bg-card/60">
            <CardHeader>
              <Calendar className="mb-2 h-8 w-8 text-primary" />
              <CardTitle>APOD</CardTitle>
              <CardDescription>
                Astronomy Picture of the Day de NASA
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <a href="/apod" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
                Ver APOD <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </CardFooter>
          </Card>

          <Card className="border-border/70 bg-card/60">
            <CardHeader>
              <Sparkles className="mb-2 h-8 w-8 text-primary" />
              <CardTitle>Astronautas</CardTitle>
              <CardDescription>Conoce a los héroes del espacio</CardDescription>
            </CardHeader>
            <CardFooter>
              <a href="/astronauts" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
                Ver astronautas <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* APOD Section */}
      {apod && (
        <section className="border-y border-border bg-muted/20 py-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mb-12 text-center">
              <p className="text-xs font-semibold uppercase text-primary">
                Imagen del Día
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-balance sm:text-4xl">
                {apod.title}
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                {apod.explanation.substring(0, 150)}...
              </p>
            </div>
            <Card className="mx-auto max-w-4xl border-border/70 bg-card/70">
              <CardHeader>
                <CardTitle>{apod.title}</CardTitle>
                <CardDescription>{apod.date}</CardDescription>
              </CardHeader>
              <CardContent>
                {apod.media_type === "image" ? (
                  <img
                    src={apod.url}
                    alt={apod.title}
                    className="w-full rounded-lg"
                  />
                ) : (
                  <div className="aspect-video w-full rounded-lg bg-muted flex items-center justify-center">
                    <p className="text-muted-foreground">Video no disponible</p>
                  </div>
                )}
                <p className="mt-4 text-sm text-muted-foreground">
                  {apod.explanation}
                </p>
              </CardContent>
              <CardFooter>
                <a href="/apod" className={cn(buttonVariants())}>
                  Ver más APOD
                </a>
              </CardFooter>
            </Card>
          </div>
        </section>
      )}

      {/* Recent Launches */}
      {recentLaunches.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <div className="mb-12">
            <h2 className="text-3xl font-bold tracking-tight">
              Últimos Lanzamientos
            </h2>
            <p className="mt-2 text-muted-foreground">
              Los lanzamientos más recientes de SpaceX
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {recentLaunches.map((launch: SpaceXLaunch) => (
              <Card
                key={launch.id}
                className="border-border/70 bg-card/70 transition hover:border-primary/40"
              >
                <CardHeader>
                  <CardTitle>{launch.name}</CardTitle>
                  <CardDescription>
                    {formatDate(launch.date_utc)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
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
                  <a href={`/launches/${launch.id}`} className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
                    Ver detalles <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
