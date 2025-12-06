# API Routes

Las API Routes permiten crear endpoints REST directamente en el sistema de archivos. Se definen en `app/api/` y siguen la misma convención de routing que las páginas. **Ventaja de Loly**: Middlewares flexibles a nivel de ruta y por método HTTP, permitiendo control granular sobre la ejecución de lógica antes de los handlers.

## Conceptos Básicos

Un API Route es un archivo `route.ts` (o `route.tsx`, `route.js`, `route.jsx`) que exporta handlers para métodos HTTP. **Característica única de Loly**: Soporte completo para middlewares a nivel de ruta y por método HTTP.

```tsx
// app/api/users/route.ts
import type { ApiContext } from "@lolyjs/core";

export async function GET(ctx: ApiContext) {
  return ctx.Response({ users: [] });
}

export async function POST(ctx: ApiContext) {
  return ctx.Response({ created: true }, 201);
}
```

## Estructura de Archivos

```
app/
└── api/
    ├── users/
    │   └── route.ts          → GET, POST /api/users
    └── users/
        └── [id]/
            └── route.ts      → GET, PUT, DELETE /api/users/:id
```

## ApiContext

El contexto de API proporciona:

```typescript
interface ApiContext {
  req: Request;                   // Express Request
  res: Response;                  // Express Response
  Response: (body?, status?) => Response;  // Helper para respuestas
  NotFound: (body?) => Response;          // Helper para 404
  params: Record<string, string>; // Parámetros de ruta
  pathname: string;               // Path de la request
  locals: Record<string, any>;    // Datos locales (de middlewares)
}
```

## Métodos HTTP Soportados

- `GET` - Obtener recursos
- `POST` - Crear recursos
- `PUT` - Actualizar recursos (completo)
- `PATCH` - Actualizar recursos (parcial)
- `DELETE` - Eliminar recursos
- `OPTIONS` - CORS preflight

## Ejemplos Básicos

### GET Handler

```tsx
// app/api/users/route.ts
import type { ApiContext } from "@lolyjs/core";

export async function GET(ctx: ApiContext) {
  const users = await getAllUsers();
  
  return ctx.Response({
    users,
    count: users.length,
  });
}
```

### POST Handler

```tsx
export async function POST(ctx: ApiContext) {
  const body = ctx.req.body;
  const user = await createUser(body);
  
  return ctx.Response(
    { user, message: "User created" },
    201
  );
}
```

### Con Parámetros

```tsx
// app/api/users/[id]/route.ts
export async function GET(ctx: ApiContext) {
  const { id } = ctx.params;
  const user = await getUserById(id);
  
  if (!user) {
    return ctx.NotFound({ error: "User not found" });
  }
  
  return ctx.Response({ user });
}

export async function PUT(ctx: ApiContext) {
  const { id } = ctx.params;
  const body = ctx.req.body;
  
  const user = await updateUser(id, body);
  return ctx.Response({ user });
}

export async function DELETE(ctx: ApiContext) {
  const { id } = ctx.params;
  await deleteUser(id);
  
  return ctx.Response({ message: "User deleted" }, 204);
}
```

## Validación

### Validación de Query Parameters

```tsx
import { validate } from "@lolyjs/core";
import { z } from "zod";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

export async function GET(ctx: ApiContext) {
  try {
    const query = validate(querySchema, ctx.req.query);
    const { page, limit } = query;
    
    const users = await getUsers({ page, limit });
    
    return ctx.Response({
      users,
      page,
      limit,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return ctx.Response(
        { error: "Invalid query parameters", details: error.format() },
        400
      );
    }
    throw error;
  }
}
```

### Validación de Body

```tsx
const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().min(0).max(150),
});

export async function POST(ctx: ApiContext) {
  try {
    const data = validate(createUserSchema, ctx.req.body);
    const user = await createUser(data);
    
    return ctx.Response({ user }, 201);
  } catch (error) {
    if (error.name === "ValidationError") {
      return ctx.Response(
        { error: "Validation failed", details: error.format() },
        400
      );
    }
    throw error;
  }
}
```

## Middleware

### Middleware Global
Se ejecuta para todos los métodos usando `beforeApi`:

```tsx
import type { ApiMiddleware } from "@lolyjs/core";

export const beforeApi: ApiMiddleware[] = [
  async (ctx, next) => {
    // Logging
    console.log(`${ctx.req.method} ${ctx.pathname}`);
    await next();
  },
  async (ctx, next) => {
    // Autenticación
    const token = ctx.req.headers.authorization;
    if (!token) {
      return ctx.Response({ error: "Unauthorized" }, 401);
    }
    ctx.locals.user = await verifyToken(token);
    await next();
  },
];

export async function GET(ctx: ApiContext) {
  const user = ctx.locals.user; // Disponible desde middleware
  return ctx.Response({ user });
}
```

### Middleware por Método
Se ejecuta solo para métodos específicos usando `beforeGET`, `beforePOST`, etc.:

```tsx
export const beforeApi: ApiMiddleware[] = [
  // Middleware global para todos los métodos
];

export const beforeGET: ApiMiddleware[] = [
  async (ctx, next) => {
    // Solo para GET
    await next();
  },
];

export const beforePOST: ApiMiddleware[] = [
  async (ctx, next) => {
    // Solo para POST
    await next();
  },
];
```

**Nota**: Los middlewares por método se ejecutan después de los middlewares globales (`beforeApi`).

## Ejemplos Completos

### CRUD Completo

```tsx
// app/api/posts/route.ts
import type { ApiContext } from "@lolyjs/core";
import { validate } from "@lolyjs/core";
import { z } from "zod";

const postSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  published: z.boolean().optional().default(false),
});

const querySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

export async function GET(ctx: ApiContext) {
  const query = validate(querySchema, ctx.req.query);
  const posts = await getPosts(query);
  
  return ctx.Response({
    posts,
    pagination: {
      page: query.page,
      limit: query.limit,
    },
  });
}

export async function POST(ctx: ApiContext) {
  const data = validate(postSchema, ctx.req.body);
  const post = await createPost(data);
  
  return ctx.Response({ post }, 201);
}
```

```tsx
// app/api/posts/[id]/route.ts
const updatePostSchema = postSchema.partial();

export async function GET(ctx: ApiContext) {
  const { id } = ctx.params;
  const post = await getPostById(id);
  
  if (!post) {
    return ctx.NotFound({ error: "Post not found" });
  }
  
  return ctx.Response({ post });
}

export async function PUT(ctx: ApiContext) {
  const { id } = ctx.params;
  const data = validate(updatePostSchema, ctx.req.body);
  
  const post = await updatePost(id, data);
  if (!post) {
    return ctx.NotFound({ error: "Post not found" });
  }
  
  return ctx.Response({ post });
}

export async function DELETE(ctx: ApiContext) {
  const { id } = ctx.params;
  const deleted = await deletePost(id);
  
  if (!deleted) {
    return ctx.NotFound({ error: "Post not found" });
  }
  
  return ctx.Response({ message: "Post deleted" }, 204);
}
```

### API con Autenticación

```tsx
// app/api/dashboard/route.ts
import type { ApiMiddleware, ApiContext } from "@lolyjs/core";

export const middleware: ApiMiddleware[] = [
  async (ctx, next) => {
    const token = ctx.req.headers.authorization?.replace("Bearer ", "");
    
    if (!token) {
      return ctx.Response({ error: "Missing token" }, 401);
    }
    
    try {
      const user = await verifyToken(token);
      ctx.locals.user = user;
      await next();
    } catch (error) {
      return ctx.Response({ error: "Invalid token" }, 401);
    }
  },
];

export async function GET(ctx: ApiContext) {
  const user = ctx.locals.user;
  const dashboardData = await getDashboardData(user.id);
  
  return ctx.Response({ dashboardData });
}
```

### API con Rate Limiting

```tsx
import { defaultRateLimiter } from "@lolyjs/core";

export const beforeApi: ApiMiddleware[] = [
  defaultRateLimiter,
  // otros middlewares...
];
```

## Respuestas

### Respuesta Exitosa

```tsx
return ctx.Response({ data: "value" });           // 200
return ctx.Response({ data: "value" }, 201);      // 201 Created
return ctx.Response({ data: "value" }, 204);       // 204 No Content
```

### Respuesta de Error

```tsx
return ctx.Response({ error: "Message" }, 400);    // 400 Bad Request
return ctx.Response({ error: "Unauthorized" }, 401); // 401
return ctx.NotFound({ error: "Not found" });       // 404
return ctx.Response({ error: "Server error" }, 500); // 500
```

### Headers Personalizados

```tsx
export async function GET(ctx: ApiContext) {
  ctx.res.setHeader("X-Custom-Header", "value");
  return ctx.Response({ data: "value" });
}
```

## Mejores Prácticas

1. **Validación**: Siempre valida inputs con Zod
2. **Manejo de Errores**: Maneja errores apropiadamente
3. **Status Codes**: Usa los códigos HTTP correctos
4. **Type Safety**: Tipa tus respuestas
5. **Middleware**: Usa middleware para lógica compartida
6. **Rate Limiting**: Protege endpoints con rate limiting

## Próximos Pasos

- [Validation](./09-validation.md) - Validación detallada
- [Middleware](./08-middleware.md) - Sistema de middleware
- [WebSockets](./06-websockets.md) - Comunicación en tiempo real
