# Documentación Técnica de Loly Framework

Bienvenido a la documentación técnica completa de Loly Framework. Esta documentación está organizada por conceptos para facilitar la referencia.

## 📚 Índice de Documentación

### Fundamentos

1. **[Introducción](./01-introduccion.md)**
   - ¿Qué es Loly?
   - Características principales
   - Estructura de proyecto
   - Inicio rápido

2. **[Arquitectura](./02-arquitectura.md)**
   - Componentes principales
   - Flujo de una request
   - Estructura de datos
   - Modos de renderizado

### Routing y Páginas

3. **[Routing](./03-routing.md)**
   - File-based routing
   - Rutas estáticas y dinámicas
   - Layouts
   - Parámetros de ruta
   - Navegación
   - URL Rewrites (multitenancy)

4. **[Server Loaders](./04-server-loaders.md)**
   - Data fetching en el servidor
   - Props y metadata
   - Redirecciones
   - Modos de renderizado
   - Generación de rutas estáticas

### APIs y Comunicación

5. **[API Routes](./05-api-routes.md)**
   - Crear endpoints REST
   - Métodos HTTP
   - Validación
   - Middleware

6. **[WebSockets](./06-websockets.md)**
   - Socket.IO integration
   - Event handlers
   - Cliente React
   - Ejemplos completos

### Rendering y Optimización

7. **[Rendering](./07-rendering.md)**
   - SSR (Server-Side Rendering)
   - SSG (Static Site Generation)
   - CSR (Client-Side Rendering)
   - Streaming
   - Hydratación
   - Code splitting

8. **[Build System](./11-build.md)**
   - Proceso de build
   - Code splitting
   - Optimizaciones
   - Troubleshooting

### Middleware y Utilidades

9. **[Middleware](./08-middleware.md)**
   - Route middleware
   - API middleware
   - Orden de ejecución
   - Ejemplos

10. **[Validación](./09-validation.md)**
    - Validación con Zod
    - Schemas reutilizables
    - Validación en loaders y APIs
    - Manejo de errores

11. **[Cache](./10-cache.md)**
    - withCache helper
    - Client-side revalidation
    - Estrategias de cache

### React y Componentes

12. **[Hooks](./13-hooks.md)**
    - useBroadcastChannel
    - Hooks personalizados

13. **[Components](./14-components.md)**
    - Link component
    - Image component
    - Ejemplos

14. **[Image Optimization](./17-image-optimization.md)**
    - Optimización automática
    - Imágenes remotas
    - Configuración
    - Mejores prácticas

### Configuración y Seguridad

15. **[Configuración](./12-configuracion.md)**
    - loly.config.ts
    - ServerConfig
    - Variables de entorno
    - Path aliases

16. **[Seguridad](./15-seguridad.md)**
    - Sanitización
    - Rate limiting
    - Helmet (security headers)
    - CORS
    - Autenticación

17. **[Logging](./16-logging.md)**
    - Sistema de logging
    - Logger por módulo
    - Logger por request
    - Mejores prácticas

## 🚀 Inicio Rápido

Si eres nuevo en Loly Framework, te recomendamos seguir este orden:

1. [Introducción](./01-introduccion.md) - Entender qué es Loly
2. [Routing](./03-routing.md) - Aprender el sistema de routing
3. [Server Loaders](./04-server-loaders.md) - Data fetching
4. [Rendering](./07-rendering.md) - Entender SSR/SSG
5. [API Routes](./05-api-routes.md) - Crear APIs
6. [Configuración](./12-configuracion.md) - Configurar tu proyecto

## 📖 Guías por Caso de Uso

### Crear una Página Simple
1. [Routing](./03-routing.md) - Crear `app/page.tsx`
2. [Server Loaders](./04-server-loaders.md) - Agregar data fetching

### Crear una API
1. [API Routes](./05-api-routes.md) - Crear `app/api/route.ts`
2. [Validación](./09-validation.md) - Validar inputs
3. [Middleware](./08-middleware.md) - Agregar autenticación

### Chat en Tiempo Real
1. [WebSockets](./06-websockets.md) - Crear namespace
2. [Components](./14-components.md) - UI con React

### Optimizar Rendimiento
1. [Rendering](./07-rendering.md) - Elegir SSR/SSG
2. [Cache](./10-cache.md) - Cachear operaciones costosas
3. [Build System](./11-build.md) - Optimizaciones de build

## 🔍 Búsqueda Rápida

### Conceptos Comunes

- **Routing**: [03-routing.md](./03-routing.md)
- **Data Fetching**: [04-server-loaders.md](./04-server-loaders.md)
- **API**: [05-api-routes.md](./05-api-routes.md)
- **WebSockets**: [06-websockets.md](./06-websockets.md)
- **SSR/SSG**: [07-rendering.md](./07-rendering.md)
- **Validación**: [09-validation.md](./09-validation.md)
- **Configuración**: [12-configuracion.md](./12-configuracion.md)

### Problemas Comunes

- **Build falla**: [11-build.md](./11-build.md#troubleshooting)
- **Rutas no funcionan**: [03-routing.md](./03-routing.md)
- **Datos no cargan**: [04-server-loaders.md](./04-server-loaders.md)
- **Errores de validación**: [09-validation.md](./09-validation.md)

## 📝 Notas

- Esta documentación está basada en el código fuente del framework
- Los ejemplos están probados y funcionan
- La documentación se actualiza con el framework
- Para preguntas específicas, revisa el código fuente en `packages/loly-core/`

## 🎯 Próximos Pasos

1. Lee la [Introducción](./01-introduccion.md)
2. Revisa la [Arquitectura](./02-arquitectura.md)
3. Crea tu primera página siguiendo [Routing](./03-routing.md)
4. Agrega data fetching con [Server Loaders](./04-server-loaders.md)

¡Buena suerte construyendo con Loly Framework! 🚀
