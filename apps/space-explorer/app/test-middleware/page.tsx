type TestMiddlewarePageProps = {
  // Page middleware data (from page.server.hook.ts)
  middlewareData?: {
    message?: string;
    timestamp?: string;
    pathname?: string;
  };
  message?: string;
  // Layout middleware data (from layout.server.hook.ts)
  layoutMiddlewareExecuted?: boolean;
  layoutMiddlewareTimestamp?: string;
};

export default function TestMiddlewarePage(props: TestMiddlewarePageProps) {
  const { middlewareData, message, layoutMiddlewareExecuted, layoutMiddlewareTimestamp } = props;

  return (
    <main className="min-h-screen bg-background text-foreground p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Test Middleware</h1>
          <p className="text-muted-foreground">
            Esta página verifica que beforeServerData funciona correctamente
          </p>
        </div>

        <div className="space-y-4">
          <div className="p-4 border rounded-lg bg-blue-500/10 border-blue-500/20">
            <h2 className="text-xl font-semibold mb-2 text-blue-500">Page Middleware (beforeServerData)</h2>
            <p className="text-sm text-muted-foreground mb-2">
              De page.server.hook.ts - se ejecuta antes del page hook
            </p>
            <pre className="text-sm overflow-auto bg-muted p-2 rounded">
              {JSON.stringify(middlewareData, null, 2)}
            </pre>
            {middlewareData ? (
              <p className="text-green-600 mt-2">✅ Page middleware ejecutado correctamente</p>
            ) : (
              <p className="text-red-600 mt-2">❌ Page middleware NO se ejecutó</p>
            )}
          </div>

          <div className="p-4 border rounded-lg bg-primary/10 border-primary/20">
            <h2 className="text-xl font-semibold mb-2 text-primary">Layout Middleware (beforeServerData)</h2>
            <p className="text-sm text-muted-foreground mb-2">
              De layout.server.hook.ts - se ejecuta antes del layout hook
            </p>
            <pre className="text-sm overflow-auto bg-muted p-2 rounded">
              {JSON.stringify({
                executed: layoutMiddlewareExecuted,
                timestamp: layoutMiddlewareTimestamp,
              }, null, 2)}
            </pre>
            {layoutMiddlewareExecuted ? (
              <p className="text-green-600 mt-2">✅ Layout middleware ejecutado correctamente</p>
            ) : (
              <p className="text-red-600 mt-2">❌ Layout middleware NO se ejecutó</p>
            )}
          </div>

          <div className="p-4 border rounded-lg bg-muted">
            <h2 className="text-xl font-semibold mb-2">Page Hook Message</h2>
            <p>{message || "No message"}</p>
          </div>

          <div className="p-4 border rounded-lg bg-yellow-500/10">
            <h2 className="text-xl font-semibold mb-2">Cómo verificar</h2>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>
                <strong>Carga inicial (SSR):</strong> Recarga la página (F5). Ambos middlewares (page + layout) 
                deberían ejecutarse y ver los datos arriba.
              </li>
              <li>
                <strong>Navegación SPA:</strong> Navega a otra página y vuelve. El page middleware debería ejecutarse 
                de nuevo, pero el layout middleware NO debería ejecutarse (porque los layout hooks se saltan en SPA).
              </li>
              <li>
                <strong>Revalidación:</strong> Usa revalidate() en la página de test-hooks. Ambos middlewares deberían 
                ejecutarse de nuevo.
              </li>
              <li>
                <strong>Consola del servidor:</strong> Revisa los logs - deberías ver:
                <ul className="list-disc list-inside ml-4 mt-1">
                  <li>🟡 [layout] beforeServerData middleware executed</li>
                  <li>✅ [test-middleware] beforeServerData executed</li>
                </ul>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </main>
  );
}
