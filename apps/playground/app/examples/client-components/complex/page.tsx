import { ComplexHydrationExample } from "@/components/examples/ComplexHydrationExample.client";

export default function ComplexPage() {
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-4">Complex Hydration</h1>
          <p className="text-muted-foreground">
            This example shows multiple nested client components, each with different
            client dependencies. Tests that all hydrate correctly.
          </p>
        </div>

        <div className="p-6 border rounded-lg">
          <ComplexHydrationExample />
        </div>

        <div className="p-4 bg-muted/50 rounded-lg">
          <p className="text-sm">
            <strong>Test case:</strong> Multiple nested client components with different
            strategies (ClientOnly, useClientMounted, .client.tsx files). All should hydrate correctly
            in both SPA navigation and direct load.
          </p>
        </div>
      </div>
    </div>
  );
}

