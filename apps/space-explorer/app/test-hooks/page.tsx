import { useState, useEffect } from "react";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { revalidate } from "@lolyjs/core/client-cache";
import { Link } from "@lolyjs/core/components";

type TestHooksPageProps = {
  // Layout props (from layout.server.hook.ts)
  appName?: string;
  navigation?: Array<{ href: string; label: string }>;
  // Page props (from page.server.hook.ts)
  layoutHookExecutions?: number;
  pageHookExecutions?: number;
  executionTimestamp?: string;
};

export default function TestHooksPage(props: TestHooksPageProps) {
  const {
    appName,
    navigation,
    layoutHookExecutions = 0,
    pageHookExecutions = 0,
    executionTimestamp,
  } = props;

  const [clientTime, setClientTime] = useState<string>("");
  const [isRevalidating, setIsRevalidating] = useState(false);

  useEffect(() => {
    setClientTime(new Date().toLocaleTimeString());
  }, []);

  const handleRevalidate = async () => {
    if (isRevalidating) return; // Prevent multiple simultaneous calls
    
    setIsRevalidating(true);
    try {
      await revalidate();
      setClientTime(new Date().toLocaleTimeString());
      // Force a small delay to show loading state
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error("Revalidation error:", error);
    } finally {
      setIsRevalidating(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Server Hooks Test Page</h1>
          <p className="text-muted-foreground">
            Esta página demuestra el comportamiento optimizado de los server hooks
          </p>
        </div>

        {/* Info Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg">Layout Hook</CardTitle>
              <CardDescription>
                Ejecuciones del layout.server.hook.ts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-primary">
                  {layoutHookExecutions}
                </div>
                <div className="text-sm text-muted-foreground">
                  Última ejecución: {executionTimestamp || "N/A"}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  <strong>Comportamiento esperado:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>✅ Se ejecuta en carga inicial (SSR)</li>
                    <li>❌ NO se ejecuta en navegación SPA</li>
                    <li>✅ Se ejecuta cuando se llama revalidate()</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardHeader>
              <CardTitle className="text-lg">Page Hook</CardTitle>
              <CardDescription>
                Ejecuciones del page.server.hook.ts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-blue-500">
                  {pageHookExecutions}
                </div>
                <div className="text-sm text-muted-foreground">
                  Última ejecución: {executionTimestamp || "N/A"}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  <strong>Comportamiento esperado:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>✅ Se ejecuta en carga inicial (SSR)</li>
                    <li>✅ Se ejecuta en navegación SPA</li>
                    <li>✅ Se ejecuta cuando se llama revalidate()</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Props Display */}
        <Card>
          <CardHeader>
            <CardTitle>Props Separados</CardTitle>
            <CardDescription>
              Layout props (estables) vs Page props (específicos)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2 text-primary">
                Layout Props (de layout.server.hook.ts)
              </h3>
              <pre className="bg-muted p-3 rounded text-xs overflow-auto">
                {JSON.stringify({ appName, navigation }, null, 2)}
              </pre>
              <p className="text-xs text-muted-foreground mt-2">
                Estos props se preservan entre navegaciones SPA
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-blue-500">
                Page Props (de page.server.hook.ts)
              </h3>
              <pre className="bg-muted p-3 rounded text-xs overflow-auto">
                {JSON.stringify(
                  {
                    layoutHookExecutions,
                    pageHookExecutions,
                    executionTimestamp,
                  },
                  null,
                  2
                )}
              </pre>
              <p className="text-xs text-muted-foreground mt-2">
                Estos props se actualizan en cada navegación
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Acciones de Prueba</CardTitle>
            <CardDescription>
              Prueba el comportamiento de los hooks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Navegación SPA</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Navega entre páginas usando los links. El layout hook NO debería
                ejecutarse, solo el page hook.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
                  Home
                </Link>
                <Link href="/planets" className={cn(buttonVariants({ variant: "outline" }))}>
                  Planets
                </Link>
                <Link href="/launches" className={cn(buttonVariants({ variant: "outline" }))}>
                  Launches
                </Link>
                <Link href="/astronauts" className={cn(buttonVariants({ variant: "outline" }))}>
                  Astronauts
                </Link>
                <Link href="/test-hooks" className={cn(buttonVariants({ variant: "outline" }))}>
                  Test Hooks (esta página)
                </Link>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Revalidación</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Fuerza la ejecución de TODOS los hooks (layout + page). Útil cuando
                necesitas actualizar datos estables del layout.
              </p>
              <button
                onClick={handleRevalidate}
                disabled={isRevalidating}
                className={cn(buttonVariants(), "min-w-[150px]")}
              >
                {isRevalidating ? "Revalidando..." : "Revalidar (revalidate())"}
              </button>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Información del Cliente</h3>
              <p className="text-sm text-muted-foreground">
                Hora del cliente: <strong>{clientTime}</strong>
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Abre la consola del navegador para ver logs de ejecución de hooks
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardHeader>
            <CardTitle className="text-yellow-600">Cómo Probar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ol className="list-decimal list-inside space-y-2">
              <li>
                <strong>Carga inicial:</strong> Recarga la página (F5). Ambos hooks
                deberían ejecutarse y los contadores deberían incrementarse.
              </li>
              <li>
                <strong>Navegación SPA:</strong> Haz clic en los links de navegación.
                Solo el page hook debería ejecutarse. El contador de layout hook NO
                debería cambiar.
              </li>
              <li>
                <strong>Revalidación:</strong> Haz clic en "Revalidar". Ambos hooks
                deberían ejecutarse y ambos contadores deberían incrementarse.
              </li>
              <li>
                <strong>Verificar en consola:</strong> Abre la consola del navegador
                para ver logs del servidor indicando qué hooks se ejecutaron.
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
