import { useState, useEffect } from "react";

type User = {
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

type Item = {
  id: number;
  name: string;
  price: number;
  inStock: boolean;
};

type ServerToClientExampleProps = {
  title?: string;
  count?: number;
  isActive?: boolean;
  score?: number;
  user?: User;
  items?: Item[];
  createdAt?: string;
  updatedAt?: string;
  tags?: string[];
  optionalField?: null;
  matrix?: number[][];
  emptyArray?: any[];
  emptyObject?: Record<string, any>;
};

export function ServerToClientExample(props: ServerToClientExampleProps) {
  const [parsedDates, setParsedDates] = useState<{
    createdAt: Date | null;
    updatedAt: Date | null;
  }>({ createdAt: null, updatedAt: null });

  useEffect(() => {
    // Parse dates from ISO strings (they come as strings from server)
    if (props.createdAt) {
      setParsedDates(prev => ({
        ...prev,
        createdAt: new Date(props.createdAt!),
      }));
    }
    if (props.updatedAt) {
      setParsedDates(prev => ({
        ...prev,
        updatedAt: new Date(props.updatedAt!),
      }));
    }
  }, [props.createdAt, props.updatedAt]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Client Component (recibe props del servidor)</h2>

      {/* Primitives */}
      <section className="p-4 border rounded-lg">
        <h3 className="font-semibold mb-3">Primitivos</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><strong>Title:</strong> {props.title || "N/A"}</div>
          <div><strong>Count:</strong> {props.count ?? "N/A"}</div>
          <div><strong>Is Active:</strong> {props.isActive ? "✅ Yes" : "❌ No"}</div>
          <div><strong>Score:</strong> {props.score?.toFixed(2) || "N/A"}</div>
        </div>
      </section>

      {/* User Object (nested) */}
      {props.user && (
        <section className="p-4 border rounded-lg">
          <h3 className="font-semibold mb-3">Objeto Anidado (User)</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <img
                src={props.user.profile.avatar}
                alt={props.user.name}
                className="w-16 h-16 rounded-full"
              />
              <div>
                <p className="font-medium">{props.user.name}</p>
                <p className="text-sm text-muted-foreground">{props.user.email}</p>
              </div>
            </div>
            <div className="text-sm space-y-1">
              <p><strong>Bio:</strong> {props.user.profile.bio}</p>
              <p>
                <strong>Location:</strong> {props.user.profile.location.city}, {props.user.profile.location.country}
              </p>
              <p>
                <strong>Coordinates:</strong> {props.user.profile.location.coordinates.lat.toFixed(4)}, {props.user.profile.location.coordinates.lng.toFixed(4)}
              </p>
              <p>
                <strong>Preferences:</strong> Theme: {props.user.preferences.theme}, 
                Notifications: {props.user.preferences.notifications ? "On" : "Off"}, 
                Language: {props.user.preferences.language}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Items Array */}
      {props.items && props.items.length > 0 && (
        <section className="p-4 border rounded-lg">
          <h3 className="font-semibold mb-3">Array de Objetos (Items)</h3>
          <div className="space-y-2">
            {props.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 bg-muted/50 rounded"
              >
                <div>
                  <span className="font-medium">{item.name}</span>
                  <span className="text-sm text-muted-foreground ml-2">
                    ${item.price.toFixed(2)}
                  </span>
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    item.inStock
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                  }`}
                >
                  {item.inStock ? "In Stock" : "Out of Stock"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Dates */}
      {(parsedDates.createdAt || parsedDates.updatedAt) && (
        <section className="p-4 border rounded-lg">
          <h3 className="font-semibold mb-3">Fechas (parseadas desde ISO strings)</h3>
          <div className="text-sm space-y-1">
            {parsedDates.createdAt && (
              <p>
                <strong>Created:</strong> {parsedDates.createdAt.toLocaleString()}
              </p>
            )}
            {parsedDates.updatedAt && (
              <p>
                <strong>Updated:</strong> {parsedDates.updatedAt.toLocaleString()}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Tags Array */}
      {props.tags && props.tags.length > 0 && (
        <section className="p-4 border rounded-lg">
          <h3 className="font-semibold mb-3">Array de Strings (Tags)</h3>
          <div className="flex flex-wrap gap-2">
            {props.tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-primary/10 text-primary rounded text-sm"
              >
                #{tag}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Matrix (2D Array) */}
      {props.matrix && props.matrix.length > 0 && (
        <section className="p-4 border rounded-lg">
          <h3 className="font-semibold mb-3">Array Anidado (Matrix 2D)</h3>
          <div className="grid grid-cols-3 gap-2 max-w-xs">
            {props.matrix.map((row, rowIdx) =>
              row.map((cell, colIdx) => (
                <div
                  key={`${rowIdx}-${colIdx}`}
                  className="p-2 bg-muted/50 rounded text-center text-sm font-mono"
                >
                  {cell}
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* Null handling */}
      <section className="p-4 border rounded-lg">
        <h3 className="font-semibold mb-3">Manejo de Null/Undefined</h3>
        <div className="text-sm space-y-1">
          <p>
            <strong>optionalField:</strong> {props.optionalField === null ? "null ✅" : "undefined"}
          </p>
          <p>
            <strong>emptyArray:</strong> {props.emptyArray?.length === 0 ? "[] (empty) ✅" : "N/A"}
          </p>
          <p>
            <strong>emptyObject:</strong> {props.emptyObject && Object.keys(props.emptyObject).length === 0 ? "{} (empty) ✅" : "N/A"}
          </p>
        </div>
      </section>

      {/* Raw Props Debug */}
      <details className="p-4 border rounded-lg">
        <summary className="cursor-pointer font-semibold text-sm">
          🔍 Ver Props Raw (Debug)
        </summary>
        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-64">
          {JSON.stringify(props, null, 2)}
        </pre>
      </details>
    </div>
  );
}

