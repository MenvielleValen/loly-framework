import { WindowInfo } from "@/components/examples/WindowInfo.client";

export default function WindowApiPage() {
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-4">Window API Usage</h1>
          <p className="text-muted-foreground">
            This component uses <code className="bg-muted px-1 rounded">window.innerWidth</code> which is not
            available on the server. It must use <code className="bg-muted px-1 rounded">.client.tsx</code> file extension.
          </p>
        </div>

        <div className="p-6 border rounded-lg">
          <WindowInfo />
        </div>

        <div className="p-4 bg-muted/50 rounded-lg">
          <p className="text-sm">
            <strong>Problem:</strong> If you try to use <code>window</code> directly in SSR, you'll get an error.
          </p>
          <p className="text-sm mt-2">
            <strong>Solution:</strong> The component is in a <code>.client.tsx</code> file, so the framework handles it automatically.
            It renders as a placeholder on the server and hydrates on the client.
          </p>
        </div>
      </div>
    </div>
  );
}

