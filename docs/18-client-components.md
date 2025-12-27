# Componentes de Cliente y Hidratación

Loly Framework proporciona utilidades y mejores prácticas para manejar componentes que solo deben ejecutarse en el cliente, evitando problemas de hidratación.

## Problemas Comunes de Hidratación

### ¿Qué es la Hidratación?

La hidratación es el proceso donde React "toma control" del HTML renderizado en el servidor. React compara el HTML del servidor con lo que espera renderizar en el cliente. Si hay diferencias, se producen **mismatches de hidratación**.

### Problemas Típicos

1. **Componentes que usan APIs del navegador**: `window`, `document`, `localStorage`, etc.
2. **Estado que difiere entre servidor y cliente**: Tema, preferencias del usuario, etc.
3. **Componentes con hooks de cliente**: `useState`, `useEffect` que se ejecutan diferente en el servidor
4. **Timing de Context**: Contextos que no están disponibles inmediatamente durante la hidratación

## Soluciones

### 1. Componente `ClientOnly`

El componente `ClientOnly` solo renderiza su contenido en el cliente, evitando problemas de hidratación.

```tsx
import { ClientOnly } from "@lolyjs/core/components";

export default function MyPage() {
  return (
    <div>
      <h1>Contenido del servidor</h1>
      
      <ClientOnly fallback={<div>Cargando...</div>}>
        <ComponentThatUsesWindow />
      </ClientOnly>
    </div>
  );
}
```

**Cuándo usar:**
- Componentes que usan APIs del navegador (`window`, `document`, etc.)
- Componentes que dependen de estado del cliente que no existe en el servidor
- Componentes que causan mismatches de hidratación

**Props:**
- `children`: Contenido a renderizar solo en el cliente
- `fallback`: Contenido a mostrar durante SSR y antes de la hidratación (opcional)

### 2. Hook `useClientMounted`

Hook que detecta si el componente está montado en el cliente.

```tsx
import { useClientMounted } from "@lolyjs/core/hooks";

export function MyComponent() {
  const isMounted = useClientMounted();
  
  if (!isMounted) {
    return <div>Cargando...</div>;
  }
  
  // Este código solo se ejecuta en el cliente
  return <div>{window.innerWidth}</div>;
}
```

**Cuándo usar:**
- Cuando necesitas renderizar contenido diferente antes y después de la hidratación
- Para evitar acceder a APIs del navegador durante SSR

### 3. Hook `useIsomorphicLayoutEffect`

Hook que usa `useLayoutEffect` en el cliente y `useEffect` (no-op) en el servidor.

```tsx
import { useIsomorphicLayoutEffect } from "@lolyjs/core/hooks";

export function MyComponent() {
  const [width, setWidth] = useState(0);
  
  useIsomorphicLayoutEffect(() => {
    // Esto se ejecuta sincrónicamente en el cliente
    // No se ejecuta en el servidor
    setWidth(elementRef.current?.offsetWidth);
  }, []);
  
  return <div ref={elementRef}>Ancho: {width}</div>;
}
```

**Cuándo usar:**
- Cuando necesitas mediciones del DOM que deben ser síncronas
- Para evitar warnings de React sobre `useLayoutEffect` en SSR

### 4. Directiva `"use client"`

Puedes marcar componentes con la directiva `"use client"` para indicar que son componentes de cliente.

```tsx
"use client";

import { useState } from "react";

export function InteractiveComponent() {
  const [count, setCount] = useState(0);
  
  return (
    <button onClick={() => setCount(count + 1)}>
      Contador: {count}
    </button>
  );
}
```

**Nota:** Los componentes marcados con `"use client"` se renderizarán como placeholders en el servidor y se hidratarán en el cliente.

## Mejores Prácticas

### 1. Evitar Renderizado Condicional Basado en Estado del Cliente

❌ **Mal:**
```tsx
export function ThemeSwitch() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return <div>Loading...</div>;
  }
  
  return <ActualSwitch />;
}
```

✅ **Bien:**
```tsx
import { useClientMounted } from "@lolyjs/core/hooks";

export function ThemeSwitch() {
  const isMounted = useClientMounted();
  
  if (!isMounted) {
    return <div>Loading...</div>;
  }
  
  return <ActualSwitch />;
}
```

### 2. Usar `ClientOnly` para Componentes Complejos

❌ **Mal:**
```tsx
export default function Page() {
  return (
    <div>
      {typeof window !== "undefined" && <ClientComponent />}
    </div>
  );
}
```

✅ **Bien:**
```tsx
import { ClientOnly } from "@lolyjs/core/components";

export default function Page() {
  return (
    <div>
      <ClientOnly fallback={<div>Cargando...</div>}>
        <ClientComponent />
      </ClientOnly>
    </div>
  );
}
```

### 3. Sincronizar Estado Entre Servidor y Cliente

Para temas y otros estados que deben estar sincronizados:

```tsx
// En el servidor, el tema se pasa como prop
export default function Layout({ theme }: { theme?: string }) {
  return (
    <ThemeProvider initialTheme={theme}>
      {children}
    </ThemeProvider>
  );
}

// En el cliente, el tema se lee de cookies/localStorage
// El ThemeProvider maneja la sincronización
```

## Resolución de Problemas

### Error: "Hydration failed because the initial UI does not match"

**Causa:** El HTML del servidor no coincide con lo que React espera en el cliente.

**Solución:**
1. Usa `ClientOnly` para componentes que difieren entre servidor y cliente
2. Usa `useClientMounted` para renderizado condicional
3. Asegúrate de que el estado inicial sea el mismo en servidor y cliente

### Error: "useLayoutEffect must not be used during SSR"

**Causa:** Estás usando `useLayoutEffect` directamente, que no funciona en SSR.

**Solución:**
```tsx
import { useIsomorphicLayoutEffect } from "@lolyjs/core/hooks";

// En lugar de useLayoutEffect
useIsomorphicLayoutEffect(() => {
  // Tu código aquí
}, []);
```

### Componente no se renderiza en carga directa por ruta

**Causa:** El componente depende de estado del cliente que no está disponible durante la hidratación inicial.

**Solución:**
1. Usa `ClientOnly` para envolver el componente
2. Usa `useClientMounted` para detectar cuando está montado
3. Asegúrate de que `RouterContext` esté disponible (ya está expuesto globalmente como fallback)

### RouterContext no disponible durante hidratación

**Causa:** Los componentes intentan usar `useRouter()` antes de que el contexto esté disponible.

**Solución:**
El framework ya expone `navigate` globalmente como fallback. Si aún tienes problemas:

```tsx
import { useRouter } from "@lolyjs/core/hooks";
import { useClientMounted } from "@lolyjs/core/hooks";

export function MyComponent() {
  const router = useRouter();
  const isMounted = useClientMounted();
  
  // El router estará disponible después de la hidratación
  // useRouter ya tiene fallbacks internos
  if (!isMounted) {
    return null;
  }
  
  return <button onClick={() => router.push("/about")}>Ir a About</button>;
}
```

## Ejemplos Completos

### Componente de Tema con ClientOnly

```tsx
import { ClientOnly } from "@lolyjs/core/components";
import { ThemeSwitch } from "./theme-switch";

export default function Layout() {
  return (
    <header>
      <nav>
        <a href="/">Home</a>
        <a href="/about">About</a>
      </nav>
      
      <ClientOnly fallback={<div className="h-9 w-16 bg-muted rounded-full" />}>
        <ThemeSwitch />
      </ClientOnly>
    </header>
  );
}
```

### Componente con Medición del DOM

```tsx
import { useIsomorphicLayoutEffect, useClientMounted } from "@lolyjs/core/hooks";
import { useState, useRef } from "react";

export function ResponsiveComponent() {
  const [width, setWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMounted = useClientMounted();
  
  useIsomorphicLayoutEffect(() => {
    if (!containerRef.current) return;
    
    const updateWidth = () => {
      setWidth(containerRef.current?.offsetWidth || 0);
    };
    
    updateWidth();
    window.addEventListener("resize", updateWidth);
    
    return () => {
      window.removeEventListener("resize", updateWidth);
    };
  }, []);
  
  if (!isMounted) {
    return <div ref={containerRef}>Cargando...</div>;
  }
  
  return (
    <div ref={containerRef}>
      Ancho del contenedor: {width}px
    </div>
  );
}
```

## Próximos Pasos

- [Rendering](./07-rendering.md) - Más sobre SSR y SSG
- [Components](./14-components.md) - Otros componentes del framework
- [Hooks](./13-hooks.md) - Más hooks disponibles

