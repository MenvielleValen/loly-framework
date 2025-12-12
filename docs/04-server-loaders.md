# Server Loaders

Los Server Loaders son funciones que se ejecutan en el servidor antes de renderizar una página. Permiten obtener datos, realizar autenticación, redirecciones y configurar metadata.

## Conceptos Básicos

Un Server Loader es una función que:
- Se ejecuta en el servidor en cada request (o en build time para SSG)
- Tiene acceso a `ServerContext` (request, response, params, etc.)
- Retorna datos que se pasan como props al componente
- Puede retornar redirecciones, 404, o metadata

## Definición Básica

Los server loaders se definen en un archivo separado `server.hook.ts` en el mismo directorio que la página:

```tsx
// app/page.tsx
export default function HomePage({ props }) {
  return <div>{props.data}</div>;
}
```

```tsx
// app/server.hook.ts
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

**Nota importante**: El loader debe estar en `server.hook.ts`, no en el mismo archivo que el componente.

## ServerContext

El contexto del servidor proporciona acceso a:

```typescript
interface ServerContext {
  req: Request;                   // Express Request
  res: Response;                  // Express Response
  params: Record<string, string>; // Parámetros de ruta
  pathname: string;               // Path de la request
  locals: Record<string, any>;    // Datos locales (de middlewares)
}
```

### Ejemplo con Parámetros

```tsx
// app/blog/[slug]/page.tsx
export const getServerSideProps: ServerLoader = async (ctx) => {
  const { params } = ctx;
  const post = await getPostBySlug(params.slug);
  
  if (!post) {
    return { notFound: true };
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
Redirigir a otra página:

```tsx
return {
  redirect: {
    destination: "/login",
    permanent: false,  // true para 308, false para 307
  },
};
```

### Not Found
Marcar la página como 404:

```tsx
return {
  notFound: true,
};
```

### Metadata
Configurar metadata de la página:

```tsx
return {
  props: { post },
  metadata: {
    title: post.title,
    description: post.excerpt,
    metaTags: [
      {
        property: "og:title",
        content: post.title,
      },
      {
        property: "og:image",
        content: post.image,
      },
    ],
  },
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
// app/blog/[slug]/server.hook.ts
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
// app/launches/server.hook.ts
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
// app/product/[id]/server.hook.ts
import { validate } from "@lolyjs/core";
import { z } from "zod";
import type { ServerLoader } from "@lolyjs/core";

const idSchema = z.string().uuid();

export const getServerSideProps: ServerLoader = async (ctx) => {
  try {
    const id = validate(idSchema, ctx.params.id);
    const product = await getProduct(id);
    
    if (!product) {
      return { notFound: true };
    }
    
    return {
      props: { product },
      metadata: {
        title: product.name,
      },
    };
  } catch (error) {
    return { notFound: true };
  }
};
```

### Página con Cache

```tsx
// app/data/server.hook.ts
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

Los middlewares se definen en `server.hook.ts` usando `beforeServerData`:

```tsx
// app/dashboard/server.hook.ts
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

Los server loaders se definen en `server.hook.ts` en el mismo directorio que la página:

```
app/
├── page.tsx              # Componente de la página
└── server.hook.ts        # Loader, middlewares y configuración
```

O para rutas anidadas:

```
app/
└── blog/
    ├── [slug]/
    │   ├── page.tsx
    │   └── server.hook.ts
    └── server.hook.ts    # Middleware para todas las rutas de blog
```

## Mejores Prácticas

1. **Manejo de Errores**: Siempre maneja errores y retorna `notFound` cuando corresponda
2. **Validación**: Valida parámetros y queries con Zod
3. **Cache**: Usa `withCache` para operaciones costosas
4. **Metadata**: Siempre proporciona metadata para SEO
5. **Type Safety**: Tipa tus props con TypeScript
6. **Separación**: Mantén los loaders en `server.hook.ts` separados de los componentes

```tsx
// app/post/[id]/server.hook.ts
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
