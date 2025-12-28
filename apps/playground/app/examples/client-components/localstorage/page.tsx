import { LocalStorageCounter } from "@/components/examples/LocalStorageCounter.client";

export default function LocalStoragePage() {
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-4">LocalStorage Usage</h1>
          <p className="text-muted-foreground">
            This component uses <code className="bg-muted px-1 rounded">localStorage</code> which is not
            available on the server. This is a common hydration issue.
          </p>
        </div>

        <div className="p-6 border rounded-lg">
          <LocalStorageCounter />
        </div>

        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
          <p className="text-sm">
            <strong>Problem:</strong> localStorage only exists on the client. If you try to read it in SSR,
            you'll get an error or incorrect values.
          </p>
          <p className="text-sm">
            <strong>Solution:</strong> The component lives in a <code>.client.tsx</code> file, so the framework
            handles it automatically. It renders as a placeholder on the server and hydrates on the client.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            💡 Reload the page directly (not SPA navigation) to test that it works correctly.
          </p>
        </div>
      </div>
    </div>
  );
}

