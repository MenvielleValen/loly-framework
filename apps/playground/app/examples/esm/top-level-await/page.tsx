type Props = {
  config: {
    apiUrl: string;
    features: string[];
    version: string;
    loadedAt: string;
  };
  message: string;
  timestamp: string;
  explanation: string;
};

export default function TopLevelAwaitPage({
  config,
  message,
  timestamp,
  explanation,
}: Props) {
  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-4">Top-Level Await Example</h1>
      <p className="text-lg mb-6 text-muted-foreground">{message}</p>

      <div className="bg-muted p-6 rounded-lg mb-6">
        <h2 className="font-semibold mb-3 text-xl">
          Configuration (loaded with top-level await):
        </h2>
        <pre className="text-sm bg-background p-4 rounded overflow-x-auto">
          {JSON.stringify(config, null, 2)}
        </pre>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950 p-6 rounded-lg mb-4">
        <p className="font-semibold mb-2 text-lg">✨ ESM Feature:</p>
        <p className="text-sm">{explanation}</p>
      </div>

      <div className="text-sm text-muted-foreground">
        Page rendered at: {timestamp}
      </div>

      <div className="mt-8 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
        <h3 className="font-semibold mb-2">Code Example:</h3>
        <pre className="text-xs overflow-x-auto">
          {`// ✅ This works in ESM
const config = await loadConfig();

// ❌ In CJS, you'd need:
async function init() {
  const config = await loadConfig();
  // ... rest of code
}
init();`}
        </pre>
      </div>
    </div>
  );
}


