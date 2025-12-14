# Middleware System

El sistema de middleware de Loly permite ejecutar código antes de que se ejecuten los loaders o handlers. Es útil para autenticación, logging, transformación de requests, y más.

## Tipos de Middleware

### Route Middleware
Se ejecuta antes de los server loaders en páginas. Se define en `page.server.hook.ts` (preferido) o `server.hook.ts` (legacy) usando `beforeServerData`:

```tsx
// app/admin/page.server.hook.ts (preferido) o app/admin/server.hook.ts (legacy)
import type { RouteMiddleware, ServerLoader } from "@lolyjs/core";

export const beforeServerData: RouteMiddleware[] = [
  async (ctx, next) => {
    // Verificar autenticación
    const token = ctx.req.headers.authorization;
    if (!token) {
      ctx.res.status(401).json({ error: "Unauthorized" });
      return;
    }
    
    // Agregar usuario a locals
    ctx.locals.user = await verifyToken(token);
    
    await next();
  },
];

export const getServerSideProps: ServerLoader = async (ctx) => {
  const user = ctx.locals.user;
  return {
    props: {
      user,
    },
  };
};
```

```tsx
// app/admin/page.tsx
export default function AdminPage({ props }) {
  return <div>Admin: {props.user.name}</div>;
}
```

### API Middleware
Se ejecuta antes de los handlers en API routes usando `beforeApi`:

```tsx
// app/api/protected/route.ts
import type { ApiMiddleware, ApiContext } from "@lolyjs/core";

export const beforeApi: ApiMiddleware[] = [
  async (ctx, next) => {
    const token = ctx.req.headers.authorization;
    if (!token) {
      return ctx.Response({ error: "Unauthorized" }, 401);
    }
    
    ctx.locals.user = await verifyToken(token);
    await next();
  },
];

export async function GET(ctx: ApiContext) {
  const user = ctx.locals.user;
  return ctx.Response({ user });
}
```

### Middleware por Método HTTP
También puedes definir middlewares específicos por método usando `beforeGET`, `beforePOST`, etc.:

```tsx
export const beforeApi: ApiMiddleware[] = [
  // Middleware global para todos los métodos
];

export const beforePOST: ApiMiddleware[] = [
  // Solo se ejecuta antes de POST
  async (ctx, next) => {
    // Validación específica para POST
    await next();
  },
];
```

## Contexto del Middleware

### Route Middleware Context

```typescript
type RouteMiddleware = (
  ctx: ServerContext & { theme?: string },
  next: () => Promise<void>
) => Promise<void> | void;
```

### API Middleware Context

```typescript
type ApiMiddleware = (
  ctx: ApiContext,
  next: () => Promise<void>
) => void | Promise<void>;
```

## Ejecución de Middleware

### Orden de Ejecución

1. **Global Middleware** (si está configurado)
2. **Route/API Middleware** (en orden de definición)
3. **Loader/Handler**

### Terminando la Request

El middleware puede terminar la request:

```tsx
export const middleware: RouteMiddleware[] = [
  async (ctx, next) => {
    // No llamar next() termina la request
    if (!isAuthorized(ctx.req)) {
      ctx.res.status(403).json({ error: "Forbidden" });
      return; // No se ejecuta el loader
    }
    
    await next(); // Continúa al siguiente middleware o loader
  },
];
```

## Ejemplos Completos

### Autenticación

```tsx
// app/dashboard/page.tsx
import type { RouteMiddleware } from "@lolyjs/core";

export const middleware: RouteMiddleware[] = [
  async (ctx, next) => {
    const token = ctx.req.cookies?.authToken;
    
    if (!token) {
      ctx.res.redirect("/login");
      return;
    }
    
    try {
      const user = await verifyToken(token);
      ctx.locals.user = user;
      await next();
    } catch (error) {
      ctx.res.redirect("/login");
    }
  },
];

export const getServerSideProps: ServerLoader = async (ctx) => {
  const user = ctx.locals.user; // Disponible desde middleware
  return {
    props: {
      user,
      dashboardData: await getDashboardData(user.id),
    },
  };
};
```

### Logging

```tsx
export const middleware: RouteMiddleware[] = [
  async (ctx, next) => {
    const start = Date.now();
    const { pathname, req } = ctx;
    
    console.log(`[${req.method}] ${pathname} - Start`);
    
    await next();
    
    const duration = Date.now() - start;
    console.log(`[${req.method}] ${pathname} - ${duration}ms`);
  },
];
```

### Rate Limiting

```tsx
import { defaultRateLimiter } from "@lolyjs/core";

export const middleware: ApiMiddleware[] = [
  defaultRateLimiter,
  // otros middlewares...
];
```

### Validación de Headers

```tsx
export const middleware: ApiMiddleware[] = [
  async (ctx, next) => {
    const contentType = ctx.req.headers["content-type"];
    
    if (ctx.req.method === "POST" && contentType !== "application/json") {
      return ctx.Response(
        { error: "Content-Type must be application/json" },
        400
      );
    }
    
    await next();
  },
];
```

### Transformación de Request

```tsx
export const middleware: RouteMiddleware[] = [
  async (ctx, next) => {
    // Normalizar query parameters
    if (ctx.req.query.page) {
      ctx.req.query.page = String(ctx.req.query.page);
    }
    
    // Agregar timestamp
    ctx.locals.requestTime = Date.now();
    
    await next();
  },
];
```

### CORS Personalizado

```tsx
export const middleware: ApiMiddleware[] = [
  async (ctx, next) => {
    const origin = ctx.req.headers.origin;
    
    if (allowedOrigins.includes(origin)) {
      ctx.res.setHeader("Access-Control-Allow-Origin", origin);
      ctx.res.setHeader("Access-Control-Allow-Credentials", "true");
    }
    
    if (ctx.req.method === "OPTIONS") {
      ctx.res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
      ctx.res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      return ctx.Response({}, 200);
    }
    
    await next();
  },
];
```

## Middleware Compartido

### Crear Middleware Reutilizable

```tsx
// lib/middleware/auth.ts
import type { RouteMiddleware } from "@lolyjs/core";

export const requireAuth: RouteMiddleware = async (ctx, next) => {
  const token = ctx.req.headers.authorization;
  
  if (!token) {
    ctx.res.status(401).json({ error: "Unauthorized" });
    return;
  }
  
  const user = await verifyToken(token);
  ctx.locals.user = user;
  
  await next();
};

export const requireAdmin: RouteMiddleware = async (ctx, next) => {
  const user = ctx.locals.user;
  
  if (!user || user.role !== "admin") {
    ctx.res.status(403).json({ error: "Forbidden" });
    return;
  }
  
  await next();
};
```

### Usar Middleware Compartido

```tsx
// app/admin/page.tsx
import { requireAuth, requireAdmin } from "@/lib/middleware/auth";

export const middleware = [requireAuth, requireAdmin];
```

## Middleware por Método (API)

En API routes, puedes tener middleware específico por método:

```tsx
export const middleware = {
  GET: [
    async (ctx, next) => {
      // Solo para GET
      await next();
    },
  ],
  POST: [
    async (ctx, next) => {
      // Solo para POST
      await next();
    },
  ],
};

// Middleware global (para todos los métodos)
export const middleware: ApiMiddleware[] = [
  async (ctx, next) => {
    // Para todos los métodos
    await next();
  },
];
```

## Mejores Prácticas

1. **Orden**: Coloca middlewares en el orden correcto (auth antes de autorización)
2. **Early Returns**: Termina la request temprano si es necesario
3. **Error Handling**: Maneja errores apropiadamente
4. **Reutilización**: Crea middlewares reutilizables
5. **Performance**: Evita operaciones costosas en middleware cuando sea posible

## Middleware Global del Framework

El framework incluye middleware global automático:

- **Helmet**: Headers de seguridad
- **CORS**: Configuración de CORS
- **Body Parser**: Parsing de JSON y URL-encoded
- **Cookie Parser**: Parsing de cookies
- **Compression**: Compresión de respuestas
- **Rate Limiting**: Rate limiting global (configurable)

## Próximos Pasos

- [Validation](./09-validation.md) - Validación de datos
- [Security](./15-seguridad.md) - Seguridad y sanitización
