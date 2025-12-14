# Plan de Mejora: Sockets para Producción (Loly Realtime v1)

## 📋 Resumen Ejecutivo

Este documento detalla el plan de implementación para mejorar el sistema de WebSockets de Loly Framework, transformándolo de una implementación básica a una solución lista para producción con soporte multi-instancia, validación, rate limiting, autenticación y más.

**Estado Actual:**
- ✅ Socket.IO básico funcionando
- ✅ File-based routing (`app/wss/**/events.ts`)
- ✅ Soporte para namespaces
- ✅ Cliente helper (`lolySocket`)
- ❌ Sin soporte multi-instancia
- ❌ Sin validación de schemas
- ❌ Sin rate limiting
- ❌ Sin sistema de autenticación integrado
- ❌ Sin state store compartido
- ❌ Sin presencia/rooms avanzados

**Objetivo:**
Implementar Loly Realtime v1 según la RFC. **BREAKING CHANGE:** Solo se soportará el nuevo formato `defineWssRoute()`. El formato legacy `export const events = []` será removido.

---

## 🎯 Fases de Implementación

### **FASE 1: Configuración y Tipos Base** ⏱️ Prioridad: ALTA

#### 1.1 Extender configuración del servidor
**Archivo:** `modules/server/config.ts`

**Tareas:**
- [ ] Agregar tipo `RealtimeConfig` a `ServerConfig`
- [ ] Implementar defaults según RFC:
  - `enabled: true`
  - `path: "/wss"`
  - `transports: ["websocket", "polling"]`
  - `pingIntervalMs: 25000`
  - `pingTimeoutMs: 20000`
  - `maxPayloadBytes: 64 * 1024`
  - `allowedOrigins: "*"` (dev) / requerido en prod
  - `scale.mode: "single"`
  - `limits.connectionsPerIp: 20`
  - `limits.eventsPerSecond: 30`
  - `limits.burst: 60`
  - `logging.level: "info"`

**Validaciones:**
- Si `scale.mode === "cluster"` y falta `adapter` → error en startup
- Si `scale.mode === "cluster"` y `stateStore` es `memory` → warning

**Archivos a modificar:**
- `modules/server/config.ts`
- `modules/server/index.ts` (exportar tipos)

---

#### 1.2 Crear tipos y interfaces según RFC
**Archivo:** `modules/router/index.types.ts` (nuevo archivo `modules/realtime/types.ts`)

**Tareas:**
- [ ] Crear `AuthContext` interface
- [ ] Extender `WssContext` con:
  - `req: { headers, ip, url, cookies }`
  - `user: TUser | null`
  - `state: RealtimeStateStore`
  - `log: Logger`
  - `metrics?: Metrics`
- [ ] Extender `WssActions` con:
  - `reply(event, payload)` - emit a socket actual
  - `toRoom(room)` - rooms API
  - `toUser(userId)` - targeting por usuario
  - `error(code, message, details)` - error helper
- [ ] Crear `RealtimeStateStore` interface
- [ ] Crear `RateLimitCfg` type
- [ ] Crear `GuardFn` type
- [ ] Crear `defineWssRoute` function signature

**Archivos a crear/modificar:**
- `modules/realtime/types.ts` (nuevo)
- `modules/router/index.types.ts` (extender)

---

### **FASE 2: State Store (Memory + Redis)** ⏱️ Prioridad: ALTA

#### 2.1 Implementar Memory State Store
**Archivo:** `modules/realtime/state/memory-store.ts`

**Tareas:**
- [ ] Implementar `RealtimeStateStore` interface
- [ ] Métodos básicos: `get`, `set`, `del`
- [ ] Métodos numéricos: `incr`, `decr`
- [ ] Métodos de lista: `listPush`, `listRange`
- [ ] Métodos de set: `setAdd`, `setRem`, `setMembers`
- [ ] Opcional: `lock` con timeout
- [ ] TTL support para `set`
- [ ] LRU cache opcional para limitar memoria

**Archivos a crear:**
- `modules/realtime/state/memory-store.ts`
- `modules/realtime/state/index.ts` (factory)

---

#### 2.2 Implementar Redis State Store
**Archivo:** `modules/realtime/state/redis-store.ts`

**Tareas:**
- [ ] Instalar `ioredis` o `redis` como dependencia opcional
- [ ] Implementar `RealtimeStateStore` interface
- [ ] JSON encode/decode para valores complejos
- [ ] Implementar todos los métodos usando Redis primitives:
  - `get/set/del` → `GET/SET/DEL`
  - `incr/decr` → `INCR/DECR`
  - `listPush/listRange` → `LPUSH/LRANGE`
  - `setAdd/setRem/setMembers` → `SADD/SREM/SMEMBERS`
  - `lock` → `SET NX EX` con unlock script
- [ ] Connection pooling y error handling
- [ ] TTL support

**Dependencias:**
```json
{
  "ioredis": "^5.3.2" // o "redis": "^4.6.0"
}
```

**Archivos a crear:**
- `modules/realtime/state/redis-store.ts`
- `modules/realtime/state/index.ts` (factory que selecciona según config)

---

### **FASE 3: Route Loader Mejorado** ⏱️ Prioridad: ALTA

#### 3.1 Soporte para `defineWssRoute()`
**Archivo:** `modules/router/loader-wss.ts`

**Tareas:**
- [ ] Requerir que módulo exporte `default` con resultado de `defineWssRoute()`
- [ ] Detectar formato legacy (`export const events = []`):
  - Si se detecta → error claro con mensaje de migración
  - Mensaje: "⚠️ BREAKING CHANGE: `export const events = []` is no longer supported. Please use `defineWssRoute()` instead. See migration guide: [link]"
- [ ] Si no hay `default` → error: "WSS route must export default from defineWssRoute()"
- [ ] Validar que `default` tiene estructura correcta (tiene `events` property)
- [ ] Extraer `auth`, `onConnect`, `onDisconnect`, `events` del módulo
- [ ] Para cada evento en `events`:
  - Detectar si es `WssHandler` directo o objeto con `{ schema, rateLimit, guard, handler }`
  - Normalizar a estructura interna
- [ ] Validar estructura en runtime (dev mode) con mensajes de error claros

**Estructura interna normalizada:**
```typescript
interface NormalizedWssRoute {
  namespace: string;
  auth?: AuthFn;
  onConnect?: WssHandler;
  onDisconnect?: WssHandler;
  events: Map<string, {
    schema?: Schema;
    rateLimit?: RateLimitCfg;
    guard?: GuardFn;
    handler: WssHandler;
  }>;
}
```

**Archivos a modificar:**
- `modules/router/loader-wss.ts`
- `modules/router/helpers/routes/index.ts` (agregar `extractDefineWssRoute`)

---

#### 3.2 Crear helper `defineWssRoute`
**Archivo:** `modules/realtime/define-wss-route.ts`

**Tareas:**
- [ ] Crear función `defineWssRoute()` que valida y retorna configuración
- [ ] TypeScript types para autocompletado
- [ ] Validación de estructura en runtime (dev mode)
- [ ] Exportar desde `src/index.ts`

**Archivos a crear:**
- `modules/realtime/define-wss-route.ts`
- Actualizar exports en `src/index.ts`

---

### **FASE 4: Validación y Rate Limiting** ⏱️ Prioridad: MEDIA

#### 4.1 Schema Validation Adapter
**Archivo:** `modules/realtime/validation/schema-adapter.ts`

**Tareas:**
- [ ] Crear adapter que soporte Zod y Valibot
- [ ] Detectar tipo de schema automáticamente:
  - Si tiene `.parse()` → Zod-like
  - Si tiene `.safeParse()` → usar safeParse
- [ ] En caso de error:
  - Emitir `__loly:error` con `code: "BAD_PAYLOAD"`
  - No ejecutar handler
  - Log error

**Archivos a crear:**
- `modules/realtime/validation/schema-adapter.ts`
- `modules/realtime/validation/index.ts`

---

#### 4.2 Rate Limiter Global
**Archivo:** `modules/realtime/rate-limit/global-limiter.ts`

**Tareas:**
- [ ] Implementar token bucket algorithm
- [ ] Storage en state store (Redis para cluster, memory para single)
- [ ] Por socket ID o IP (configurable)
- [ ] Config: `eventsPerSecond`, `burst`
- [ ] Si excede: emitir `__loly:error` con `code: "RATE_LIMIT"`
- [ ] Métricas opcionales

**Archivos a crear:**
- `modules/realtime/rate-limit/global-limiter.ts`
- `modules/realtime/rate-limit/token-bucket.ts`
- `modules/realtime/rate-limit/index.ts`

---

#### 4.3 Rate Limiter por Evento
**Archivo:** `modules/realtime/rate-limit/event-limiter.ts`

**Tareas:**
- [ ] Extender global limiter para eventos específicos
- [ ] Usar mismo token bucket pero con key específica: `rate:${socketId}:${eventName}`
- [ ] Config opcional por evento: `{ eventsPerSecond, burst? }`
- [ ] Combinar con global limiter (ambos deben pasar)

**Archivos a modificar:**
- `modules/realtime/rate-limit/event-limiter.ts`

---

### **FASE 5: Autenticación y Guards** ⏱️ Prioridad: MEDIA

#### 5.1 Auth Hook System
**Archivo:** `modules/realtime/auth/index.ts`

**Tareas:**
- [ ] Ejecutar `auth(ctx)` hook antes de `onConnect`
- [ ] Si retorna `null` y hay guard que requiere auth → error + disconnect opcional
- [ ] Guardar `user` en `socket.data.user` y `ctx.user`
- [ ] Soporte para async auth (DB lookups, JWT verification, etc.)

**Archivos a crear:**
- `modules/realtime/auth/index.ts`
- Integrar en `modules/server/wss.ts`

---

#### 5.2 Guard System
**Archivo:** `modules/realtime/guards/index.ts`

**Tareas:**
- [ ] Ejecutar `guard(ctx)` antes de cada evento handler
- [ ] Si retorna `false` → emitir `__loly:error` y no ejecutar handler
- [ ] Guards pueden acceder a `ctx.user`, `ctx.req`, etc.
- [ ] Ejemplos comunes: `({ user }) => !!user`, `({ user }) => user.role === 'admin'`

**Archivos a crear:**
- `modules/realtime/guards/index.ts`
- Integrar en `modules/server/wss.ts`

---

### **FASE 6: Multi-instancia (Redis Adapter)** ⏱️ Prioridad: ALTA

#### 6.1 Socket.IO Redis Adapter
**Archivo:** `modules/realtime/adapter/redis-adapter.ts`

**Tareas:**
- [ ] Instalar `@socket.io/redis-adapter`
- [ ] Crear Redis clients (pub/sub) según config
- [ ] Configurar Socket.IO server con adapter cuando `scale.mode === "cluster"`
- [ ] Validar que adapter existe si mode es cluster (startup error)

**Dependencias:**
```json
{
  "@socket.io/redis-adapter": "^8.2.0",
  "ioredis": "^5.3.2"
}
```

**Archivos a crear:**
- `modules/realtime/adapter/redis-adapter.ts`
- `modules/realtime/adapter/index.ts`
- Integrar en `modules/server/wss.ts`

---

#### 6.2 User-to-Socket Mapping (Presence)
**Archivo:** `modules/realtime/presence/index.ts`

**Tareas:**
- [ ] Mantener mapping en state store:
  - `userSockets:<userId>` = Set de socketIds
  - `socketUser:<socketId>` = userId
- [ ] On connect: si `user` existe → agregar a mapping
- [ ] On disconnect: remover de mapping
- [ ] Implementar `toUser(userId)` usando mapping
- [ ] Opcional: `presence:<namespace>:<room>` = Set de userIds

**Archivos a crear:**
- `modules/realtime/presence/index.ts`
- Integrar hooks en `modules/server/wss.ts`

---

### **FASE 7: WssActions Mejorado** ⏱️ Prioridad: MEDIA

#### 7.1 Extender generateActions
**Archivo:** `modules/server/wss.ts`

**Tareas:**
- [ ] Implementar `reply(event, payload)` → `socket.emit()`
- [ ] Implementar `emit(event, payload)` → `namespace.emit()`
- [ ] Implementar `broadcast(event, payload)` → `socket.broadcast.emit()`
- [ ] Implementar `join(room)` → `socket.join(room)`
- [ ] Implementar `leave(room)` → `socket.leave(room)`
- [ ] Implementar `toRoom(room)` → `namespace.to(room)`
- [ ] Implementar `toUser(userId)` → usar presence mapping
- [ ] Implementar `error(code, message, details)` → emitir `__loly:error`

**Archivos a modificar:**
- `modules/server/wss.ts`

---

### **FASE 8: Logging y Métricas** ⏱️ Prioridad: BAJA

#### 8.1 Logger Mejorado para WSS
**Archivo:** `modules/realtime/logging/index.ts`

**Tareas:**
- [ ] Extender logger existente con contexto WSS:
  - `namespace`
  - `socketId`
  - `userId` (si existe)
  - `eventName`
  - `requestId` (generar UUID por request)
- [ ] Niveles según config: `debug`, `info`, `warn`, `error`
- [ ] Pretty logging en dev

**Archivos a crear:**
- `modules/realtime/logging/index.ts`
- Integrar en `modules/server/wss.ts`

---

#### 8.2 Métricas Opcionales
**Archivo:** `modules/realtime/metrics/index.ts`

**Tareas:**
- [ ] Contadores: conexiones, eventos, errores
- [ ] Latencia de handlers
- [ ] Rate limit hits
- [ ] Exportar a Prometheus o similar (opcional, v2)

**Archivos a crear:**
- `modules/realtime/metrics/index.ts` (opcional para v1)

---

### **FASE 9: Refactor setupWssEvents** ⏱️ Prioridad: ALTA

#### 9.1 Reescritura completa de setupWssEvents
**Archivo:** `modules/server/wss.ts`

**Tareas:**
- [ ] Leer config de realtime
- [ ] Inicializar state store (memory o redis)
- [ ] Configurar Socket.IO server con:
  - Path, transports, pingInterval, pingTimeout, maxPayload
  - CORS según config
  - Redis adapter si cluster
- [ ] Para cada namespace:
  - Crear namespace server
  - Registrar middleware de auth
  - Registrar `onConnect` hook
  - Registrar event handlers con:
    - Schema validation
    - Guard check
    - Rate limiting (global + event)
    - Handler execution
  - Registrar `onDisconnect` hook
  - Cleanup presence mapping

**Flujo de conexión:**
```
1. Client connects → namespace middleware
2. Run auth hook → set ctx.user
3. Run onConnect hook
4. For each event:
   a. Build ctx with data
   b. Validate schema → error if invalid
   c. Check guard → error if fails
   d. Check rate limit (global + event) → error if exceeds
   e. Execute handler
5. On disconnect:
   a. Run onDisconnect hook
   b. Cleanup presence mapping
```

**Archivos a modificar:**
- `modules/server/wss.ts` (reescritura completa)

---

### **FASE 10: Testing y Documentación** ⏱️ Prioridad: MEDIA

#### 10.1 Tests de Aceptación
**Archivo:** `tests/realtime/acceptance.test.ts`

**Tareas:**
- [ ] Test: 2 instancias, broadcast a room funciona (Redis adapter)
- [ ] Test: 2 instancias, counterValue consistente (Redis state store)
- [ ] Test: presence users list consistente en cluster
- [ ] Test: auth hook, user no puede spoofear userId
- [ ] Test: schema invalid → handler NO corre y emite `__loly:error`
- [ ] Test: rate limit bloquea spam
- [ ] Test: logs incluyen namespace + socketId + event + requestId

**Archivos a crear:**
- `tests/realtime/acceptance.test.ts`
- Setup de tests con múltiples instancias

---

#### 10.2 Documentación
**Tareas:**
- [ ] Actualizar README con nueva API
- [ ] Documentar breaking change claramente
- [ ] Guía de migración detallada (legacy → nuevo formato)
- [ ] Ejemplo completo de `defineWssRoute()`
- [ ] Ejemplo de counter con cluster
- [ ] Documentar configuración completa
- [ ] CHANGELOG con breaking changes

**Archivos a modificar:**
- `README.md`
- `docs/06-websockets.md`

---

## 📦 Dependencias Nuevas

```json
{
  "dependencies": {
    "@socket.io/redis-adapter": "^8.2.0",
    "ioredis": "^5.3.2"
  },
  "devDependencies": {
    "@types/ioredis": "^5.0.0"
  }
}
```

**Nota:** `ioredis` puede ser opcional si el usuario no usa cluster mode. Considerar peer dependency o dynamic import.

---

## 🔄 Breaking Changes y Migración

### ⚠️ BREAKING CHANGE: Formato Legacy Removido

**Cambio:**
- ❌ `export const events = []` **YA NO está soportado**
- ✅ Solo se soporta `defineWssRoute()` como formato único

**Razón:**
- Simplifica la implementación y mantenimiento
- Evita complejidad de normalizar dos formatos
- Fuerza uso de la API moderna desde el inicio
- Mejor experiencia de desarrollo con tipos completos

### Guía de Migración

**Antes (Legacy - NO SOPORTADO):**
```typescript
// app/wss/chat/events.ts
export const events = [
  {
    name: "message",
    handler: (ctx: WssContext) => {
      ctx.actions.broadcast("message", ctx.data);
    }
  }
];
```

**Después (Nuevo Formato - REQUERIDO):**
```typescript
// app/wss/chat/events.ts
import { defineWssRoute } from "@lolyjs/core";

export default defineWssRoute({
  events: {
    message: {
      handler: (ctx) => {
        ctx.actions.broadcast("message", ctx.data);
      }
    }
  }
});
```

**Pasos de Migración:**
1. Reemplazar `export const events = []` por `export default defineWssRoute({ ... })`
2. Convertir cada evento del array a objeto en `events: { ... }`
3. Mover `connection` handler a `onConnect` hook
4. Agregar `auth` hook si es necesario
5. Agregar `schema`, `guard`, `rateLimit` según necesidad

### Ejemplo Completo de Migración

**Legacy:**
```typescript
export const events = [
  {
    name: "connection",
    handler: (ctx) => {
      console.log("Connected");
    }
  },
  {
    name: "message",
    handler: (ctx) => {
      ctx.actions.broadcast("message", ctx.data);
    }
  }
];
```

**Nuevo:**
```typescript
import { defineWssRoute } from "@lolyjs/core";
import { z } from "zod";

export default defineWssRoute({
  onConnect: (ctx) => {
    console.log("Connected");
  },
  events: {
    message: {
      schema: z.object({ text: z.string() }),
      handler: (ctx) => {
        ctx.actions.broadcast("message", ctx.data);
      }
    }
  }
});
```

---

## 🎯 Criterios de Aceptación (Checklist Final)

- [ ] 2 instancias: broadcast a room funciona (Redis adapter)
- [ ] 2 instancias: counterValue consistente (Redis state store)
- [ ] presence: users list consistente en cluster
- [ ] auth hook: user no puede spoofear userId
- [ ] schema invalid => handler NO corre y emite `__loly:error`
- [ ] rate limit bloquea spam
- [ ] logs incluyen namespace + socketId + event + requestId
- [ ] Error claro si se usa formato legacy `export const events = []`
- [ ] Config validation en startup
- [ ] TypeScript types completos

---

## 📅 Estimación de Tiempo

| Fase | Estimación | Prioridad |
|------|------------|-----------|
| Fase 1: Config y Tipos | 4-6 horas | ALTA |
| Fase 2: State Store | 8-12 horas | ALTA |
| Fase 3: Route Loader | 6-8 horas | ALTA |
| Fase 4: Validación y Rate Limit | 8-10 horas | MEDIA |
| Fase 5: Auth y Guards | 6-8 horas | MEDIA |
| Fase 6: Multi-instancia | 10-14 horas | ALTA |
| Fase 7: WssActions | 4-6 horas | MEDIA |
| Fase 8: Logging | 4-6 horas | BAJA |
| Fase 9: Refactor setupWssEvents | 12-16 horas | ALTA |
| Fase 10: Testing | 8-12 horas | MEDIA |
| **TOTAL** | **70-98 horas** | |

**Nota:** Estimación para un desarrollador experimentado. Ajustar según equipo.

---

## 🚀 Orden de Implementación Recomendado

1. **Fase 1** → Base sólida (tipos y config)
2. **Fase 2** → State store (necesario para todo lo demás)
3. **Fase 3** → Route loader (para soportar nuevo formato)
4. **Fase 9** → Refactor setupWssEvents (integra todo)
5. **Fase 6** → Multi-instancia (feature clave)
6. **Fase 4** → Validación y rate limit
7. **Fase 5** → Auth y guards
8. **Fase 7** → WssActions mejorado
9. **Fase 8** → Logging (puede hacerse en paralelo)
10. **Fase 10** → Testing y docs

---

## 🔍 Decisiones Técnicas Pendientes

1. **Redis Client:** ¿`ioredis` o `redis` (v4+)? → Recomendación: `ioredis` (más maduro, mejor TypeScript)
2. **Schema Validation:** ¿Solo Zod o también Valibot? → RFC dice ambos, implementar adapter
3. **Rate Limiting Storage:** ¿Siempre Redis en cluster o memory también? → Redis para consistencia
4. **Error Handling:** ¿Disconnect automático en auth fail? → Configurable
5. **Metrics:** ¿Incluir en v1 o v2? → Opcional en v1, requerido en v2

---

## 📝 Notas Adicionales

- Mantener código modular y testeable
- Cada módulo debe tener tests unitarios
- Considerar performance: evitar bloqueos en event loop
- Documentar decisiones de diseño
- Code review antes de merge a main

---

**Última actualización:** 2024-12-19
**Versión del plan:** 1.0
