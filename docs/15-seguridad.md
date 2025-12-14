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

Loly Framework incluye rate limiting integrado para proteger tu aplicación contra abusos y ataques DDoS.

### Configuración Global

```typescript
// loly.config.ts
import { ServerConfig } from "@lolyjs/core";

export const config = (env: string): ServerConfig => {
  return {
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutos (ventana de tiempo)
      max: 100,                  // Máximo de requests generales por IP
      apiMax: 100,               // Máximo para rutas API (opcional, usa max si no se especifica)
      strictMax: 5,              // Máximo para rutas estrictas (auth, etc.)
      strictPatterns: [          // Patrones que usan strictMax automáticamente
        "/api/auth/**",
        "/api/login/**",
        "/api/register/**",
        "/api/password/**",
        "/api/reset/**",
      ],
    },
  };
};
```

**Nota**: El rate limiting se aplica automáticamente en producción. Para habilitarlo en desarrollo, establece `ENABLE_RATE_LIMIT=true`.

### Rate Limiting Automático

El framework aplica automáticamente rate limiting estricto a rutas que coinciden con `strictPatterns`:

- Las rutas que coinciden con los patrones usan `strictMax` (por defecto 5 requests/15min)
- Las demás rutas usan `max` (por defecto 100 requests/15min)
- Si una ruta ya tiene un rate limiter manual, no se aplica el automático

### Rate Limiting Manual por Ruta

Puedes aplicar rate limiting manualmente en rutas específicas:

```tsx
// app/api/sensitive/route.ts
import { strictRateLimiter, defaultRateLimiter, createRateLimiter } from "@lolyjs/core";

// Usar rate limiter predefinido
export const middlewares: ApiMiddleware[] = [
  strictRateLimiter, // 5 requests / 15 min
  // ... otros middlewares
];

// O crear uno personalizado
const customLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minuto
  max: 10,             // 10 requests por minuto
  message: "Too many requests, please slow down.",
});

export const middlewares: ApiMiddleware[] = [
  customLimiter,
];
```

### Rate Limiters Disponibles

```tsx
import { 
  defaultRateLimiter,    // 100 requests / 15 min (general)
  strictRateLimiter,     // 5 requests / 15 min (auth/sensitive)
  lenientRateLimiter,    // 200 requests / 15 min (público)
  createRateLimiter      // Crear limiter personalizado
} from "@lolyjs/core";
```

### Opciones Avanzadas

```tsx
const customLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: "Too many requests, please try again later.",
  standardHeaders: true,        // Incluir headers estándar (X-RateLimit-*)
  legacyHeaders: false,          // Incluir headers legacy (Retry-After)
  skipSuccessfulRequests: false, // Contar requests exitosos
  skipFailedRequests: false,     // Contar requests fallidos
  keyGenerator: (req) => {        // Generar clave personalizada (por defecto: IP)
    return req.user?.id || req.ip;
  },
  skip: (req) => {              // Saltar rate limiting para ciertos requests
    return req.user?.isAdmin === true;
  },
});
```

### Respuestas de Rate Limiting

Cuando se excede el límite, el framework retorna:

- **Status Code**: `429 Too Many Requests`
- **Headers**:
  - `X-RateLimit-Limit`: Límite máximo
  - `X-RateLimit-Remaining`: Requests restantes
  - `X-RateLimit-Reset`: Timestamp de reset
  - `Retry-After`: Segundos hasta poder hacer otro request
- **Body**: `{ error: "Too many requests...", retryAfter: 900 }`

### Logging

El framework registra automáticamente cuando se excede el límite:

```
[rate-limit] Rate limit exceeded {
  ip: "192.168.1.1",
  path: "/api/auth/login",
  method: "POST",
  limit: 5,
  windowMs: 900000,
  retryAfter: 900
}
```

### Validación de Configuración

El framework valida automáticamente la configuración:
- `windowMs` debe ser un entero >= 1000 (millisegundos)
- `max`, `apiMax`, `strictMax` deben ser enteros >= 1
- Si la configuración es inválida, el servidor continúa sin rate limiting (no crashea)

### Mejores Prácticas

1. **Usa strictMax para endpoints sensibles**: Auth, registro, reset de password
2. **Ajusta según tu tráfico**: Monitorea y ajusta los límites según necesidad
3. **Considera usuarios autenticados**: Puedes usar `keyGenerator` para rate limiting por usuario
4. **Habilita en desarrollo solo si es necesario**: Por defecto está deshabilitado en dev
5. **Monitorea los logs**: Revisa los logs de rate limiting para detectar ataques

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
