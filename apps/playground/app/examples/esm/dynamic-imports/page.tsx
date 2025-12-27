type Feature = {
  name: string;
  loaded: boolean;
  source?: string;
};

type Props = {
  features: Feature[];
  message: string;
  explanation: string;
};

export default function DynamicImportsPage({
  features,
  message,
  explanation,
}: Props) {
  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-4">Dynamic Imports Example</h1>
      <p className="text-lg mb-6 text-muted-foreground">{message}</p>

      <div className="bg-muted p-6 rounded-lg mb-6">
        <h2 className="font-semibold mb-4 text-xl">Import Results:</h2>
        <div className="space-y-3">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-background rounded"
            >
              <div className="flex-1">
                <div className="font-medium">{feature.name}</div>
                {feature.source && (
                  <div className="text-sm text-muted-foreground">
                    {feature.source}
                  </div>
                )}
              </div>
              <div
                className={`px-3 py-1 rounded text-sm font-medium ${
                  feature.loaded
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                {feature.loaded ? "✅ Loaded" : "❌ Not Found"}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950 p-6 rounded-lg mb-4">
        <p className="font-semibold mb-2 text-lg">✨ ESM Feature:</p>
        <p className="text-sm">{explanation}</p>
      </div>

      <div className="mt-8 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
        <h3 className="font-semibold mb-2">Code Examples:</h3>
        <pre className="text-xs overflow-x-auto mb-4">
          {`// ✅ ESM - Template literal imports
const module = await import(\`@/lib/\${moduleName}\`);

// ✅ ESM - Parallel imports
const [a, b] = await Promise.all([
  import("@/lib/a"),
  import("@/lib/b")
]);

// ✅ ESM - Conditional imports
if (condition) {
  const mod = await import("@/lib/conditional");
}

// ❌ CJS - require() is synchronous, no template literals
const module = require("@/lib/" + moduleName); // Works but less flexible`}
        </pre>
      </div>
    </div>
  );
}


