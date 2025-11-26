import { Button } from "@/components/ui/button";

export default function ErrorPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <div className="space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-destructive/40 bg-destructive/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-destructive">
          500
          <span className="h-1 w-1 rounded-full bg-destructive" />
          Algo salió mal
        </div>
        <h1 className="text-4xl font-semibold">Ops, rompimos algo</h1>
        <p className="text-muted-foreground">
          Volvé a intentar, o actualizá tu loader/server hook para manejar este caso.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <a href="/">Reintentar</a>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <a href="/docs">Ir a docs</a>
          </Button>
        </div>
      </div>
    </main>
  );
}
