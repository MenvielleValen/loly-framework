# Sistema de Logging

Loly Framework incluye un sistema de logging estructurado usando Pino, proporcionando logs detallados y útiles tanto en desarrollo como en producción.

## Conceptos Básicos

### Logger Global

```tsx
import { logger } from "@lolyjs/core";

logger.info("Application started");
logger.error("Something went wrong", error);
logger.warn("Warning message");
logger.debug("Debug information");
```

### Logger por Módulo

```tsx
import { createModuleLogger } from "@lolyjs/core";

const logger = createModuleLogger("my-module");

logger.info("Module initialized");
```

## Niveles de Log

- `error`: Errores que requieren atención
- `warn`: Advertencias
- `info`: Información general
- `debug`: Información de debugging

## Logger por Request

### Automático

El framework crea un logger por request automáticamente con:
- Request ID único
- Método HTTP
- Path
- Timestamp

### Acceso en Handlers

```tsx
import { getRequestLogger } from "@lolyjs/core";

export async function GET(ctx: ApiContext) {
  const reqLogger = getRequestLogger(ctx.req);
  
  reqLogger.info("Processing request", {
    userId: ctx.locals.user?.id,
  });
  
  // ...
}
```

## Ejemplos de Uso

### En Server Loaders

```tsx
import { createModuleLogger } from "@lolyjs/core";
import type { ServerLoader } from "@lolyjs/core";

const logger = createModuleLogger("blog-loader");

export const getServerSideProps: ServerLoader = async (ctx) => {
  logger.info("Loading blog post", { slug: ctx.params.slug });
  
  try {
    const post = await getPost(ctx.params.slug);
    logger.info("Post loaded", { postId: post.id });
    
    return { props: { post } };
  } catch (error) {
    logger.error("Failed to load post", error, { slug: ctx.params.slug });
    return ctx.NotFound();
  }
};
```

### En API Routes

```tsx
import { getRequestLogger } from "@lolyjs/core";

export async function POST(ctx: ApiContext) {
  const reqLogger = getRequestLogger(ctx.req);
  
  reqLogger.info("Creating user", {
    email: ctx.req.body.email,
  });
  
  try {
    const user = await createUser(ctx.req.body);
    reqLogger.info("User created", { userId: user.id });
    
    return ctx.Response({ user }, 201);
  } catch (error) {
    reqLogger.error("Failed to create user", error);
    throw error;
  }
}
```

### En Middleware

```tsx
import { getRequestLogger } from "@lolyjs/core";

export const middleware: RouteMiddleware[] = [
  async (ctx, next) => {
    const reqLogger = getRequestLogger(ctx.req);
    const start = Date.now();
    
    reqLogger.info("Request started", {
      method: ctx.req.method,
      path: ctx.pathname,
    });
    
    await next();
    
    const duration = Date.now() - start;
    reqLogger.info("Request completed", {
      duration,
      status: ctx.res.statusCode,
    });
  },
];
```

## Formato de Logs

### Desarrollo

En desarrollo, los logs se formatean con `pino-pretty` para legibilidad:

```
[2024-01-15 10:30:45] INFO: Request started
  method: "GET"
  path: "/blog/my-post"
  requestId: "abc123"
```

### Producción

En producción, los logs se formatean como JSON:

```json
{
  "level": 30,
  "time": 1705315845000,
  "msg": "Request started",
  "method": "GET",
  "path": "/blog/my-post",
  "requestId": "abc123"
}
```

## Request ID

Cada request tiene un ID único que se propaga a través de:
- Logs del request
- Headers de respuesta (opcional)
- Contexto del request

### Acceso al Request ID

```tsx
import { generateRequestId, getRequestLogger } from "@lolyjs/core";

const reqLogger = getRequestLogger(ctx.req);
const requestId = reqLogger.context.requestId;
```

## Contexto de Logger

### Agregar Contexto

```tsx
const logger = createModuleLogger("my-module");

logger.info("Operation started", {
  userId: "123",
  operation: "create-post",
  metadata: {
    source: "api",
    version: "1.0",
  },
});
```

## Mejores Prácticas

1. **Usa Niveles Apropiados**: 
   - `error` para errores
   - `warn` para advertencias
   - `info` para información importante
   - `debug` para debugging

2. **Incluye Contexto**: Agrega contexto relevante a los logs

3. **No Logs Sensibles**: No loguees contraseñas, tokens, o datos sensibles

4. **Logger por Módulo**: Usa `createModuleLogger` para logs de módulos

5. **Request Logger**: Usa `getRequestLogger` en handlers para logs de request

## Configuración

### Variables de Entorno

```env
LOG_LEVEL=info  # error, warn, info, debug
```

### Personalización

El logger se configura automáticamente. En producción, los logs se formatean como JSON para facilitar el parsing por herramientas de logging.

## Próximos Pasos

- [Middleware](./08-middleware.md) - Logging en middleware
- [API Routes](./05-api-routes.md) - Logging en APIs
