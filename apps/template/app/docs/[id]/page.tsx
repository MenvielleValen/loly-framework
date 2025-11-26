import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DocPage } from "@/lib/site-data";

type DocsDetailProps = {
  params: { id: string };
  doc: DocPage | null;
};

export default function DocsDetail({ params, doc }: DocsDetailProps) {
  if (!doc) {
    return (
      <main className="mx-auto flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="text-sm uppercase tracking-[0.25em] text-primary">Docs</p>
        <h1 className="text-3xl font-semibold">No encontramos esa guía</h1>
        <p className="text-muted-foreground">
          La ruta `/docs/{params.id}` todavía no existe. Podés crearla duplicando este archivo.
        </p>
        <Button asChild variant="secondary">
          <a href="/docs">Volver a documentación</a>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-12 px-6 py-20">
      <header className="space-y-4">
        <p className="text-xs uppercase text-muted-foreground">{doc.category}</p>
        <h1 className="text-4xl font-semibold">{doc.title}</h1>
        <p className="text-lg text-muted-foreground">{doc.summary}</p>
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="rounded-full border border-border px-3 py-1">
            {doc.minutes} min read
          </span>
          <code className="rounded border border-border bg-muted px-3 py-1 text-xs font-mono">
            /docs/{doc.id}
          </code>
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-[1.4fr_0.6fr]">
        <Card className="border-border/70 bg-card/70">
          <CardHeader>
            <CardTitle>Secciones</CardTitle>
            <CardDescription>Contenido renderizado como Server Component.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {doc.sections.map((section) => (
              <article key={section.heading} className="space-y-2">
                <h2 className="text-xl font-semibold">{section.heading}</h2>
                <p className="text-muted-foreground">{section.body}</p>
              </article>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60">
          <CardHeader>
            <CardTitle>Checklist</CardTitle>
            <CardDescription>Basada en datos del loader.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {doc.checklist.map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <span
                  className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
                    item.status === "ready"
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {item.status === "ready" ? "✓" : "•"}
                </span>
                <p>{item.label}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-6">
        {doc.snippets.map((snippet) => (
          <Card key={snippet.title} className="border-border/70 bg-card/70">
            <CardHeader>
              <CardTitle>{snippet.title}</CardTitle>
            </CardHeader>
            <CardContent className="rounded-lg border border-border/60 bg-muted/30 p-4 font-mono text-sm">
              <pre className="overflow-x-auto">{snippet.code}</pre>
            </CardContent>
          </Card>
        ))}
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/70 bg-muted/10 px-6 py-4">
        <span className="text-sm text-muted-foreground">¿Te quedó alguna duda?</span>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <a href="/docs">Índice</a>
          </Button>
          <Button asChild>
            <a href="/">Volver al template</a>
          </Button>
        </div>
      </footer>
    </main>
  );
}
