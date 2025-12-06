# Introducción a Loly Framework

## ¿Qué es Loly?

Loly es un framework full-stack para React que combina las mejores características de frameworks modernos como Next.js y Remix, con un enfoque en simplicidad, rendimiento y experiencia de desarrollador.

## Características Principales

### 🚀 Rendering Híbrido
- **SSR (Server-Side Rendering)**: Renderizado en el servidor con streaming para datos dinámicos
- **SSG (Static Site Generation)**: Generación estática de páginas en build time para máximo rendimiento
- **CSR (Client-Side Rendering)**: Renderizado en el cliente para aplicaciones interactivas
- **Streaming**: Envío progresivo de contenido para mejor Time to First Byte (TTFB)

### 📁 File-Based Routing
Sistema de routing basado en archivos con características avanzadas:
- Archivos `page.tsx` definen rutas
- Archivos `layout.tsx` definen layouts anidados
- Soporte para rutas dinámicas con `[param]` y catch-all con `[...slug]`
- **Middlewares en rutas**: Define `beforeServerData` en `server.hook.ts` para ejecutar lógica antes de los loaders
- **Separación de concerns**: Loaders y middlewares en `server.hook.ts` separados de los componentes

### 🔌 API Routes
Rutas API integradas en el mismo sistema de archivos con middlewares flexibles:
- Archivos `route.ts` en `app/api/` crean endpoints REST
- Soporte para métodos HTTP: GET, POST, PUT, PATCH, DELETE, OPTIONS
- **Middlewares globales**: `beforeApi` para todos los métodos
- **Middlewares por método**: `beforeGET`, `beforePOST`, etc. para lógica específica
- Validación integrada con Zod

### 🔌 WebSockets (WSS) - Exclusivo de Loly
Soporte nativo y completo para WebSockets usando Socket.IO, una característica que diferencia a Loly de otros frameworks:
- **Rutas personalizables**: Archivos `events.ts` en `app/wss/` crean namespaces automáticamente
- **Sistema de routing integrado**: Los WebSockets siguen el mismo patrón de routing que las páginas y APIs
- Cliente React helper `lolySocket()` para conexiones simples
- Gestión automática de conexiones y desconexiones
- **Event handlers declarativos**: Define eventos en un array con estructura clara
- **Helpers de broadcasting**: `emit`, `broadcast`, `emitTo`, `emitToClient` incluidos en el contexto

### 🛡️ Seguridad Integrada
- Sanitización automática de parámetros y queries
- Rate limiting configurable
- Helmet para headers de seguridad
- CSP (Content Security Policy) con nonces

### ✅ Validación con Zod
Validación de datos integrada usando Zod:
- Validación de parámetros de ruta
- Validación de queries y body
- Schemas reutilizables

### 📦 Build System
- Bundling con Rspack (rápido y compatible con Webpack)
- Code splitting automático
- Optimización de assets
- Hot Module Replacement en desarrollo

### 🎨 Temas
Soporte para temas (dark/light mode) con persistencia

### 📝 Logging
Sistema de logging estructurado con Pino:
- Logs por request con IDs únicos
- Logs por módulo
- Formato JSON en producción, pretty en desarrollo

## Estructura de un Proyecto

```
mi-proyecto/
├── app/                    # Directorio de la aplicación
│   ├── page.tsx           # Página raíz (/)
│   ├── layout.tsx         # Layout raíz
│   ├── _not-found.tsx    # Página 404
│   ├── _error.tsx         # Página de error
│   ├── api/               # API Routes
│   │   └── users/
│   │       └── route.ts
│   ├── wss/               # WebSocket namespaces
│   │   └── chat/
│   │       └── events.ts
│   └── blog/
│       ├── layout.tsx
│       ├── page.tsx       # /blog
│       └── [slug]/
│           └── page.tsx  # /blog/[slug]
├── components/            # Componentes React
├── lib/                   # Utilidades y helpers
├── public/                # Archivos estáticos
├── loly.config.ts         # Configuración del framework
├── init.server.ts         # Inicialización de servicios (DB, etc.)
└── package.json
```

## Instalación

```bash
npm install @lolyjs/core react react-dom
# o
pnpm add @lolyjs/core react react-dom
```

## Inicio Rápido

### 1. Crear una página

```tsx
// app/page.tsx
export default function HomePage() {
  return <h1>¡Hola desde Loly!</h1>;
}
```

### 2. Crear un server loader

```tsx
// app/page.tsx
import type { ServerLoader } from "@lolyjs/core";

export const getServerSideProps: ServerLoader = async (ctx) => {
  return {
    props: {
      message: "Datos del servidor",
    },
  };
};

export default function HomePage() {
  const { props } = usePageProps();
  return <h1>{props.message}</h1>;
}
```

### 3. Iniciar el servidor

```tsx
// server.ts o index.ts
import { startDevServer } from "@lolyjs/core";

startDevServer({
  port: 3000,
});
```

## Conceptos Clave

### Server Loaders
Funciones que se ejecutan en el servidor antes de renderizar una página. **Diferencia clave**: Se definen en `server.hook.ts` separado del componente, permitiendo mejor organización. Permiten:
- Fetch de datos
- Acceso a bases de datos
- Redirecciones
- Configuración de metadata

### Middlewares en Rutas
**Característica única**: Puedes definir middlewares directamente en tus rutas:
- **Páginas**: `beforeServerData` en `server.hook.ts` se ejecuta antes del loader
- **APIs**: `beforeApi` para todos los métodos, `beforeGET`, `beforePOST`, etc. para métodos específicos
- Permite autenticación, logging, transformación de requests a nivel de ruta

### Middleware
Funciones que se ejecutan antes de los loaders o handlers:
- Autenticación
- Logging
- Transformación de requests
- Validación

### Dynamic Routes
Rutas con parámetros dinámicos:
- `[id]` - Parámetro único
- `[...slug]` - Catch-all
- `[[...slug]]` - Optional catch-all

### Layouts
Componentes que envuelven páginas:
- Se pueden anidar
- Comparten estado y props
- Útiles para navegación, headers, footers

## ¿Qué hace diferente a Loly?

Loly Framework comparte similitudes con frameworks modernos como Next.js, pero incluye características únicas que lo distinguen:

### 🎯 Middlewares en Rutas
A diferencia de otros frameworks, Loly permite definir middlewares directamente en tus rutas:
- **Páginas**: `beforeServerData` en `server.hook.ts` se ejecuta antes de los loaders
- **APIs**: `beforeApi` para todos los métodos, `beforeGET`, `beforePOST`, etc. para métodos específicos
- Control granular sobre autenticación, logging y transformación de requests a nivel de ruta

### 🔌 WebSockets Nativos
Soporte completo y nativo para WebSockets integrado en el sistema de routing:
- Define namespaces automáticamente basándose en la estructura de archivos
- Mismo patrón de routing que páginas y APIs
- Helpers de broadcasting incluidos (`emit`, `broadcast`, `emitTo`, `emitToClient`)
- Sin configuración manual adicional

### 📁 Separación de Concerns
Los server loaders y middlewares se definen en `server.hook.ts` separado de los componentes:
- Mejor organización del código
- Facilita testing
- Separación clara entre lógica del servidor y componentes React

### 🛡️ Seguridad Integrada
Características de seguridad listas para usar:
- Sanitización automática de parámetros
- Rate limiting configurable por ruta
- Helmet para headers de seguridad
- Validación con Zod integrada

## Próximos Pasos

- [Routing](./02-routing.md) - Sistema de routing completo
- [Server Loaders](./04-server-loaders.md) - Data fetching en el servidor
- [API Routes](./05-api-routes.md) - Crear endpoints REST
- [WebSockets](./06-websockets.md) - Comunicación en tiempo real
- [Rendering](./07-rendering.md) - SSR, SSG y optimizaciones
