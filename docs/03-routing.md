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
import { usePageProps } from "@lolyjs/core/hooks";

export default function BlogPost() {
  const { params } = usePageProps();
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
export default function DocsPage() {
  const { params } = usePageProps();
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
Usa el hook `usePageProps`:

```tsx
import { usePageProps } from "@lolyjs/core/hooks";

export default function ProductPage() {
  const { params, props } = usePageProps();
  
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
import { usePageProps } from "@lolyjs/core/hooks";

export default function ErrorPage() {
  const { params, locals } = usePageProps();
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

**Característica única de Loly**: Puedes agregar middleware directamente en tus rutas usando `server.hook.ts`:

```tsx
// app/admin/server.hook.ts
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
import { usePageProps } from "@lolyjs/core/hooks";

export default function AdminPage() {
  const { props } = usePageProps();
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

## Próximos Pasos

- [Server Loaders](./04-server-loaders.md) - Data fetching en rutas
- [API Routes](./05-api-routes.md) - Crear endpoints API
- [Middleware](./08-middleware.md) - Middleware system
