# Server Loaders

Los Server Loaders son funciones que se ejecutan en el servidor antes de renderizar una página. Permiten obtener datos, realizar autenticación, redirecciones y configurar metadata.

## Conceptos Básicos

Un Server Loader es una función que:
- Se ejecuta en el servidor en cada request (o en build time para SSG)
- Tiene acceso a `ServerContext` (request, response, params, etc.)
- Retorna datos que se pasan como props al componente
- Puede retornar redirecciones, 404, o metadata

## Definición Básica

Los server loaders se definen en un archivo separado en el mismo directorio que la página:

**Para páginas**: `page.server.hook.ts` (preferido) o `server.hook.ts` (legacy, backward compatible)
**Para layouts**: `layout.server.hook.ts` (mismo directorio que `layout.tsx`)

```tsx
// app/page.tsx
export default function HomePage({ props }) {
  return <div>{props.data}</div>;
}
```

```tsx
// app/page.server.hook.ts (preferido) o app/server.hook.ts (legacy)
import type { ServerLoader } from "@lolyjs/core";

export const getServerSideProps: ServerLoader = async (ctx) => {
  // ctx contiene: req, res, params, pathname, locals
  const data = await fetchData();
  
  return {
    props: {
      data,
    },
  };
};
```

**Nota importante**: 
- El loader debe estar en un archivo separado, no en el mismo archivo que el componente
- `page.server.hook.ts` es el nombre preferido para consistencia con `layout.server.hook.ts`
- `server.hook.ts` sigue siendo soportado para backward compatibility

## Layout Server Hooks

Los layouts pueden tener sus propios server hooks que proporcionan datos estables compartidos entre todas las páginas. Los props del layout se combinan automáticamente con los props de la página.

### Definición

Crea `layout.server.hook.ts` en el mismo directorio que `layout.tsx`:

```tsx
// app/layout.server.hook.ts (mismo directorio que app/layout.tsx)
import type { ServerLoader } from "@lolyjs/core";

export const getServerSideProps: ServerLoader = async (ctx) => {
  // Datos estables que se comparten entre todas las páginas
  return {
    props: {
      appName: "My App",
      navigation: [
        { href: "/", label: "Home" },
        { href: "/about", label: "About" },
        { href: "/blog", label: "Blog" },
      ],
    },
    metadata: {
      // Metadata base para todas las páginas
      description: "My App - Description",
      openGraph: {
        siteName: "My App",
        type: "website",
      },
    },
  };
};
```

### Comportamiento de Ejecución

**Layout Hooks:**
- ✅ Se ejecutan en la **carga inicial** (SSR)
- ❌ **NO se ejecutan** durante la navegación SPA (client-side routing)
- ✅ Se ejecutan cuando se llama `revalidate()` o `revalidatePath()`
- Los props del layout se **preservan** entre navegaciones SPA

**Page Hooks:**
- ✅ Se ejecutan en la **carga inicial** (SSR)
- ✅ Se ejecutan en **cada navegación SPA**
- ✅ Se ejecutan cuando se llama `revalidate()` o `revalidatePath()`

Esta optimización mejora el rendimiento al evitar ejecutar hooks costosos del layout en cada navegación, ya que los datos del layout suelen ser estables (navegación, configuración de la app, etc.).

### Revalidación Manual

Para forzar la ejecución de todos los hooks (layout + page) y actualizar los datos:

```tsx
import { revalidate } from "@lolyjs/core/client-cache";

export default function MyPage({ props }) {
  const handleRefresh = async () => {
    // Fuerza la ejecución de TODOS los hooks (layout + page)
    await revalidate();
  };
  
  return (
    <div>
      <button onClick={handleRefresh}>Actualizar Datos</button>
      {/* ... */}
    </div>
  );
}
```

### Combinación de Props

- **Layout props** (de `layout.server.hook.ts`) son estables y disponibles tanto en el layout como en todas las páginas
- **Page props** (de `page.server.hook.ts`) son específicos de cada página y sobrescriben layout props si hay conflicto
- **Props combinados** están disponibles tanto en layouts como en páginas
- Los **layout props se preservan** entre navegaciones SPA, mientras que los **page props se actualizan** en cada navegación

```tsx
// app/layout.tsx
export default function RootLayout({ children, appName, navigation, user }) {
  // appName y navigation vienen del layout.server.hook.ts
  // user puede venir del page.server.hook.ts (si existe)
  return (
    <div>
      <nav>{navigation.map(...)}</nav>
      <div>App: {appName}</div>
      {children}
    </div>
  );
}
```

### Combinación de Metadata

La metadata también se combina inteligentemente:
- **Layout metadata** actúa como base/fallback
- **Page metadata** sobrescribe campos específicos
- Los objetos anidados (openGraph, twitter) se combinan shallow

Ver la sección "Metadata" más abajo para más detalles.

## ServerContext

El contexto del servidor proporciona acceso a:

```typescript
interface ServerContext {
  req: Request;                   // Express Request
  res: Response;                  // Express Response
  params: Record<string, string>; // Parámetros de ruta
  pathname: string;               // Path de la request
  locals: Record<string, any>;    // Datos locales (de middlewares)
  Redirect: (destination: string, permanent?: boolean) => RedirectResponse;
  NotFound: () => NotFoundResponse;
}
```

Los métodos `Redirect()` y `NotFound()` son helpers que permiten redirigir o retornar 404 de manera explícita desde el loader.

### Ejemplo con Parámetros

```tsx
// app/blog/[slug]/page.tsx
export const getServerSideProps: ServerLoader = async (ctx) => {
  const { params } = ctx;
  const post = await getPostBySlug(params.slug);
  
  if (!post) {
    return ctx.NotFound();
  }
  
  return {
    props: {
      post,
    },
  };
};
```

### Ejemplo con Query Parameters

```tsx
export const getServerSideProps: ServerLoader = async (ctx) => {
  const { req } = ctx;
  const page = req.query.page || "1";
  const limit = req.query.limit || "10";
  
  const posts = await getPosts({
    page: Number(page),
    limit: Number(limit),
  });
  
  return {
    props: {
      posts,
      page: Number(page),
    },
  };
};
```

## Retorno del Loader

### Props
Datos que se pasan al componente:

```tsx
return {
  props: {
    user: { name: "John" },
    posts: [...],
  },
};
```

### Redirect
Redirigir a otra página usando `ctx.Redirect()`:

```tsx
export const getServerSideProps: ServerLoader = async (ctx) => {
  if (!user) {
    return ctx.Redirect("/login", false);  // permanent: false (307), true (301)
  }
  
  return { props: { user } };
};
```

### Not Found
Marcar la página como 404 usando `ctx.NotFound()`:

```tsx
export const getServerSideProps: ServerLoader = async (ctx) => {
  const post = await getPost(ctx.params.id);
  
  if (!post) {
    return ctx.NotFound();
  }
  
  return { props: { post } };
};
```

### Metadata
Configurar metadata de la página para SEO y social sharing:

**Metadata Básica:**

```tsx
return {
  props: { post },
  metadata: {
    title: post.title,
    description: post.excerpt,
    canonical: `https://mysite.com/blog/${post.slug}`,
    robots: "index, follow",
    themeColor: "#000000",
  },
};
```

**Open Graph (para compartir en redes sociales):**

```tsx
metadata: {
  title: post.title,
  description: post.excerpt,
  openGraph: {
    title: post.title,
    description: post.excerpt,
    type: "article",
    url: `https://mysite.com/blog/${post.slug}`,
    image: {
      url: post.imageUrl,
      width: 1200,
      height: 630,
      alt: post.title,
    },
    siteName: "My Site",
    locale: "es_ES",
  },
}
```

**Twitter Cards:**

```tsx
metadata: {
  twitter: {
    card: "summary_large_image",
    title: post.title,
    description: post.excerpt,
    image: post.imageUrl,
    imageAlt: post.title,
    site: "@mysite",
    creator: "@author",
  },
}
```

**Metadata Completa:**

```tsx
metadata: {
  // Campos básicos
  title: "Mi Página",
  description: "Descripción de la página",
  lang: "es",
  canonical: "https://mysite.com/page",
  robots: "index, follow",
  themeColor: "#000000",
  viewport: "width=device-width, initial-scale=1",
  
  // Open Graph
  openGraph: {
    title: "Mi Página",
    description: "Descripción para compartir",
    type: "website",
    url: "https://mysite.com/page",
    image: {
      url: "https://mysite.com/og-image.jpg",
      width: 1200,
      height: 630,
      alt: "Imagen de la página",
    },
    siteName: "My Site",
    locale: "es_ES",
  },
  
  // Twitter Cards
  twitter: {
    card: "summary_large_image",
    title: "Mi Página",
    description: "Descripción para Twitter",
    image: "https://mysite.com/twitter-image.jpg",
    imageAlt: "Imagen para Twitter",
    site: "@mysite",
    creator: "@author",
  },
  
  // Meta tags personalizados
  metaTags: [
    { name: "keywords", content: "palabra1, palabra2" },
    { name: "author", content: "Autor" },
  ],
  
  // Link tags personalizados
  links: [
    { rel: "preconnect", href: "https://fonts.googleapis.com" },
    { rel: "dns-prefetch", href: "https://api.example.com" },
  ],
}
```

**Combinación Layout + Page:**

La metadata se combina inteligentemente:
- **Layout metadata** (en `layout.server.hook.ts`) actúa como base/fallback
- **Page metadata** (en `page.server.hook.ts`) sobrescribe campos específicos
- Los objetos anidados (openGraph, twitter) se combinan shallow

```tsx
// app/layout.server.hook.ts - Metadata base
export const getServerSideProps: ServerLoader = async () => {
  return {
    props: { /* ... */ },
    metadata: {
      description: "Site description", // Base
      openGraph: {
        type: "website",        // Base
        siteName: "My Site",   // Base
      },
      twitter: {
        card: "summary_large_image", // Base
      },
    },
  };
};

// app/page.server.hook.ts - Metadata específica
export const getServerSideProps: ServerLoader = async () => {
  return {
    props: { /* ... */ },
    metadata: {
      title: "Page Title", // Sobrescribe (no hay title en layout)
      openGraph: {
        title: "Page Title",      // Agrega (no hay en layout)
        description: "Page desc", // Agrega (no hay en layout)
        // type y siteName vienen del layout
      },
      // twitter.card viene del layout
    },
  };
};
```

## Modos de Renderizado

### Dynamic (SSR)
La página siempre se renderiza en el servidor:

```tsx
export const dynamic = "force-dynamic" as const;

export const getServerSideProps: ServerLoader = async (ctx) => {
  // Se ejecuta en cada request
  const data = await fetchFreshData();
  return { props: { data } };
};
```

### Static (SSG)
La página se genera en build time:

```tsx
export const dynamic = "force-static" as const;

export const getServerSideProps: ServerLoader = async (ctx) => {
  // Se ejecuta solo en build time
  const data = await fetchData();
  return { props: { data } };
};
```

### Auto (default)
El framework decide automáticamente:
- Si tiene `getServerSideProps` → dynamic
- Si tiene `generateStaticParams` → static
- Si no tiene ninguno → static

## Generación de Rutas Estáticas

Para generar múltiples rutas estáticas:

```tsx
// app/blog/[slug]/page.server.hook.ts (preferido) o app/blog/[slug]/server.hook.ts (legacy)
import type { GenerateStaticParams, ServerLoader } from "@lolyjs/core";

export const dynamic = "force-static" as const;

export const generateStaticParams: GenerateStaticParams = async () => {
  const posts = await getAllPosts();
  return posts.map(post => ({
    slug: post.slug,
  }));
};

export const getServerSideProps: ServerLoader = async (ctx) => {
  const post = await getPostBySlug(ctx.params.slug);
  return {
    props: { post },
    metadata: {
      title: post.title,
    },
  };
};
```

## Ejemplos Completos

### Página con Datos de API

```tsx
// app/launches/page.tsx
export default function LaunchesPage({ props }) {
  const { launches } = props;
  
  return (
    <div>
      <h1>Lanzamientos</h1>
      {launches.map(launch => (
        <div key={launch.id}>{launch.name}</div>
      ))}
    </div>
  );
}
```

```tsx
// app/launches/page.server.hook.ts (preferido) o app/launches/server.hook.ts (legacy)
import type { ServerLoader } from "@lolyjs/core";

export const dynamic = "force-dynamic" as const;

export const getServerSideProps: ServerLoader = async (ctx) => {
  const launches = await fetch("https://api.spacexdata.com/v5/launches")
    .then(res => res.json());
  
  return {
    props: {
      launches: launches.slice(0, 20),
    },
    metadata: {
      title: "Lanzamientos | Space Explorer",
      description: "Últimos lanzamientos de SpaceX",
    },
  };
};
```

### Página con Autenticación

```tsx
// app/dashboard/server.hook.ts
import type { RouteMiddleware, ServerLoader } from "@lolyjs/core";

export const beforeServerData: RouteMiddleware[] = [
  async (ctx, next) => {
    const token = ctx.req.headers.authorization;
    
    if (!token) {
      ctx.res.redirect("/login");
      return;
    }
    
    const user = await verifyToken(token);
    if (!user) {
      ctx.res.redirect("/login");
      return;
    }
    
    ctx.locals.user = user;
    await next();
  },
];

export const getServerSideProps: ServerLoader = async (ctx) => {
  const user = ctx.locals.user;
  const dashboardData = await getDashboardData(user.id);
  
  return {
    props: {
      user,
      dashboardData,
    },
  };
};
```

### Página con Validación de Parámetros

```tsx
// app/product/[id]/page.server.hook.ts (preferido) o app/product/[id]/server.hook.ts (legacy)
import { validate } from "@lolyjs/core";
import { z } from "zod";
import type { ServerLoader } from "@lolyjs/core";

const idSchema = z.string().uuid();

export const getServerSideProps: ServerLoader = async (ctx) => {
  try {
    const id = validate(idSchema, ctx.params.id);
    const product = await getProduct(id);
    
    if (!product) {
      return ctx.NotFound();
    }
    
    return {
      props: { product },
      metadata: {
        title: product.name,
      },
    };
  } catch (error) {
    return ctx.NotFound();
  }
};
```

### Página con Cache

```tsx
// app/data/page.server.hook.ts (preferido) o app/data/server.hook.ts (legacy)
import { withCache } from "@lolyjs/core";
import type { ServerLoader } from "@lolyjs/core";

export const getServerSideProps = withCache(
  async (ctx) => {
    const data = await expensiveOperation();
    return { props: { data } };
  },
  { ttl: 3600 } // Cache por 1 hora
);
```

## Acceso a Datos en el Componente

Los datos del loader se pasan directamente como props al componente:

```tsx
export default function MyPage({ props, params }) {
  // props contiene los datos del loader
  // params contiene los parámetros de ruta
  
  return <div>{props.data}</div>;
}
```

## Middleware y Locals

Los middlewares se definen en `page.server.hook.ts` (preferido) o `server.hook.ts` (legacy) usando `beforeServerData`:

```tsx
// app/dashboard/page.server.hook.ts (preferido) o app/dashboard/server.hook.ts (legacy)
import type { RouteMiddleware, ServerLoader } from "@lolyjs/core";

export const beforeServerData: RouteMiddleware[] = [
  async (ctx, next) => {
    const user = await getUserFromToken(ctx.req);
    ctx.locals.user = user;
    await next();
  },
];

export const getServerSideProps: ServerLoader = async (ctx) => {
  const user = ctx.locals.user; // Disponible desde middleware
  return {
    props: {
      user,
    },
  };
};
```

## Estructura de Archivos

Los server loaders se definen en `page.server.hook.ts` (preferido) o `server.hook.ts` (legacy) en el mismo directorio que la página:

```
app/
├── page.tsx              # Componente de la página
└── page.server.hook.ts   # Loader, middlewares y configuración (preferido)
# o
└── server.hook.ts        # Loader, middlewares y configuración (legacy)
```

Para layouts, se usa `layout.server.hook.ts` en el mismo directorio que `layout.tsx`:

```
app/
├── layout.tsx
└── layout.server.hook.ts  # Loader para el layout (proporciona props estables)
```

O para rutas anidadas:

```
app/
├── layout.tsx
├── layout.server.hook.ts  # Layout raíz
├── page.tsx
├── page.server.hook.ts     # Página raíz
└── blog/
    ├── layout.tsx
    ├── layout.server.hook.ts  # Layout de blog
    ├── page.tsx
    └── [slug]/
        ├── page.tsx
        └── page.server.hook.ts  # Loader de la página (preferido) o server.hook.ts (legacy)
```

## Mejores Prácticas

1. **Manejo de Errores**: Siempre maneja errores y usa `ctx.NotFound()` cuando corresponda
2. **Validación**: Valida parámetros y queries con Zod
3. **Cache**: Usa `withCache` para operaciones costosas
4. **Metadata**: Siempre proporciona metadata para SEO
5. **Type Safety**: Tipa tus props con TypeScript
6. **Separación**: Mantén los loaders en `page.server.hook.ts` (preferido) o `server.hook.ts` (legacy) separados de los componentes
7. **Layout Loaders**: Usa `layout.server.hook.ts` para datos estables que se comparten entre todas las páginas

```tsx
// app/post/[id]/page.server.hook.ts (preferido) o app/post/[id]/server.hook.ts (legacy)
type PageProps = {
  post: {
    id: string;
    title: string;
    content: string;
  };
};

export const getServerSideProps: ServerLoader = async (ctx) => {
  // ...
  return { props: { post } };
};
```

```tsx
// app/post/[id]/page.tsx
type PageProps = {
  post: {
    id: string;
    title: string;
    content: string;
  };
};

export default function PostPage({ props }: { props: PageProps }) {
  return <h1>{props.post.title}</h1>;
}
```

## Próximos Pasos

- [API Routes](./05-api-routes.md) - Crear endpoints API
- [Validation](./09-validation.md) - Validación de datos
- [Cache](./10-cache.md) - Sistema de caché
