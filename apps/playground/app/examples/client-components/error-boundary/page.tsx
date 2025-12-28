import { ErrorBoundaryDemo } from "@/components/examples/ErrorBoundaryDemo.client";

export default function ErrorBoundaryPage() {
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Client Error Boundaries</h1>
          <p className="text-muted-foreground">
            Cómo capturar errores de islands .client.tsx sin romper el árbol server.
          </p>
        </header>
        <ErrorBoundaryDemo />
      </div>
    </div>
  );
}

