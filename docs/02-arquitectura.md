# Arquitectura del Framework

## Visión General

Loly Framework sigue una arquitectura modular y extensible, diseñada para ser fácil de entender y mantener. El framework se divide en módulos independientes que trabajan juntos para proporcionar una experiencia de desarrollo completa.

## Componentes Principales

### 1. Router Module (`modules/router/`)
Sistema de routing basado en archivos que:
- Escanea el directorio `app/` para encontrar rutas
- Genera patrones de ruta y regex para matching
- Carga componentes, layouts y loaders
- Soporta rutas dinámicas y catch-all
- Genera manifestos para producción

**Archivos clave:**
- `loader-pages.ts` - Carga páginas desde el filesystem
- `loader-api.ts` - Carga API routes
- `loader-wss.ts` - Carga WebSocket routes
- `matcher.ts` - Matching de rutas
- `manifest.ts` - Generación de manifestos

### 2. Server Module (`modules/server/`)
Servidor Express con integración completa:
- Setup de aplicación Express
- Handlers para páginas, API y WebSockets
- Middleware system
- Rate limiting
- Seguridad (Helmet, CORS)
- Logging por request

**Archivos clave:**
- `application.ts` - Setup de Express app
- `handlers/pages.ts` - Handler de páginas con SSR
- `handlers/api.ts` - Handler de API routes
- `handlers/wss.ts` - Handler de WebSocket events
- `middleware/` - Middlewares del framework

### 3. Rendering Module (`modules/rendering/`)
Sistema de renderizado:
- SSR con React Server Components
- Streaming con `renderToPipeableStream`
- SSG para páginas estáticas
- Construcción de árbol de componentes
- Inyección de datos iniciales

**Archivos clave:**
- `createDocumentTree/` - Construcción del HTML
- `initialData/` - Serialización de datos iniciales

### 4. Build Module (`modules/build/`)
Sistema de build y bundling:
- Bundling del cliente con Rspack
- Bundling del servidor con esbuild
- Code splitting automático
- Generación de SSG
- Hot reload en desarrollo

**Archivos clave:**
- `bundler/client.ts` - Build del cliente
- `bundler/server.ts` - Build del servidor
- `ssg/` - Static Site Generation

### 5. Runtime Client (`modules/runtime/client/`)
Cliente React para navegación y hydratación:
- Bootstrap del cliente
- Route matching en cliente
- Navegación SPA
- Hydratación de componentes
- Gestión de estado de rutas

**Archivos clave:**
- `bootstrap.tsx` - Inicialización del cliente
- `RouterView.tsx` - Componente de routing
- `navigation.ts` - Navegación programática
- `route-matcher.ts` - Matching en cliente

### 6. React Module (`modules/react/`)
Utilidades React:
- Componentes (`Link`, `Image`)
- Hooks (`useBroadcastChannel`)
- Sockets client (`lolySocket`)
- Temas
- Client cache

## Flujo de una Request

### 1. Request HTTP Llega al Servidor

```
HTTP Request → Express App → Middleware Global → Static Files Check → Route Matcher
```

### 2. Verificación de Archivos Estáticos

Antes de buscar rutas dinámicas, el servidor verifica si existe un archivo estático en `public/`:
- Si existe `public/sitemap.xml`, se sirve en `/sitemap.xml`
- Los archivos estáticos tienen **prioridad sobre las rutas dinámicas**
- Si no se encuentra un archivo estático, continúa con el matching de rutas

### 3. Matching de Ruta

El router busca la ruta que coincide con el path:
- Compara el path con los patrones de ruta
- Extrae parámetros dinámicos
- Sanitiza los parámetros

### 4. Ejecución de Middlewares

Si la ruta tiene middlewares:
- Se ejecutan en orden
- Pueden modificar `ctx.locals`
- Pueden terminar la request (redirect, error)

### 5. Ejecución del Loader

Para páginas:
- Se ejecuta `getServerSideProps` o `loader`
- Puede hacer fetch de datos
- Retorna `props`, `metadata`, `redirect`, etc.

### 6. Renderizado

**Para páginas HTML:**
- Se construye el árbol de componentes (layouts + page)
- Se renderiza con `renderToPipeableStream`
- Se inyecta `initialData` en el HTML
- Se envía el stream al cliente

**Para API routes:**
- Se ejecuta el handler correspondiente (GET, POST, etc.)
- Se retorna JSON

**Para WebSocket:**
- Se maneja la conexión Socket.IO
- Se registran los event handlers

### 7. Hydratación en el Cliente

- El cliente recibe el HTML con `initialData`
- Se carga el bundle JavaScript
- Se hidrata el componente React
- Se inicializa el router para navegación SPA

## Estructura de Datos

### LoadedRoute

```typescript
interface LoadedRoute {
  pattern: string;              // Patrón de ruta: "/blog/[slug]"
  regex: RegExp;                 // Regex para matching
  paramNames: string[];          // Nombres de parámetros: ["slug"]
  component: PageComponent;      // Componente React
  layouts: PageComponent[];      // Layouts anidados
  pageFile: string;              // Ruta del archivo
  layoutFiles: string[];          // Rutas de layouts
  middlewares: RouteMiddleware[]; // Middlewares de ruta
  loader: ServerLoader | null;   // Server loader
  dynamic: DynamicMode;          // "auto" | "force-static" | "force-dynamic"
  generateStaticParams: GenerateStaticParams | null;
}
```

### ServerContext

```typescript
interface ServerContext {
  req: Request;                   // Express Request
  res: Response;                  // Express Response
  params: Record<string, string>; // Parámetros de ruta
  pathname: string;               // Path de la request
  locals: Record<string, any>;    // Datos locales (middleware)
  Redirect: (destination: string, permanent?: boolean) => RedirectResponse;
  NotFound: () => NotFoundResponse;
}
```

### LoaderResult

```typescript
interface LoaderResult {
  props?: Record<string, any>;    // Props para el componente
  metadata?: PageMetadata;       // Metadata de la página
  className?: string;            // Clase CSS para body
  theme?: string;                 // Tema (dark/light)
  pathname?: string;             // Pathname opcional (para rewrites)
}
```

**Nota:** Para redirecciones y 404, usa `ctx.Redirect()` y `ctx.NotFound()` que retornan `RedirectResponse` y `NotFoundResponse` respectivamente. Estos no forman parte de `LoaderResult`.

## Modos de Renderizado

Loly Framework soporta tres estrategias principales:

### force-dynamic (SSR)
La página siempre se renderiza en el servidor en cada request:
```tsx
// app/page.server.hook.ts (preferido) o app/server.hook.ts (legacy)
export const dynamic = "force-dynamic" as const;
```

### force-static (SSG)
La página se genera estáticamente en build time:
```tsx
// app/page.server.hook.ts (preferido) o app/server.hook.ts (legacy)
export const dynamic = "force-static" as const;
```

### CSR (Client-Side)
Sin `page.server.hook.ts` o `server.hook.ts`, la página se renderiza completamente en el cliente.

### auto (default)
El framework decide automáticamente basado en:
- Si tiene `getServerSideProps` → SSR (dynamic)
- Si tiene `generateStaticParams` → SSG (static)
- Si no tiene ninguno → SSG (static)

## Configuración

El framework se configura mediante `loly.config.ts`:

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

## Inicialización del Servidor

El servidor se inicializa automáticamente cuando Express inicia. Puedes usar `init.server.ts` para inicializar servicios de tu aplicación:

```typescript
// init.server.ts
import { InitServerData } from "@lolyjs/core";

export async function init({ serverContext }: { serverContext: InitServerData }) {
  // Inicialización de base de datos
  await connectToDatabase();
  
  // Setup de servicios externos
  await setupExternalServices();
  
  // Cualquier otra lógica de inicialización
}
```

**Nota**: `init.server.ts` es para inicializar servicios de tu aplicación, no para configurar Loly Framework. La configuración del framework va en `loly.config.ts`.

## Próximos Pasos

- [Routing](./02-routing.md) - Detalles del sistema de routing
- [Server Loaders](./04-server-loaders.md) - Data fetching
- [Rendering](./07-rendering.md) - SSR y SSG
