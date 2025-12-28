import { ContextBridgeDemo } from "@/components/examples/ContextBridgeDemo.client";

export default function ContextBridgePage() {
  const serverMessage = "Injected from server component props";

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Server → Client Context Bridge</h1>
          <p className="text-muted-foreground">
            Pasa datos del server a un provider .client.tsx y combínalos con estado del cliente.
          </p>
        </header>
        <ContextBridgeDemo serverMessage={serverMessage} />
      </div>
    </div>
  );
}

