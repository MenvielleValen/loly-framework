# Configuración del Framework

Loly Framework se configura mediante `loly.config.ts` (o `.js`, `.json`) en la raíz del proyecto.

## Archivo de Configuración

### loly.config.ts

```typescript
import { FrameworkConfig } from "@lolyjs/core";

export default {
  directories: {
    app: "app",
    build: ".loly",
    static: "public",
  },
  conventions: {
    page: "page",
    layout: "layout",
    notFound: "_not-found",
    error: "_error",
    api: "route",
  },
  routing: {
    trailingSlash: "ignore",
    caseSensitive: false,
    basePath: "",
  },
  build: {
    clientBundler: "rspack",
    serverBundler: "esbuild",
    outputFormat: "cjs",
  },
  server: {
    adapter: "express",
    port: 3000,
    host: "localhost",
  },
  rendering: {
    framework: "react",
    streaming: true,
    ssr: true,
    ssg: true,
  },
} satisfies FrameworkConfig;
```

### Configuración por Entorno

```typescript
export default (env: string): FrameworkConfig => {
  const isDev = env === "development";
  
  return {
    server: {
      port: isDev ? 3000 : process.env.PORT || 3000,
      host: isDev ? "localhost" : "0.0.0.0",
    },
    // ...
  };
};
```

## Opciones de Configuración

### directories

```typescript
directories: {
  app: "app",        // Directorio de la aplicación
  build: ".loly",    // Directorio de build output
  static: "public",  // Directorio de archivos estáticos (por defecto: "public")
}
```

**Nota sobre `static`**: Los archivos en este directorio se sirven en la raíz de la URL. Por ejemplo:
- `public/sitemap.xml` → disponible en `/sitemap.xml`
- `public/robots.txt` → disponible en `/robots.txt`
- `public/assets/logo.png` → disponible en `/assets/logo.png`

Los archivos estáticos tienen **prioridad sobre las rutas dinámicas**, lo cual es importante para SEO ya que permite que Google y otros motores de búsqueda encuentren archivos como `sitemap.xml` y `robots.txt` en las rutas estándar.

### conventions

```typescript
conventions: {
  page: "page",           // Nombre de archivo para páginas
  layout: "layout",       // Nombre de archivo para layouts
  notFound: "_not-found", // Nombre de archivo para 404
  error: "_error",        // Nombre de archivo para error
  api: "route",           // Nombre de archivo para API routes
}
```

### routing

```typescript
routing: {
  trailingSlash: "ignore",  // "always" | "never" | "ignore"
  caseSensitive: false,     // Si las rutas son case-sensitive
  basePath: "",             // Path base (ej: "/app")
}
```

### build

```typescript
build: {
  clientBundler: "rspack",  // "rspack" | "webpack" | "vite"
  serverBundler: "esbuild", // "esbuild" | "tsup" | "swc"
  outputFormat: "cjs",      // "cjs" | "esm"
}
```

### server

```typescript
server: {
  adapter: "express",  // "express" | "fastify" | "koa" (solo express actualmente)
  port: 3000,          // Puerto del servidor
  host: "localhost",   // Host del servidor
}
```

### rendering

```typescript
rendering: {
  framework: "react",  // "react" | "preact" | "vue" | "svelte" (solo react actualmente)
  streaming: true,     // Habilitar streaming SSR
  ssr: true,           // Habilitar SSR
  ssg: true,           // Habilitar SSG
}
```

## Configuración del Servidor

### ServerConfig

Puedes configurar el servidor (CORS, rate limiting, etc.) exportando una función `config` en `loly.config.ts`:

```typescript
// loly.config.ts
import { FrameworkConfig, ServerConfig } from "@lolyjs/core";

// Framework configuration
export default {
  directories: {
    app: "app",
    build: ".loly",
    static: "public",
  },
  // ...
} satisfies FrameworkConfig;

// Server configuration
export const config = (env: string): ServerConfig => {
  return {
    bodyLimit: "1mb",
    corsOrigin: "*",
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 1000,                // Máximo de requests
      strictMax: 5,             // Máximo para rutas estrictas
      strictPatterns: [
        "/api/search/**",
        "/api/favorites/**",
      ],
    },
  };
};
```

## Inicialización del Servidor

### init.server.ts

El archivo `init.server.ts` se ejecuta cuando Express inicia y permite inicializar servicios de tu aplicación (bases de datos, servicios externos, etc.). **No se usa para configurar Loly Framework**.

```typescript
// init.server.ts
import { InitServerData } from "@lolyjs/core";

export async function init({
  serverContext,
}: {
  serverContext: InitServerData;
}) {
  // Inicializar conexión a base de datos
  await connectToDatabase();
  
  // Setup de servicios externos
  await setupExternalServices();
  
  // Cualquier otra lógica de inicialización
  console.log("Servidor inicializado correctamente");
}
```

**Nota importante**: `init.server.ts` es para inicializar servicios de tu aplicación, no para configurar Loly. La configuración del framework va en `loly.config.ts`.

### Opciones de ServerConfig

```typescript
interface ServerConfig {
  bodyLimit?: string;              // Límite de tamaño de body
  corsOrigin?: string | string[];  // Orígenes CORS permitidos
  rateLimit?: {
    windowMs?: number;             // Ventana de tiempo en ms
    max?: number;                   // Máximo de requests
    strictMax?: number;             // Máximo para rutas estrictas
    strictPatterns?: string[];      // Patrones para rate limiting estricto
  };
}
```

## Variables de Entorno

### .env

```env
# Servidor
PORT=3000
HOST=0.0.0.0
NODE_ENV=production

# WebSocket
PUBLIC_WS_BASE_URL=http://localhost:3000

# Base de datos (ejemplo)
DATABASE_URL=postgresql://...
```

### Acceso en Código

```tsx
// En server loaders o API routes
const dbUrl = process.env.DATABASE_URL;
```

## Configuración por Entorno

### Desarrollo

```typescript
// loly.config.ts
export default (env: string) => {
  if (env === "development") {
    return {
      server: {
        port: 3000,
        host: "localhost",
      },
      // ...
    };
  }
  // ...
};
```

### Producción

```typescript
export default (env: string) => {
  if (env === "production") {
    return {
      server: {
        port: process.env.PORT || 3000,
        host: "0.0.0.0",
      },
      // ...
    };
  }
  // ...
};
```

## Configuración de TypeScript

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules", ".loly"]
}
```

## Path Aliases

### Configurar en tsconfig.json

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["./components/*"],
      "@/lib/*": ["./lib/*"]
    }
  }
}
```

### Usar en Código

```tsx
import { Button } from "@/components/ui/button";
import { getData } from "@/lib/utils";
```

## Próximos Pasos

- [Build System](./11-build.md) - Cómo funciona el build
- [Arquitectura](./02-arquitectura.md) - Arquitectura del framework
