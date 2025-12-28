import { SuspenseDemo } from "@/components/examples/SuspenseDemo.client";

export default function SuspensePage() {
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Suspense + Client Islands</h1>
          <p className="text-muted-foreground">
            Demuestra cómo funcionan las fronteras de Suspense alrededor de islands .client.tsx (lazy) frente a islands inmediatas.
          </p>
        </header>
        <SuspenseDemo />
      </div>
    </div>
  );
}

