import { ServerToClientExample } from "@/components/examples/ServerToClientExample.client";

type ServerToClientPageProps = {
  title?: string;
  count?: number;
  isActive?: boolean;
  score?: number;
  user?: {
    id: number;
    name: string;
    email: string;
    profile: {
      avatar: string;
      bio: string;
      location: {
        city: string;
        country: string;
        coordinates: {
          lat: number;
          lng: number;
        };
      };
    };
    preferences: {
      theme: string;
      notifications: boolean;
      language: string;
    };
  };
  items?: Array<{
    id: number;
    name: string;
    price: number;
    inStock: boolean;
  }>;
  createdAt?: string;
  updatedAt?: string;
  tags?: string[];
  optionalField?: null;
  matrix?: number[][];
  emptyArray?: any[];
  emptyObject?: Record<string, any>;
};

export default function ServerToClientPage(props: ServerToClientPageProps) {
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-4">Server-to-Client Data Flow</h1>
          <p className="text-muted-foreground">
            This example demonstrates how to pass complex data from <code>page.server.hook.ts</code> 
            to client components, including nested objects, arrays, dates, and more.
          </p>
        </div>

        {/* Server Component - muestra datos directamente */}
        <div className="p-6 border rounded-lg bg-muted/20">
          <h2 className="text-xl font-semibold mb-4">Server Component (direct data)</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Title:</strong> {props.title}</p>
            <p><strong>Count:</strong> {props.count}</p>
            <p><strong>Is Active:</strong> {props.isActive ? "Yes" : "No"}</p>
            <p><strong>User:</strong> {props.user?.name} ({props.user?.email})</p>
            <p><strong>Items Count:</strong> {props.items?.length || 0}</p>
          </div>
        </div>

        {/* Client Component - recibe props del servidor */}
        <div className="p-6 border rounded-lg">
          <ServerToClientExample {...props} />
        </div>

        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
          <h3 className="font-semibold">Edge Cases Tested:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li><strong>Nested objects:</strong> user.profile.location.coordinates</li>
            <li><strong>Object arrays:</strong> items[] with complex properties</li>
            <li><strong>Dates:</strong> Serialized as ISO strings, parsed on client</li>
            <li><strong>Nested arrays:</strong> matrix[][] (2D matrices)</li>
            <li><strong>Null values:</strong> optionalField can be null</li>
            <li><strong>Empty structures:</strong> emptyArray[], emptyObject{}</li>
            <li><strong>Primitive types:</strong> strings, numbers, booleans</li>
            <li><strong>Optional props:</strong> All fields are optional with ?</li>
          </ul>
        </div>

        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg space-y-2 text-sm">
          <p className="font-semibold">💡 Important notes:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Functions are NOT serialized (automatically filtered)</li>
            <li>React elements are NOT serialized (automatically filtered)</li>
            <li>Dates are serialized as ISO strings and must be parsed on the client</li>
            <li>Undefined values are omitted from the final JSON</li>
            <li>Null values are preserved and passed to the client</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

