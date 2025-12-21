# Rendering (SSR, SSG, Streaming)

Loly Framework soporta múltiples estrategias de renderizado para optimizar el rendimiento y la experiencia del usuario.

## Estrategias de Renderizado

Loly Framework soporta tres estrategias principales de renderizado:

### SSR (Server-Side Rendering)
El contenido se renderiza en el servidor en cada request:

```tsx
// app/page.server.hook.ts (preferido) o app/server.hook.ts (legacy)
export const dynamic = "force-dynamic" as const;

export const getServerSideProps: ServerLoader = async (ctx) => {
  // Se ejecuta en cada request
  const data = await fetchFreshData();
  return { props: { data } };
};
```

**Cuándo usar:**
- Datos que cambian frecuentemente
- Contenido personalizado por usuario
- SEO crítico con datos dinámicos
- APIs externas en tiempo real

### SSG (Static Site Generation)
El contenido se genera en build time:

```tsx
// app/page.server.hook.ts (preferido) o app/server.hook.ts (legacy)
export const dynamic = "force-static" as const;

export const getServerSideProps: ServerLoader = async (ctx) => {
  // Se ejecuta solo en build time
  const data = await fetchData();
  return { props: { data } };
};
```

**Cuándo usar:**
- Contenido que no cambia frecuentemente
- Páginas de marketing
- Documentación
- Blogs con contenido estático
- Máximo rendimiento y SEO

### CSR (Client-Side Rendering)
El contenido se renderiza completamente en el cliente:

```tsx
// app/page.tsx - Sin page.server.hook.ts o server.hook.ts
export default function ClientPage() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetchData().then(setData);
  }, []);
  
  return <div>{data}</div>;
}
```

**Cuándo usar:**
- Contenido que no necesita SEO
- Dashboards interactivos
- Aplicaciones SPA puras

### Auto (Default)
El framework decide automáticamente:

```tsx
// Sin dynamic explícito
export const getServerSideProps: ServerLoader = async (ctx) => {
  // Si tiene getServerSideProps → SSR (dynamic)
  // Si tiene generateStaticParams → SSG (static)
  // Si no tiene ninguno → SSG (static)
};
```

## Streaming SSR

Loly usa React 18's `renderToPipeableStream` para streaming:

### Ventajas
- **Time to First Byte (TTFB) más rápido**: El HTML comienza a enviarse antes de que toda la página esté renderizada
- **Mejor UX**: El contenido aparece progresivamente
- **Mejor rendimiento**: No bloquea el servidor esperando todo el renderizado

### Cómo Funciona

```tsx
// El framework automáticamente usa streaming
const { pipe, abort } = renderToPipeableStream(documentTree, {
  onShellReady() {
    // Shell listo (HTML básico)
    res.setHeader("Content-Type", "text/html");
    pipe(res);
  },
  onShellError(err) {
    // Error en el shell
    abort();
  },
  onError(err) {
    // Error durante el renderizado
    // El stream continúa
  },
});
```

## Estructura del HTML Generado

### Document Tree
El framework construye un árbol HTML completo:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Page Title</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="/static/client.css">
    <script src="/static/client.js" defer></script>
  </head>
  <body>
    <div id="__loly_app">
      <!-- Contenido renderizado (layouts + page) -->
    </div>
    <script>
      window.__FW_DATA__ = {
        url: "/",
        params: {},
        props: { /* datos del loader */ },
        metadata: { /* metadata */ }
      };
    </script>
  </body>
</html>
```

**Nota importante**: Los layouts NO deben incluir `<html>` ni `<body>`. El framework maneja automáticamente la estructura HTML base. Los layouts solo deben contener el contenido que va dentro del body.

### Initial Data
Los datos del loader se serializan en `window.__FW_DATA__`:

```typescript
interface InitialData {
  url: string;
  params: Record<string, string>;
  props: Record<string, any>;
  metadata?: PageMetadata;
  className?: string;
  theme?: string;
  notFound?: boolean;
  error?: boolean;
}
```

## Hydratación en el Cliente

### Proceso de Hydratación

1. **HTML inicial**: El servidor envía HTML con contenido renderizado
2. **Carga de JavaScript**: El cliente carga el bundle JavaScript
3. **Hydratación**: React hidrata el componente con los datos de `window.__FW_DATA__`
4. **Navegación SPA**: Las siguientes navegaciones son client-side

### Bootstrap del Cliente

```tsx
// El framework automáticamente:
bootstrapClient(routes, notFoundRoute, errorRoute);

// Esto:
// 1. Lee window.__FW_DATA__
// 2. Encuentra la ruta correspondiente
// 3. Carga el componente
// 4. Hidrata React
// 5. Inicializa el router SPA
```

## Code Splitting

### Automático
El framework divide automáticamente el código:

- **Client bundle**: Código compartido
- **Route chunks**: Código específico de cada ruta
- **Error chunk**: Código de la página de error

### Lazy Loading
Los chunks se cargan bajo demanda:

```html
<link rel="modulepreload" href="/static/chunk-abc123.js" as="script">
```

## Metadata y SEO

### Metadata en Loaders

```tsx
export const getServerSideProps: ServerLoader = async (ctx) => {
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
        {
          name: "twitter:card",
          content: "summary_large_image",
        },
      ],
    },
  };
};
```

### Inyección en HTML

El framework inyecta automáticamente:

```html
<head>
  <title>Post Title</title>
  <meta name="description" content="Post excerpt">
  <meta property="og:title" content="Post Title">
  <meta property="og:image" content="post-image.jpg">
</head>
```

## Optimizaciones

### Streaming
El contenido se envía progresivamente:

```
[HTML Shell] → [Layout] → [Page Content] → [Complete]
```

### Preloading
El framework pre-carga chunks críticos:

```html
<link rel="modulepreload" href="/static/chunk-route.js" as="script">
```

### CSS Inlining
Los estilos críticos se pueden inyectar inline (futuro).

## Ejemplos

### Página Estática

```tsx
// app/about/page.tsx
export default function AboutPage({ props }) {
  return (
    <div>
      <h1>About Us</h1>
      {props.team.map(member => (
        <div key={member.name}>
          <h2>{member.name}</h2>
          <p>{member.role}</p>
        </div>
      ))}
    </div>
  );
}
```

```tsx
// app/about/page.server.hook.ts (preferido) o app/about/server.hook.ts (legacy)
import type { ServerLoader } from "@lolyjs/core";

export const dynamic = "force-static" as const;

export const getServerSideProps: ServerLoader = async () => {
  return {
    props: {
      team: [
        { name: "John", role: "Developer" },
        { name: "Jane", role: "Designer" },
      ],
    },
    metadata: {
      title: "About Us",
      description: "Meet our team",
    },
  };
};
```

### Página Dinámica con Streaming

```tsx
// app/posts/[slug]/page.tsx
export default function PostPage({ props }) {
  const { post } = props;
  
  // El contenido se streama progresivamente
  return (
    <article>
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  );
}
```

```tsx
// app/posts/[slug]/page.server.hook.ts (preferido) o app/posts/[slug]/server.hook.ts (legacy)
import type { ServerLoader } from "@lolyjs/core";

export const dynamic = "force-dynamic" as const;

export const getServerSideProps: ServerLoader = async (ctx) => {
  const post = await getPost(ctx.params.slug);
  
  if (!post) {
    return ctx.NotFound();
  }
  
  return {
    props: { post },
    metadata: {
      title: post.title,
      description: post.excerpt,
    },
  };
};
```

### Página Estática con Múltiples Rutas

```tsx
// app/products/[id]/page.server.hook.ts (preferido) o app/products/[id]/server.hook.ts (legacy)
import type { GenerateStaticParams, ServerLoader } from "@lolyjs/core";

export const dynamic = "force-static" as const;

export const generateStaticParams: GenerateStaticParams = async () => {
  const products = await getAllProducts();
  return products.map(p => ({ id: p.id }));
};

export const getServerSideProps: ServerLoader = async (ctx) => {
  const product = await getProduct(ctx.params.id);
  return { props: { product } };
};
```

## Error Handling

### Error en Loader
Si el loader lanza un error:

1. Se intenta renderizar la página de error (`_error.tsx`)
2. Si no existe, se retorna 500

### Error en Renderizado
Si hay un error durante el renderizado:

1. Se aborta el stream
2. Se intenta renderizar la página de error
3. Si falla, se retorna HTML básico de error

## Performance Tips

1. **Usa SSG cuando sea posible**: Más rápido y menos carga en el servidor
2. **Streaming**: Aprovecha el streaming para mejor TTFB
3. **Code Splitting**: El framework lo hace automáticamente
4. **Metadata**: Siempre proporciona metadata para SEO
5. **Cache**: Usa `withCache` para operaciones costosas

## Próximos Pasos

- [Build System](./11-build.md) - Cómo funciona el build
- [Server Loaders](./04-server-loaders.md) - Data fetching
