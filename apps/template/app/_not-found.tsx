import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <div className="space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          404
          <span className="h-1 w-1 rounded-full bg-primary" />
          Route missing
        </div>
        <h1 className="text-4xl font-semibold">No encontramos esa vista</h1>
        <p className="text-muted-foreground">
          Revisá el árbol de `/app` o volvé a la home para seguir explorando el template.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <a href="/">Ir al inicio</a>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <a href="/docs">Ver documentación</a>
          </Button>
        </div>
      </div>
    </main>
  );
}
