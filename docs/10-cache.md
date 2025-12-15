# Sistema de Caché

Loly Framework incluye un sistema de caché para optimizar el rendimiento de operaciones costosas y reducir la carga en el servidor.

## Conceptos Básicos

### withCache

El helper `withCache` envuelve funciones para cachear sus resultados:

```tsx
import { withCache } from "@lolyjs/core";

const cachedLoader = withCache(
  async (ctx) => {
    const data = await expensiveOperation();
    return { props: { data } };
  },
  { ttl: 3600 } // Time to live en segundos
);
```

## Uso en Server Loaders

### Cachear Resultados de Loader

```tsx
import { withCache } from "@lolyjs/core";
import type { ServerLoader } from "@lolyjs/core";

export const getServerSideProps = withCache(
  async (ctx) => {
    const data = await fetchFromAPI();
    return {
      props: { data },
    };
  },
  { ttl: 60 } // Cache por 60 segundos
);
```

### Cache con Clave Personalizada

```tsx
export const getServerSideProps = withCache(
  async (ctx) => {
    const data = await fetchData(ctx.params.id);
    return { props: { data } };
  },
  {
    ttl: 3600,
    key: (ctx) => `product-${ctx.params.id}`, // Clave personalizada
  }
);
```

## Client-Side Cache

### Revalidación

El framework proporciona funciones para revalidar datos en el cliente. Estas funciones fuerzan la ejecución de **todos los hooks** (layout + page) para obtener datos frescos del servidor.

```tsx
import { revalidate, revalidatePath } from "@lolyjs/core/client-cache";

// Revalidar la ruta actual
// Fuerza la ejecución de layout hooks + page hooks
async function handleRefresh() {
  await revalidate();
}

// Revalidar una ruta específica (sin navegar a ella)
function handleRefreshOther() {
  revalidatePath("/other-page");
}
```

**Comportamiento de `revalidate()`:**
- ✅ Fuerza la ejecución de **todos los hooks** (layout + page)
- ✅ Actualiza los props del layout y de la página
- ✅ Actualiza `window.__FW_DATA__` con los nuevos datos
- ✅ Dispara el evento `fw-data-refresh` para que los componentes se actualicen

**Nota:** Durante la navegación SPA normal, los layout hooks **NO se ejecutan** (se preservan los props del layout). Solo se ejecutan cuando:
- Carga inicial (SSR)
- Se llama `revalidate()` o `revalidatePath()`

### Uso en Componentes

```tsx
import { revalidate } from "@lolyjs/core/client-cache";

export default function DataPage({ props }) {
  const handleRefresh = async () => {
    // Fuerza la ejecución de TODOS los hooks (layout + page)
    await revalidate();
    // Los datos se actualizarán automáticamente
    // Los componentes que escuchan 'fw-data-refresh' se actualizarán
  };
  
  return (
    <div>
      <button onClick={handleRefresh}>Actualizar Datos</button>
      <div>{props.data}</div>
    </div>
  );
}
```

## Estrategias de Cache

### Cache por TTL

```tsx
// Cache por tiempo fijo
export const getServerSideProps = withCache(
  async (ctx) => {
    // ...
  },
  { ttl: 3600 } // 1 hora
);
```

### Cache por Request

```tsx
// Cache durante la request actual
export const getServerSideProps = withCache(
  async (ctx) => {
    // ...
  },
  { ttl: 0 } // Solo durante la request
);
```

## Mejores Prácticas

1. **TTL Apropiado**: Usa TTLs apropiados según la frecuencia de cambio de datos
2. **Claves Únicas**: Asegúrate de que las claves de cache sean únicas
3. **Invalidación**: Invalida el cache cuando sea necesario
4. **No Cachear Datos Sensibles**: No cachees datos de usuario o información sensible

## Nota

El sistema de caché está en desarrollo activo. La implementación actual es básica y se mejorará en futuras versiones con:
- Soporte para diferentes backends (Redis, Memcached)
- Invalidación más granular
- Cache tags
- Stale-while-revalidate

## Próximos Pasos

- [Server Loaders](./04-server-loaders.md) - Usar cache en loaders
- [Rendering](./07-rendering.md) - Optimizaciones de rendering
