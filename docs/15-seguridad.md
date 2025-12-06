# Seguridad

Loly Framework incluye múltiples características de seguridad integradas para proteger tu aplicación.

## Sanitización

### Sanitización Automática

El framework sanitiza automáticamente:
- Parámetros de ruta
- Query parameters
- Body de requests

### Funciones de Sanitización

```tsx
import { 
  sanitizeString, 
  sanitizeObject, 
  sanitizeParams, 
  sanitizeQuery 
} from "@lolyjs/core";

// Sanitizar string
const clean = sanitizeString(userInput);

// Sanitizar objeto
const cleanObj = sanitizeObject({ name: userInput });

// Sanitizar parámetros de ruta (automático)
// Los parámetros se sanitizan automáticamente en el framework

// Sanitizar query (manual si es necesario)
const cleanQuery = sanitizeQuery(ctx.req.query);
```

## Rate Limiting

### Configuración Global

```typescript
// loly.config.ts
import { ServerConfig } from "@lolyjs/core";

export const config = (env: string): ServerConfig => {
  return {
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 1000,                 // Máximo de requests
      strictMax: 5,             // Máximo para rutas estrictas
      strictPatterns: [
        "/api/search/**",
        "/api/favorites/**",
      ],
    },
  };
};
```

### Rate Limiting por Ruta

```tsx
import { strictRateLimiter } from "@lolyjs/core";

export const middleware: ApiMiddleware[] = [
  strictRateLimiter,
  // ...
];
```

### Rate Limiters Disponibles

```tsx
import { 
  defaultRateLimiter,    // 100 requests / 15 min
  strictRateLimiter,     // 5 requests / 15 min
  lenientRateLimiter,    // 200 requests / 15 min
  createRateLimiter      // Personalizado
} from "@lolyjs/core";
```

## Helmet (Security Headers)

El framework incluye Helmet automáticamente para headers de seguridad:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security`
- `Content-Security-Policy` (con nonces)

## Content Security Policy (CSP)

### Nonces Automáticos

El framework genera nonces automáticamente para scripts inline:

```html
<script nonce="abc123">
  window.__FW_DATA__ = {...};
</script>
```

### Configuración

Helmet configura CSP automáticamente. Los nonces se inyectan en:
- Scripts inline de initial data
- Scripts del cliente

## CORS

### Configuración

```typescript
// init.server.ts
export const config = (env: string): ServerConfig => {
  return {
    corsOrigin: "*", // Permitir todos los orígenes
    // o
    corsOrigin: [
      "https://example.com",
      "https://www.example.com",
    ],
  };
};
```

## Validación de Inputs

### Siempre Valida Inputs

```tsx
import { validate } from "@lolyjs/core";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  age: z.number().int().min(0).max(150),
});

export async function POST(ctx: ApiContext) {
  try {
    const data = validate(schema, ctx.req.body);
    // Usar data validado
  } catch (error) {
    return ctx.Response({ error: "Invalid input" }, 400);
  }
}
```

## Autenticación y Autorización

### Middleware de Autenticación

```tsx
export const middleware: RouteMiddleware[] = [
  async (ctx, next) => {
    const token = ctx.req.headers.authorization;
    
    if (!token) {
      ctx.res.status(401).json({ error: "Unauthorized" });
      return;
    }
    
    try {
      const user = await verifyToken(token);
      ctx.locals.user = user;
      await next();
    } catch (error) {
      ctx.res.status(401).json({ error: "Invalid token" });
    }
  },
];
```

### Autorización

```tsx
export const middleware: RouteMiddleware[] = [
  async (ctx, next) => {
    const user = ctx.locals.user;
    
    if (!user || user.role !== "admin") {
      ctx.res.status(403).json({ error: "Forbidden" });
      return;
    }
    
    await next();
  },
];
```

## Protección contra XSS

### Sanitización Automática

Los parámetros de ruta se sanitizan automáticamente.

### En Componentes

```tsx
// ❌ Evitar
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ Usar sanitización
import { sanitizeString } from "@lolyjs/core";
<div>{sanitizeString(userInput)}</div>
```

## Protección contra CSRF

### Tokens CSRF

Implementa tokens CSRF para formularios:

```tsx
// Generar token
const csrfToken = generateCSRFToken();

// Validar en POST
export async function POST(ctx: ApiContext) {
  const token = ctx.req.headers["x-csrf-token"];
  if (!validateCSRFToken(token)) {
    return ctx.Response({ error: "Invalid CSRF token" }, 403);
  }
  // ...
}
```

## Headers de Seguridad

### Configuración Personalizada

El framework usa Helmet con configuración por defecto. La configuración del servidor (incluyendo Helmet) se hace en `loly.config.ts` exportando una función `config` que retorna `ServerConfig`.

## Mejores Prácticas

1. **Siempre Valida**: Valida todos los inputs con Zod
2. **Sanitiza**: Usa funciones de sanitización cuando sea necesario
3. **Rate Limiting**: Protege endpoints con rate limiting
4. **Autenticación**: Verifica tokens y sesiones
5. **HTTPS**: Usa HTTPS en producción
6. **Headers**: El framework configura headers de seguridad automáticamente
7. **No Confíes en el Cliente**: Nunca confíes en datos del cliente sin validar

## Próximos Pasos

- [Validation](./09-validation.md) - Validación de datos
- [Middleware](./08-middleware.md) - Middleware de seguridad
