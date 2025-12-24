type Props = {
  moduleUrl: string;
  moduleDir: string;
  data: any;
  message: string;
  explanation: string;
};

export default function ImportMetaPage({
  moduleUrl,
  moduleDir,
  data,
  message,
  explanation,
}: Props) {
  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-4">Import.meta Example</h1>
      <p className="text-lg mb-6 text-muted-foreground">{message}</p>

      <div className="space-y-4 mb-6">
        <div className="bg-muted p-4 rounded-lg">
          <h2 className="font-semibold mb-2">Module URL (import.meta.url):</h2>
          <code className="text-sm break-all">{moduleUrl}</code>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h2 className="font-semibold mb-2">Module Directory:</h2>
          <code className="text-sm break-all">{moduleDir}</code>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h2 className="font-semibold mb-2">Data from local file:</h2>
          <pre className="text-sm bg-background p-4 rounded overflow-x-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950 p-6 rounded-lg mb-4">
        <p className="font-semibold mb-2 text-lg">✨ ESM Feature:</p>
        <p className="text-sm">{explanation}</p>
      </div>

      <div className="mt-8 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
        <h3 className="font-semibold mb-2">Code Example:</h3>
        <pre className="text-xs overflow-x-auto">
          {`// ✅ ESM - import.meta.url
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);

// ❌ CJS - __dirname (not available in ESM)
const filePath = path.join(__dirname, "data.json");`}
        </pre>
      </div>
    </div>
  );
}

