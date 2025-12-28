import { UseClientExample } from "@/components/examples/UseClientExample.client";

export default function UseClientPage() {
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-4">Component with .client.tsx</h1>
          <p className="text-muted-foreground">
            This component uses the <code className="bg-muted px-1 rounded">.client.tsx</code> extension.
            It renders as a placeholder on the server and mounts on the client.
          </p>
        </div>

        <UseClientExample />
      </div>
    </div>
  );
}
