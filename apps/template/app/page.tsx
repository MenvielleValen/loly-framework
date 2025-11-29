import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  DocSummary,
  LaunchInsights,
  PulseMetrics,
} from "@/lib/site-data";
import { ArrowUpRight, Sparkles, Terminal } from "lucide-react";
import { useEffect } from "react";


type HomePageProps = {
  data: LaunchInsights;
  docsIndex: DocSummary[];
  insights: PulseMetrics & { renderTime: number };
};

export default function HomePage({
  data,
  docsIndex,
  insights,
}: HomePageProps) {
  const { hero, metrics, release, features, launchChecklist, timeline, automation, streamingPreview } =
    data;

  useEffect(() => {
    const fetchData = async () => {
      const response = await fetch("https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap");
      const data = await response.json();
      console.log(data);
    };

    fetchData();
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,oklch(0.3_0.15_220),transparent_50%),radial-gradient(circle_at_70%_60%,oklch(0.25_0.12_200),transparent_60%)] blur-3xl opacity-70" />
        <div className="relative mx-auto grid max-w-7xl gap-16 px-6 py-24 sm:py-32 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-3 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-sm text-primary">
              <Sparkles className="size-4 animate-pulse" />
              {hero.tagline}
            </div>
            <div className="space-y-6">
              <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
                {hero.title} es{" "} aaaaaaaaaaaaaaaaaaaaaaaa
                <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  {hero.highlight}
                </span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {hero.punchline}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" className="text-base font-semibold">
                Abrir playground
              </Button>
              <Button size="lg" variant="outline" className="text-base font-semibold">
                Ver documentación
              </Button>
            </div>
            <Card className="border-primary/20 bg-card/80 backdrop-blur">
              <CardHeader className="flex flex-col gap-1 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="text-foreground">Latido en vivo</CardTitle>
                  <CardDescription>Desde `/api/pulse` · render {insights.renderTime}ms</CardDescription>
                </div>
                <code className="rounded border border-border bg-muted px-3 py-1 text-xs font-mono text-muted-foreground">
                  curl {`</api/pulse>`}
                </code>
              </CardHeader>
              <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "req/s", value: insights.requestsPerSecond.toLocaleString("es-AR") },
                  { label: "p95", value: `${insights.latencyP95}ms` },
                  { label: "deploys hoy", value: insights.deploymentsToday },
                  { label: "región líder", value: insights.dominantRegion.toUpperCase() },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-sm uppercase text-muted-foreground">{item.label}</p>
                    <p className="text-2xl font-semibold">{item.value}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
          <Card className="border-border/60 bg-card/70 shadow-2xl ring-1 ring-primary/10 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-2xl">Checklist del template</CardTitle>
              <CardDescription>Hooks server, rutas dinámicas y API unificada.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {launchChecklist.map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-3 rounded-lg border border-border/70 px-3 py-2"
                >
                  <span
                    className={`mt-1 flex size-5 items-center justify-center rounded-full text-xs font-bold ${
                      item.status === "completo"
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {item.status === "completo" ? "✓" : "…"}
                  </span>
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <Card key={metric.label} className="border-border/70 bg-card/60">
              <CardHeader>
                <CardTitle className="text-3xl font-semibold">{metric.value}</CardTitle>
                <CardDescription>{metric.label}</CardDescription>
              </CardHeader>
              {metric.helper && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">{metric.helper}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-muted/20 py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-12 text-center">
            <p className="text-xs font-semibold uppercase text-primary">Stack completo</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              Features para construir producto real
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              File-system router, middlewares reutilizables, API routes y componentes listos con Tailwind v4.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="group border-border/70 bg-card/70 transition hover:border-primary/40"
              >
                <CardHeader className="space-y-1">
                  <span className="text-2xl">{feature.icon}</span>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {feature.points.map((point) => (
                      <li key={point} className="flex items-center gap-2">
                        <span className="size-1.5 rounded-full bg-primary/60" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="text-xs uppercase text-primary/70">{feature.category}</CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="border-border bg-card/80 backdrop-blur">
            <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Lanzamiento {release.version}</CardTitle>
                <CardDescription>{release.date}</CardDescription>
              </div>
              <Button variant="secondary" className="gap-2">
                Ver changelog
                <ArrowUpRight className="size-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {release.notes.map((note) => (
                <div key={note} className="flex items-start gap-3 rounded-md border border-border/60 px-4 py-3">
                  <span className="mt-1 size-2 rounded-full bg-primary" />
                  <p className="text-sm">{note}</p>
                </div>
              ))}
            </CardContent>
            <CardFooter className="flex flex-wrap gap-3">
              {automation.cli.map((line) => (
                <code
                  key={line}
                  className="rounded border border-border bg-muted px-3 py-1 text-xs font-mono text-muted-foreground"
                >
                  {line}
                </code>
              ))}
            </CardFooter>
          </Card>

          <Card className="border-border/70 bg-card/70">
            <CardHeader>
              <CardTitle>Streaming preview</CardTitle>
              <CardDescription>Componentes server + props hidratadas en caliente.</CardDescription>
            </CardHeader>
            <CardContent className="rounded-lg border border-border/60 bg-muted/40 p-4">
              <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Terminal className="size-4" />
                {streamingPreview.file}
              </div>
              <pre className="overflow-x-auto text-sm">
                <code>{streamingPreview.code}</code>
              </pre>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="border-y border-border bg-muted/10 py-20">
        <div className="mx-auto max-w-7xl space-y-10 px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase text-primary">Roadmap</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">Lo que viene</h2>
            <p className="mt-3 text-muted-foreground">
              Este template incluye ejemplos de timeline para comunicar claramente el estado de cada módulo.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {timeline.map((item) => (
              <Card key={item.title} className="border-border/70 bg-card/70">
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>{item.title}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      item.status === "listo"
                        ? "bg-primary/10 text-primary"
                        : item.status === "en progreso"
                        ? "bg-amber-500/10 text-amber-500"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {item.status}
                  </span>
                </CardHeader>
                <CardFooter className="text-sm text-muted-foreground">ETA · {item.eta}</CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="mb-12 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-primary/70">Documentación viva</p>
          <h2 className="mt-2 text-3xl font-bold text-balance">Rutas /docs listas para extender</h2>
          <p className="mt-3 text-muted-foreground">
            Cada entrada apunta a una ruta dinámica `/docs/[id]` que podés versionar.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {docsIndex.slice(0, 3).map((doc) => (
            <Card key={doc.id} className="border-border/70 bg-card/70">
              <CardHeader>
                <p className="text-xs font-semibold uppercase text-muted-foreground">{doc.category}</p>
                <CardTitle>{doc.title}</CardTitle>
                <CardDescription>{doc.summary}</CardDescription>
              </CardHeader>
              <CardFooter className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{doc.minutes} min read</span>
                <Button variant="ghost" size="sm" asChild className="gap-1">
                  <a href={`/docs/${doc.id}`}>
                    Abrir guía
                    <ArrowUpRight className="size-4" />
                  </a>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-muted/20 py-20">
        <div className="mx-auto max-w-4xl px-6 text-center lg:px-8">
          <p className="text-sm uppercase tracking-[0.25em] text-primary/60">
            Tu siguiente release
          </p>
          <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
            ¿Listo para desplegar con Loly?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Reutilizá este template como landing de tu SaaS, dashboard interno o portal técnico.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button size="lg" className="gap-2 text-base font-semibold">
              Crear proyecto
              <Sparkles className="size-4" />
            </Button>
            <Button size="lg" variant="outline" className="text-base font-semibold" asChild>
              <a href="https://github.com/loly-framework" target="_blank" rel="noreferrer">
                Ver repositorio
              </a>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
