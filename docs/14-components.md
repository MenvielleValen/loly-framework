# Componentes React

Loly Framework proporciona componentes React útiles para navegación, imágenes y más.

## Link

Componente para navegación client-side con prefetching.

### Uso Básico

```tsx
import { Link } from "@lolyjs/core/components";

export default function Navigation() {
  return (
    <nav>
      <Link href="/">Home</Link>
      <Link href="/about">About</Link>
      <Link href="/blog/[slug]" params={{ slug: "my-post" }}>
        My Post
      </Link>
    </nav>
  );
}
```

### Props

```typescript
interface LinkProps {
  href: string;                    // Ruta destino
  params?: Record<string, string>;  // Parámetros para rutas dinámicas
  className?: string;               // Clase CSS
  children: React.ReactNode;        // Contenido del link
}
```

### Ejemplo con Estilos

```tsx
<Link 
  href="/dashboard" 
  className="text-blue-500 hover:text-blue-700"
>
  Dashboard
</Link>
```

## Image

Componente optimizado para imágenes con optimización automática, lazy loading, responsive images y más.

### Uso Básico

```tsx
import { Image } from "@lolyjs/core/components";

export default function MyPage() {
  return (
    <Image
      src="/images/hero.jpg"
      alt="Hero image"
      width={800}
      height={600}
    />
  );
}
```

### Características

- ✅ Optimización automática (redimensionado, compresión, formatos modernos)
- ✅ Lazy loading por defecto
- ✅ Responsive images con srcset automático
- ✅ Soporte para imágenes remotas (con whitelist)
- ✅ Prevención de CLS (Cumulative Layout Shift)

Para documentación completa, ver [Image Optimization](./17-image-optimization.md).

## Ejemplos Completos

### Navegación Completa

```tsx
import { Link } from "@lolyjs/core/components";

export default function Navigation() {
  return (
    <nav>
      <Link href="/">Home</Link>
      <Link href="/about">About</Link>
      <Link href="/blog">Blog</Link>
      <Link href="/contact">Contact</Link>
    </nav>
  );
}
```

### Breadcrumbs

```tsx
import { Link } from "@lolyjs/core/components";

export default function Breadcrumbs({ pathname }) {
  const segments = pathname.split("/").filter(Boolean);
  
  return (
    <nav>
      <Link href="/">Home</Link>
      {segments.map((segment, i) => {
        const href = "/" + segments.slice(0, i + 1).join("/");
        return (
          <span key={href}>
            {" / "}
            <Link href={href}>{segment}</Link>
          </span>
        );
      })}
    </nav>
  );
}
```

## Mejores Prácticas

1. **Usa Link para Navegación**: Siempre usa `Link` en lugar de `<a>` para navegación interna
2. **Prefetching**: El framework automáticamente hace prefetch de rutas
3. **Type Safety**: Tipa tus props cuando uses componentes

## Próximos Pasos

- [Routing](./03-routing.md) - Sistema de routing
- [Hooks](./13-hooks.md) - Hooks React
