# Optimización de Imágenes

Loly Framework incluye un sistema completo de optimización de imágenes similar a Next.js Image, con soporte para imágenes locales y remotas, conversión automática de formatos, lazy loading, y más.

## Características

- ✅ **Optimización automática** - Redimensionado, compresión y conversión de formatos
- ✅ **Formatos modernos** - Soporte para WebP y AVIF
- ✅ **Imágenes remotas** - Soporte para imágenes de dominios externos (con whitelist)
- ✅ **Lazy loading** - Carga diferida por defecto
- ✅ **Responsive images** - Generación automática de srcset
- ✅ **Cache inteligente** - Cache en disco para mejor performance
- ✅ **Prevención de CLS** - Aspect ratio containers para evitar layout shift

## Uso Básico

### Imagen Local

```tsx
import { Image } from "@lolyjs/core/components";

export default function MyPage() {
  return (
    <Image
      src="/assets/hero.jpg"
      alt="Hero image"
      width={800}
      height={600}
    />
  );
}
```

### Imagen Remota

```tsx
<Image
  src="https://example.com/image.jpg"
  alt="Remote image"
  width={1200}
  height={800}
/>
```

## Configuración

### Configurar Dominios Remotos

Para usar imágenes remotas, debes configurar los dominios permitidos en `loly.config.ts`:

```typescript
import { type FrameworkConfig } from "@lolyjs/core";

const frameworkConfig: Partial<FrameworkConfig> = {
  images: {
    // Opción 1: Usar remotePatterns (recomendado)
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "**.unsplash.com", // Wildcard para subdominios
        pathname: "/photos/**",      // Opcional: restringir path
      },
    ],
    
    // Opción 2: Usar domains (legacy, como Next.js)
    // domains: ['images.unsplash.com', 'cdn.example.com'],
    
    // Tamaños de dispositivo para srcset
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    
    // Tamaños de imagen para srcset
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    
    // Formatos soportados
    formats: ["image/webp", "image/avif"],
    
    // Calidad por defecto (1-100)
    quality: 75,
    
    // Tiempo mínimo de cache en segundos
    minimumCacheTTL: 60,
    
    // Permitir SVG (riesgo de seguridad si se habilita)
    dangerouslyAllowSVG: false,
    
    // Content Security Policy para SVG
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    
    // Tamaños máximos
    maxWidth: 3840,
    maxHeight: 3840,
  },
};

export default frameworkConfig;
```

## Props del Componente Image

### Props Básicas

```typescript
interface ImageProps {
  src: string;              // Ruta de la imagen (local o remota)
  alt: string;              // Texto alternativo (requerido)
  width?: number;           // Ancho en píxeles
  height?: number;          // Alto en píxeles
  className?: string;       // Clases CSS
}
```

### Props de Optimización

```typescript
{
  quality?: number;         // Calidad (1-100, default: 75)
  format?: 'webp' | 'avif' | 'jpeg' | 'png' | 'auto'; // Formato forzado
  priority?: boolean;       // Cargar inmediatamente (desactiva lazy loading)
  fill?: boolean;           // Modo fill (llena el contenedor padre)
  sizes?: string;           // Atributo sizes para responsive images
  placeholder?: 'blur' | 'empty'; // Tipo de placeholder
  blurDataURL?: string;     // URL del blur placeholder
}
```

## Ejemplos

### Imagen con Calidad Personalizada

```tsx
<Image
  src="/assets/photo.jpg"
  alt="Photo"
  width={800}
  height={600}
  quality={90}  // Alta calidad
/>
```

### Imagen Responsive

```tsx
<Image
  src="/assets/hero.jpg"
  alt="Hero"
  width={1920}
  height={1080}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 1920px"
/>
```

El componente automáticamente genera un `srcset` con diferentes tamaños basado en `deviceSizes` configurado.

### Imagen con Prioridad

```tsx
<Image
  src="/assets/logo.png"
  alt="Logo"
  width={200}
  height={100}
  priority  // Carga inmediatamente (above-the-fold)
/>
```

### Modo Fill

```tsx
<div className="relative h-64 w-full">
  <Image
    src="/assets/background.jpg"
    alt="Background"
    fill  // Llena el contenedor padre
    className="object-cover"
  />
</div>
```

### Imagen Remota con Formato Forzado

```tsx
<Image
  src="https://images.unsplash.com/photo-123"
  alt="Unsplash photo"
  width={1200}
  height={800}
  format="webp"  // Convierte a WebP automáticamente
  quality={85}
/>
```

### Lazy Loading (por defecto)

```tsx
// Lazy loading está habilitado por defecto
<Image
  src="/assets/image.jpg"
  alt="Image"
  width={600}
  height={400}
  // No necesita priority = lazy loading automático
/>
```

## Endpoint de Optimización

El framework expone un endpoint interno `/_loly/image` que procesa las imágenes:

```
/_loly/image?src=/path/to/image.jpg&w=800&h=600&q=75&format=webp
```

### Parámetros del Endpoint

- `src` - Ruta de la imagen (requerido)
- `w` - Ancho en píxeles (opcional)
- `h` - Alto en píxeles (opcional)
- `q` - Calidad (1-100, opcional)
- `format` - Formato de salida: `webp`, `avif`, `jpeg`, `png`, `auto` (opcional)
- `fit` - Modo de ajuste: `contain`, `cover`, `fill`, `inside`, `outside` (opcional)

## Cache

Las imágenes optimizadas se cachean automáticamente en `.loly/cache/images/`. El cache se basa en:

- URL de la imagen
- Dimensiones (width/height)
- Calidad
- Formato

Esto significa que la misma imagen con los mismos parámetros solo se procesa una vez.

## Seguridad

### Validación de Dominios Remotos

Por seguridad, **todos los dominios remotos deben estar en la whitelist**. Si intentas usar una imagen de un dominio no permitido, obtendrás un error 403.

```typescript
// ✅ Permitido (configurado en loly.config.ts)
<Image src="https://images.unsplash.com/photo.jpg" ... />

// ❌ Bloqueado (dominio no permitido)
<Image src="https://malicious-site.com/image.jpg" ... />
```

### SVG

Por defecto, las imágenes SVG están deshabilitadas por razones de seguridad. Para habilitarlas:

```typescript
images: {
  dangerouslyAllowSVG: true,
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
}
```

## Mejores Prácticas

### 1. Siempre Proporciona width y height

```tsx
// ✅ Correcto - previene CLS
<Image src="/photo.jpg" alt="Photo" width={800} height={600} />

// ❌ Incorrecto - puede causar layout shift
<Image src="/photo.jpg" alt="Photo" />
```

### 2. Usa priority para Above-the-Fold

```tsx
// ✅ Imagen hero carga inmediatamente
<Image src="/hero.jpg" alt="Hero" width={1920} height={1080} priority />

// ✅ Imágenes más abajo usan lazy loading
<Image src="/gallery-1.jpg" alt="Gallery" width={400} height={300} />
```

### 3. Configura sizes para Responsive Images

```tsx
<Image
  src="/hero.jpg"
  alt="Hero"
  width={1920}
  height={1080}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 1920px"
/>
```

### 4. Usa Formatos Modernos

El framework automáticamente convierte a WebP o AVIF si están habilitados en la configuración. Esto puede reducir el tamaño de archivo en un 50-70%.

### 5. Ajusta la Calidad Según el Caso

```tsx
// Alta calidad para fotos importantes
<Image src="/hero.jpg" quality={90} ... />

// Calidad media para thumbnails
<Image src="/thumb.jpg" quality={60} ... />
```

## Troubleshooting

### Error: "Remote image domain not allowed"

**Problema**: Intentas usar una imagen de un dominio no configurado.

**Solución**: Agrega el dominio a `remotePatterns` o `domains` en `loly.config.ts`:

```typescript
images: {
  remotePatterns: [
    { protocol: 'https', hostname: 'tu-dominio.com' }
  ]
}
```

### Error: "Image not found"

**Problema**: La imagen local no existe en la ruta especificada.

**Solución**: Verifica que la imagen esté en el directorio `public/` y que la ruta sea correcta:

```tsx
// ✅ Correcto - imagen en public/assets/logo.png
<Image src="/assets/logo.png" ... />

// ❌ Incorrecto - ruta incorrecta
<Image src="/logo.png" ... />
```

### Imágenes no se optimizan

**Problema**: Las imágenes se sirven directamente sin optimización.

**Solución**: Asegúrate de usar el componente `Image` de `@lolyjs/core/components`, no un `<img>` HTML normal.

### SVG no funciona

**Problema**: Las imágenes SVG no se procesan.

**Solución**: Habilita SVG en la configuración (con precaución):

```typescript
images: {
  dangerouslyAllowSVG: true,
}
```

## Performance

El sistema de optimización de imágenes puede mejorar significativamente el rendimiento:

- **Reducción de tamaño**: 50-70% más pequeño con WebP/AVIF
- **Tiempo de carga**: 30-50% más rápido
- **LCP mejorado**: 20-40% de mejora
- **CLS reducido**: 30-50% menos layout shift

## Ejemplo Completo

```tsx
import { Image } from "@lolyjs/core/components";

export default function Gallery() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {images.map((img) => (
        <Image
          key={img.id}
          src={img.url}
          alt={img.alt}
          width={400}
          height={300}
          quality={80}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 400px"
          className="rounded-lg"
        />
      ))}
    </div>
  );
}
```

## Próximos Pasos

- [Components](./14-components.md) - Más componentes disponibles
- [Configuración](./12-configuracion.md) - Configuración completa del framework
- [Rendering](./07-rendering.md) - Optimización de renderizado

