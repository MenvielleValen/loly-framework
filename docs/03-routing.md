# Sistema de Routing

El sistema de routing de Loly está basado en archivos, similar a Next.js App Router. Las rutas se definen mediante la estructura de archivos en el directorio `app/`.

## Conceptos Básicos

### Páginas
Un archivo `page.tsx` (o `page.ts`, `page.jsx`, `page.js`) define una ruta:

```
app/page.tsx          → /
app/about/page.tsx    → /about
app/blog/page.tsx     → /blog
```

### Layouts
Los layouts envuelven páginas y se pueden anidar:

```
app/layout.tsx              → Layout raíz (envuelve todas las páginas)
app/blog/layout.tsx         → Layout de blog (envuelve /blog/*)
app/blog/[slug]/layout.tsx  → Layout de post (envuelve /blog/[slug])
```

## Rutas Estáticas

Las rutas estáticas se crean simplemente creando archivos `page.tsx`:

```tsx
// app/about/page.tsx
export default function AboutPage() {
  return <h1>Acerca de</h1>;
}
```

Esto crea la ruta `/about`.

## Rutas Dinámicas

### Parámetro Único
Usa corchetes `[param]` para parámetros dinámicos:

```
app/blog/[slug]/page.tsx  → /blog/:slug
```

```tsx
// app/blog/[slug]/page.tsx
export default function BlogPost({ params }) {
  return <h1>Post: {params.slug}</h1>;
}
```

### Múltiples Parámetros
Puedes tener múltiples parámetros en diferentes niveles:

```
app/shop/[category]/[product]/page.tsx  → /shop/:category/:product
```

### Catch-All Routes
Usa `[...slug]` para capturar múltiples segmentos:

```
app/docs/[...slug]/page.tsx  → /docs/* (ej: /docs/getting-started/installation)
```

```tsx
// app/docs/[...slug]/page.tsx
export default function DocsPage({ params }) {
  // params.slug es un array: ["getting-started", "installation"]
  return <div>{params.slug.join("/")}</div>;
}
```

### Optional Catch-All
Usa `[[...slug]]` para rutas opcionales:

```
app/shop/[[...slug]]/page.tsx  → /shop y /shop/*
```

## Acceso a Parámetros

### En el Componente
Los parámetros y props se pasan directamente al componente:

```tsx
export default function ProductPage({ params, props }) {
  return (
    <div>
      <h1>Producto: {params.id}</h1>
      <p>Precio: ${props.price}</p>
    </div>
  );
}
```

### En el Server Loader
Los parámetros están disponibles en `ServerContext`:

```tsx
import type { ServerLoader } from "@lolyjs/core";

export const getServerSideProps: ServerLoader = async (ctx) => {
  const { params } = ctx;
  const product = await getProduct(params.id);
  
  return {
    props: {
      product,
    },
  };
};
```

## Layouts

Los layouts se definen con `layout.tsx` y envuelven las páginas de su directorio y subdirectorios.

**⚠️ Importante**: Los layouts NO deben incluir `<html>` ni `<body>`. El framework maneja automáticamente la estructura HTML base. Los layouts solo deben contener el contenido que va dentro del body.

```tsx
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <div>
      <nav>Navegación</nav>
      {children}
      <footer>Footer</footer>
    </div>
  );
}
```

### Layouts Anidados
Los layouts se anidan automáticamente:

```
app/layout.tsx                    → Layout raíz
app/blog/layout.tsx               → Layout de blog (dentro de raíz)
app/blog/[slug]/layout.tsx        → Layout de post (dentro de blog y raíz)
```

El orden de renderizado es: RootLayout → BlogLayout → PostLayout → Page

### Props en Layouts
Los layouts reciben las mismas props que las páginas:

```tsx
// app/blog/layout.tsx
export default function BlogLayout({ children, props }) {
  return (
    <div>
      <aside>
        <h2>Categorías</h2>
        {props.categories.map(cat => (
          <div key={cat.id}>{cat.name}</div>
        ))}
      </aside>
      <main>{children}</main>
    </div>
  );
}
```

## Rutas Especiales

### Not Found (404)
Crea `_not-found.tsx` en `app/`:

```tsx
// app/_not-found.tsx
export default function NotFound() {
  return (
    <div>
      <h1>404</h1>
      <p>Página no encontrada</p>
    </div>
  );
}
```

### Error Page
Crea `_error.tsx` para manejar errores:

```tsx
// app/_error.tsx
export default function ErrorPage({ locals }) {
  const error = locals.error;
  
  return (
    <div>
      <h1>Error</h1>
      <p>{error?.message || "Algo salió mal"}</p>
    </div>
  );
}
```

## Navegación

### Componente Link
Usa el componente `Link` para navegación:

```tsx
import { Link } from "@lolyjs/core/components";

export default function Navigation() {
  return (
    <nav>
      <Link href="/">Home</Link>
      <Link href="/about">About</Link>
      <Link href="/blog/[slug]" params={{ slug: "my-post" }}>
        Mi Post
      </Link>
    </nav>
  );
}
```

### Navegación Programática
Usa `navigate` para navegación programática:

```tsx
import { navigate } from "@lolyjs/core/runtime";

function handleClick() {
  navigate("/dashboard");
}
```

## Middleware de Ruta

**Característica única de Loly**: Puedes agregar middleware directamente en tus rutas usando `page.server.hook.ts` (preferido) o `server.hook.ts` (legacy):

```tsx
// app/admin/page.server.hook.ts (preferido) o app/admin/server.hook.ts (legacy)
import type { RouteMiddleware, ServerLoader } from "@lolyjs/core";

export const beforeServerData: RouteMiddleware[] = [
  async (ctx, next) => {
    // Verificar autenticación
    if (!ctx.req.headers.authorization) {
      ctx.res.status(401).json({ error: "Unauthorized" });
      return;
    }
    ctx.locals.user = await getUser(ctx.req);
    await next();
  },
];

export const getServerSideProps: ServerLoader = async (ctx) => {
  return {
    props: {
      user: ctx.locals.user,
    },
  };
};
```

```tsx
// app/admin/page.tsx
export default function AdminPage({ props }) {
  return <h1>Admin: {props.user.name}</h1>;
}
```

Esta separación permite mantener la lógica del servidor separada de los componentes React, facilitando el testing y la organización del código.

## Generación de Rutas Estáticas

Para generar rutas estáticas en build time:

```tsx
// app/blog/[slug]/page.tsx
import type { GenerateStaticParams } from "@lolyjs/core";

export const generateStaticParams: GenerateStaticParams = async () => {
  const posts = await getAllPosts();
  return posts.map(post => ({
    slug: post.slug,
  }));
};

export default function BlogPost() {
  // ...
}
```

## Configuración de Routing

En `loly.config.ts`:

```typescript
export default {
  routing: {
    trailingSlash: "ignore",  // "always" | "never" | "ignore"
    caseSensitive: false,      // Si las rutas son case-sensitive
    basePath: "",              // Path base (ej: "/app")
  },
};
```

## Ejemplos Completos

### Blog con Categorías

```
app/
├── layout.tsx
├── page.tsx                    → /
├── blog/
│   ├── layout.tsx
│   ├── page.tsx                → /blog
│   └── [slug]/
│       └── page.tsx            → /blog/:slug
└── category/
    └── [name]/
        └── page.tsx            → /category/:name
```

### E-commerce

```
app/
├── shop/
│   ├── page.tsx                → /shop
│   ├── [category]/
│   │   ├── page.tsx            → /shop/:category
│   │   └── [product]/
│   │       └── page.tsx        → /shop/:category/:product
│   └── checkout/
│       └── page.tsx            → /shop/checkout
```

## URL Rewrites

Los rewrites permiten reescribir rutas internamente sin cambiar la URL visible en el navegador. Esto es especialmente útil para multitenancy, proxy de APIs y otros escenarios avanzados de routing.

### Configuración

Crea `rewrites.config.ts` en la raíz del proyecto:

```typescript
import type { RewriteConfig } from "@lolyjs/core";

export default async function rewrites(): Promise<RewriteConfig> {
  return [
    // Rewrite estático
    {
      source: "/old-path",
      destination: "/new-path",
    },
    
    // Rewrite con parámetros
    {
      source: "/tenant/:tenant/:path*",
      destination: "/project/:tenant/:path*",
    },
    
    // Rewrite condicional por host (multitenant por subdomain)
    {
      source: "/:path*",
      has: [
        { type: "host", value: ":tenant.localhost" },
      ],
      destination: "/project/:tenant/:path*",
    },
  ];
}
```

### Multitenancy por Subdomain

El caso de uso más común es multitenancy donde cada tenant tiene su propio subdomain:

```typescript
// rewrites.config.ts
export default async function rewrites(): Promise<RewriteConfig> {
  return [
    // Catch-all: tenant1.localhost:3000/* → /project/tenant1/*
    {
      source: "/:path*",
      has: [
        { 
          type: "host", 
          value: ":tenant.localhost"  // Captura tenant del subdomain
        }
      ],
      destination: "/project/:tenant/:path*",
    },
  ];
}
```

**Cómo funciona:**
- Usuario visita: `tenant1.localhost:3000/dashboard`
- Internamente se reescribe a: `/project/tenant1/dashboard`
- URL visible en navegador: `tenant1.localhost:3000/dashboard` (sin cambios)
- La ruta `/project/[tenantId]/dashboard` recibe `params.tenantId = "tenant1"`

### Comportamiento (como Next.js)

- Los rewrites se aplican **SIEMPRE** si el patrón source coincide
- Si la ruta reescrita no existe, se devuelve 404 (comportamiento estricto, sin fallback)
- Los catch-all (`/:path*`) están completamente soportados y recomendados para multitenancy
- Las rutas de API pueden reescribirse (como Next.js)
- Las rutas WSS (`/wss/*`) se excluyen automáticamente (manejadas por Socket.IO)
- Las rutas del sistema (`/static/*`, `/__fw/*`, `/favicon.ico`) se excluyen automáticamente

### Acceso a Parámetros Extraídos

Los parámetros extraídos de rewrites (incluyendo condiciones de host) están disponibles en:

- `req.query` - Query parameters
- `req.locals` - Request locals (para server hooks)
- `ctx.params` - Route parameters (si la ruta reescrita coincide con una ruta dinámica)

```typescript
// app/project/[tenantId]/dashboard/page.server.hook.ts
export const getServerSideProps: ServerLoader = async (ctx) => {
  // tenantId viene del rewrite: /project/:tenant/:path*
  const tenantId = ctx.params.tenantId;
  
  // También disponible en req.query y req.locals
  const tenantFromQuery = ctx.req.query.tenant;
  const tenantFromLocals = ctx.req.locals?.tenant;
  
  return { props: { tenantId } };
};
```

### Condiciones

Los rewrites pueden ser condicionales basados en propiedades de la request:

```typescript
export default async function rewrites(): Promise<RewriteConfig> {
  return [
    // Rewrite basado en host
    {
      source: "/:path*",
      has: [
        { type: "host", value: "api.example.com" },
      ],
      destination: "/api/:path*",
    },
    
    // Rewrite basado en header
    {
      source: "/admin/:path*",
      has: [
        { type: "header", key: "X-Admin-Key", value: "secret" },
      ],
      destination: "/admin-panel/:path*",
    },
    
    // Rewrite basado en cookie
    {
      source: "/premium/:path*",
      has: [
        { type: "cookie", key: "premium", value: "true" },
      ],
      destination: "/premium-content/:path*",
    },
    
    // Rewrite basado en query parameter
    {
      source: "/:path*",
      has: [
        { type: "query", key: "version", value: "v2" },
      ],
      destination: "/v2/:path*",
    },
  ];
}
```

### Sintaxis de Patrones

- `:param` - Parámetro nombrado (coincide con un segmento)
- `:param*` - Catch-all nombrado (coincide con el path restante)
- `*` - Catch-all anónimo (coincide con el path restante)

### Notas Importantes

- Los rewrites se aplican **antes** del route matching
- La URL original se preserva en el navegador (no es un redirect)
- Los query parameters se preservan y pueden extenderse
- Los rewrites funcionan tanto para páginas como para rutas de API
- Las funciones en destinos de rewrite no pueden serializarse en builds de producción (solo rewrites estáticos se incluyen en el manifest)
- Los rewrites se evalúan en orden - el primer match gana

## Próximos Pasos

- [Server Loaders](./04-server-loaders.md) - Data fetching en rutas
- [API Routes](./05-api-routes.md) - Crear endpoints API
- [Middleware](./08-middleware.md) - Middleware system
