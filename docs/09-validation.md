# Validación con Zod

Loly Framework incluye validación integrada usando Zod, una biblioteca de validación TypeScript-first.

## Conceptos Básicos

### Importar Validación

```tsx
import { validate, safeValidate, ValidationError } from "@lolyjs/core";
import { z } from "zod";
```

### Validación Básica

```tsx
const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().min(0).max(150),
});

// Lanza error si falla
const data = validate(schema, input);

// Retorna resultado
const result = safeValidate(schema, input);
if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error);
}
```

## Validación en Server Loaders

### Validar Parámetros de Ruta

```tsx
import type { ServerLoader } from "@lolyjs/core";
import { validate } from "@lolyjs/core";
import { z } from "zod";

const idSchema = z.string().uuid();

export const getServerSideProps: ServerLoader = async (ctx) => {
  try {
    const id = validate(idSchema, ctx.params.id);
    const product = await getProduct(id);
    
    return { props: { product } };
  } catch (error) {
    if (error instanceof ValidationError) {
      return ctx.NotFound();
    }
    throw error;
  }
};
```

### Validar Query Parameters

```tsx
const querySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  search: z.string().max(100).optional(),
});

export const getServerSideProps: ServerLoader = async (ctx) => {
  const query = validate(querySchema, ctx.req.query);
  const { page, limit, search } = query;
  
  const posts = await getPosts({ page, limit, search });
  
  return {
    props: {
      posts,
      pagination: { page, limit },
    },
  };
};
```

## Validación en API Routes

### Validar Body

```tsx
const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  age: z.number().int().min(0).max(150).optional(),
});

export async function POST(ctx: ApiContext) {
  try {
    const data = validate(createUserSchema, ctx.req.body);
    const user = await createUser(data);
    
    return ctx.Response({ user }, 201);
  } catch (error) {
    if (error instanceof ValidationError) {
      return ctx.Response(
        {
          error: "Validation failed",
          details: error.format(),
        },
        400
      );
    }
    throw error;
  }
}
```

### Validar Query + Body

```tsx
const querySchema = z.object({
  include: z.enum(["posts", "comments"]).optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
});

export async function PUT(ctx: ApiContext) {
  try {
    const query = validate(querySchema, ctx.req.query);
    const data = validate(updateUserSchema, ctx.req.body);
    
    const user = await updateUser(ctx.params.id, data, query);
    
    return ctx.Response({ user });
  } catch (error) {
    if (error instanceof ValidationError) {
      return ctx.Response(
        { error: "Validation failed", details: error.format() },
        400
      );
    }
    throw error;
  }
}
```

## Schemas Reutilizables

### Common Schemas

El framework proporciona schemas comunes:

```tsx
import { commonSchemas } from "@lolyjs/core";

// String param (route params)
const id = validate(commonSchemas.stringParam, ctx.params.id);

// UUID param
const uuid = validate(commonSchemas.uuidParam, ctx.params.id);

// ID numérico
const numericId = validate(commonSchemas.idParam, ctx.params.id);

// Paginación
const pagination = validate(commonSchemas.pagination, ctx.req.query);
// { page: number, limit: number }
```

### Crear Schemas Reutilizables

```tsx
// lib/schemas/user.ts
import { z } from "zod";

export const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  createdAt: z.date(),
});

export const createUserSchema = userSchema.omit({ id: true, createdAt: true });

export const updateUserSchema = createUserSchema.partial();
```

### Usar Schemas Reutilizables

```tsx
import { createUserSchema, updateUserSchema } from "@/lib/schemas/user";

export async function POST(ctx: ApiContext) {
  const data = validate(createUserSchema, ctx.req.body);
  // ...
}
```

## Validación Avanzada

### Validación Condicional

```tsx
const schema = z.object({
  type: z.enum(["user", "admin"]),
  email: z.string().email(),
  adminCode: z.string().optional(),
}).refine(
  (data) => {
    if (data.type === "admin") {
      return !!data.adminCode;
    }
    return true;
  },
  {
    message: "adminCode is required for admin type",
    path: ["adminCode"],
  }
);
```

### Transformaciones

```tsx
const schema = z.object({
  // Convertir string a número
  page: z.string().regex(/^\d+$/).transform(Number),
  
  // Normalizar email
  email: z.string().email().transform(email => email.toLowerCase()),
  
  // Convertir a fecha
  date: z.string().datetime().transform(str => new Date(str)),
});
```

### Validación de Arrays

```tsx
const schema = z.object({
  tags: z.array(z.string()).min(1).max(10),
  items: z.array(z.object({
    id: z.string(),
    quantity: z.number().int().min(1),
  })),
});
```

## Manejo de Errores

### ValidationError

```tsx
import { ValidationError } from "@lolyjs/core";

try {
  const data = validate(schema, input);
} catch (error) {
  if (error instanceof ValidationError) {
    // error.errors: Array de ZodIssue
    // error.format(): Formato legible
    console.error(error.format());
  }
}
```

### Formato de Errores

```tsx
const result = safeValidate(schema, input);
if (!result.success) {
  const formatted = result.error.format();
  // {
  //   "name": ["Required"],
  //   "email": ["Invalid email"],
  //   "age": ["Expected number, received string"]
  // }
}
```

## Ejemplos Completos

### Validación Completa de API

```tsx
// app/api/users/route.ts
import { validate, ValidationError } from "@lolyjs/core";
import { z } from "zod";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  search: z.string().max(100).optional(),
  role: z.enum(["user", "admin"]).optional(),
});

const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  role: z.enum(["user", "admin"]).default("user"),
});

export async function GET(ctx: ApiContext) {
  try {
    const query = validate(querySchema, ctx.req.query);
    const users = await getUsers(query);
    
    return ctx.Response({ users, ...query });
  } catch (error) {
    if (error instanceof ValidationError) {
      return ctx.Response(
        { error: "Invalid query", details: error.format() },
        400
      );
    }
    throw error;
  }
}

export async function POST(ctx: ApiContext) {
  try {
    const data = validate(createUserSchema, ctx.req.body);
    const user = await createUser(data);
    
    return ctx.Response({ user }, 201);
  } catch (error) {
    if (error instanceof ValidationError) {
      return ctx.Response(
        { error: "Validation failed", details: error.format() },
        400
      );
    }
    throw error;
  }
}
```

### Validación con Coerción

```tsx
// Coerción automática de tipos
const schema = z.object({
  // String a número
  page: z.coerce.number().int().min(1),
  
  // String a booleano
  published: z.coerce.boolean(),
  
  // String a fecha
  date: z.coerce.date(),
});
```

## Mejores Prácticas

1. **Usa Schemas Reutilizables**: Crea schemas compartidos
2. **Valida Temprano**: Valida en middleware o al inicio de handlers
3. **Mensajes Claros**: Proporciona mensajes de error descriptivos
4. **Type Safety**: Aprovecha la inferencia de tipos de Zod
5. **Coerción**: Usa `z.coerce` para convertir tipos cuando sea seguro

## Próximos Pasos

- [API Routes](./05-api-routes.md) - Usar validación en APIs
- [Server Loaders](./04-server-loaders.md) - Validar en loaders
