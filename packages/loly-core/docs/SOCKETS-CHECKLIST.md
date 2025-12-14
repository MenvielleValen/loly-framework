# ✅ Checklist: Sockets para Producción

## 🎯 Quick Reference

### Fase 1: Configuración y Tipos Base
- [ ] Extender `ServerConfig` con `realtime: RealtimeConfig`
- [ ] Crear `modules/realtime/types.ts` con todas las interfaces
- [ ] Validaciones de config en startup

### Fase 2: State Store
- [ ] `modules/realtime/state/memory-store.ts` - Implementación completa
- [ ] `modules/realtime/state/redis-store.ts` - Implementación completa
- [ ] Factory en `modules/realtime/state/index.ts`

### Fase 3: Route Loader
- [ ] Requerir `defineWssRoute()` (solo formato soportado)
- [ ] Error claro si se usa formato legacy
- [ ] Crear `modules/realtime/define-wss-route.ts`

### Fase 4: Validación y Rate Limiting
- [ ] Schema adapter (Zod/Valibot)
- [ ] Global rate limiter (token bucket)
- [ ] Per-event rate limiter

### Fase 5: Auth y Guards
- [ ] Auth hook system
- [ ] Guard system
- [ ] Integración en setupWssEvents

### Fase 6: Multi-instancia
- [ ] Redis adapter para Socket.IO
- [ ] User-to-socket mapping (presence)
- [ ] `toUser()` implementation

### Fase 7: WssActions
- [ ] `reply()`, `toRoom()`, `toUser()`, `error()`
- [ ] Rooms API completa

### Fase 8: Logging
- [ ] Logger con contexto WSS
- [ ] Request ID tracking

### Fase 9: Refactor setupWssEvents
- [ ] Integrar todo en `modules/server/wss.ts`
- [ ] Flujo completo: auth → validation → guard → rate limit → handler

### Fase 10: Testing
- [ ] Tests de aceptación (checklist RFC)
- [ ] Documentación actualizada

---

## 🧪 Acceptance Tests

- [ ] **Test 1:** 2 instancias, broadcast a room funciona
- [ ] **Test 2:** 2 instancias, counterValue consistente (Redis)
- [ ] **Test 3:** Presence users list consistente en cluster
- [ ] **Test 4:** Auth hook previene spoofing
- [ ] **Test 5:** Schema invalid → `__loly:error`, handler NO corre
- [ ] **Test 6:** Rate limit bloquea spam
- [ ] **Test 7:** Logs incluyen namespace + socketId + event + requestId

---

## 📦 Dependencies

```bash
pnpm add @socket.io/redis-adapter ioredis
pnpm add -D @types/ioredis
```

---

## ⚠️ Breaking Changes

- [ ] **BREAKING:** `export const events = []` NO soportado
- [ ] Solo `defineWssRoute()` es válido
- [ ] Error claro en dev si se usa formato legacy
- [ ] Guía de migración documentada
- [ ] CHANGELOG actualizado

---

## 📝 Archivos Clave a Crear/Modificar

### Nuevos
- `modules/realtime/types.ts`
- `modules/realtime/state/memory-store.ts`
- `modules/realtime/state/redis-store.ts`
- `modules/realtime/state/index.ts`
- `modules/realtime/define-wss-route.ts`
- `modules/realtime/validation/schema-adapter.ts`
- `modules/realtime/rate-limit/global-limiter.ts`
- `modules/realtime/rate-limit/event-limiter.ts`
- `modules/realtime/rate-limit/token-bucket.ts`
- `modules/realtime/auth/index.ts`
- `modules/realtime/guards/index.ts`
- `modules/realtime/adapter/redis-adapter.ts`
- `modules/realtime/presence/index.ts`
- `modules/realtime/logging/index.ts`

### Modificar
- `modules/server/config.ts` - Agregar RealtimeConfig
- `modules/server/wss.ts` - Refactor completo
- `modules/router/loader-wss.ts` - Soporte defineWssRoute
- `modules/router/index.types.ts` - Extender interfaces
- `modules/router/helpers/routes/index.ts` - Nuevos extractors
- `src/index.ts` - Exportar defineWssRoute
- `package.json` - Dependencias

---

## 🚀 Orden de Implementación

1. Fase 1 (Config y Tipos)
2. Fase 2 (State Store)
3. Fase 3 (Route Loader)
4. Fase 9 (Refactor setupWssEvents) - Integra todo
5. Fase 6 (Multi-instancia)
6. Fase 4 (Validación y Rate Limit)
7. Fase 5 (Auth y Guards)
8. Fase 7 (WssActions)
9. Fase 8 (Logging)
10. Fase 10 (Testing)

---

**Última actualización:** 2024-12-19
