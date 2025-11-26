import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DocSummary } from "@/lib/site-data";

type DocsPageProps = {
  docs: DocSummary[];
};

export default function DocsPage({ docs }: DocsPageProps) {
  return (
    <main className="mx-auto max-w-6xl space-y-16 px-6 py-20">
      <header className="space-y-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
          Documentación
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-balance">
          Aprende Loly desde el routing hasta el deploy
        </h1>
        <p className="text-lg text-muted-foreground">
          Cada guía refleja lo que se renderiza en este template: loaders, rutas dinámicas y
          componentes estilados con Tailwind v4.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button size="lg">Primeros pasos</Button>
          <Button variant="outline" size="lg" asChild>
            <a href="/">Volver al template</a>
          </Button>
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        {docs.map((doc) => (
          <Card key={doc.id} className="border-border/70 bg-card/70">
            <CardHeader>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{doc.category}</p>
              <CardTitle>{doc.title}</CardTitle>
              <CardDescription>{doc.summary}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {doc.minutes} min de lectura · ruta `/docs/{doc.id}`
            </CardContent>
            <CardFooter className="flex items-center justify-between">
              <Button size="sm" variant="outline" asChild>
                <a href={`/docs/${doc.id}`}>Abrir guía</a>
              </Button>
              <code className="rounded border border-border bg-muted px-3 py-1 text-xs font-mono">
                app/docs/{doc.id}/page.tsx
              </code>
            </CardFooter>
          </Card>
        ))}
      </section>

      <section className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-8">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.25em] text-primary">Bonus</p>
            <h2 className="text-2xl font-semibold">Listo para escalar</h2>
            <p className="text-muted-foreground">
              Copiá esta carpeta, agregá MDX o fetchers personalizados, y mantené la experiencia
              consistente con el layout global. Las rutas siguen siendo server components, así que
              podés traer datos sin exponer claves en el cliente.
            </p>
            <Button variant="secondary" asChild>
              <a href="https://github.com/loly-framework" target="_blank" rel="noreferrer">
                Repositorio
              </a>
            </Button>
          </div>
          <div className="rounded-xl border border-border/60 bg-background p-6 font-mono text-sm">
            <p className="text-muted-foreground">Árbol de rutas</p>
            <pre className="mt-4 text-xs">
{`app/
 ├─ page.tsx
 ├─ docs/
 │   ├─ page.tsx
 │   └─ [id]/
 │      └─ page.tsx
 └─ api/
     └─ pulse/
        └─ route.ts`}
            </pre>
          </div>
        </div>
      </section>
    </main>
  );
}