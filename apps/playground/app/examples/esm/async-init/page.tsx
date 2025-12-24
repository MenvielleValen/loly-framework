type Props = {
  data: {
    db: string;
    config: { env: string };
    timestamp: number;
    initialized: boolean;
  };
  isInitialized: boolean;
  message: string;
  explanation: string;
};

export default function AsyncInitPage({
  data,
  isInitialized,
  message,
  explanation,
}: Props) {
  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-4">Async Module Initialization</h1>
      <p className="text-lg mb-6 text-muted-foreground">{message}</p>

      <div className="bg-muted p-6 rounded-lg mb-6">
        <h2 className="font-semibold mb-3 text-xl">Module Data:</h2>
        <div className="space-y-2 mb-4">
          <div>
            <span className="font-medium">Initialized: </span>
            <span className={isInitialized ? "text-green-600" : "text-red-600"}>
              {isInitialized ? "✅ Yes" : "❌ No"}
            </span>
          </div>
          <div>
            <span className="font-medium">DB Status: </span>
            <span>{data.db}</span>
          </div>
          <div>
            <span className="font-medium">Environment: </span>
            <span>{data.config.env}</span>
          </div>
          <div>
            <span className="font-medium">Initialized At: </span>
            <span>{new Date(data.timestamp).toLocaleString()}</span>
          </div>
        </div>
        <pre className="text-sm bg-background p-4 rounded overflow-x-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950 p-6 rounded-lg mb-4">
        <p className="font-semibold mb-2 text-lg">✨ ESM Feature:</p>
        <p className="text-sm">{explanation}</p>
      </div>

      <div className="mt-8 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
        <h3 className="font-semibold mb-2">Code Example:</h3>
        <pre className="text-xs overflow-x-auto">
          {`// ✅ ESM - Module initializes itself
// lib/async-init.ts
export const data = await init(); // Top-level await

// page.server.hook.ts
import { data } from "../../../lib/async-init";
// data is already initialized!

// ❌ CJS - Would need manual initialization
const initModule = async () => {
  const data = await init();
  return data;
};
const data = await initModule();`}
        </pre>
      </div>
    </div>
  );
}

