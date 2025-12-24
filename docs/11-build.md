# Build System

El sistema de build de Loly Framework compila tu aplicación para producción, optimizando el código y generando assets estáticos.

## Comandos de Build

### Build de Producción

```bash
loly build
# o
pnpm build
```

Esto:
1. Compila el código del servidor
2. Bundlea el código del cliente
3. Genera páginas estáticas (SSG)
4. Crea manifestos de rutas
5. Optimiza assets

### Desarrollo

```bash
loly dev
# o
pnpm dev
```

Inicia el servidor de desarrollo con:
- Hot Module Replacement (HMR)
- Recarga automática de rutas
- Source maps
- Logging detallado

## Proceso de Build

### 1. Carga de Rutas

El framework escanea `app/` y carga:
- Páginas (`page.tsx`)
- API routes (`route.ts`)
- WebSocket routes (`events.ts`)
- Layouts
- Middlewares
- Loaders

### 2. Build del Servidor

Compila el código del servidor usando esbuild:
- Bundling de módulos ESM (ES Modules)
- Tree shaking
- Minificación
- Output en `.loly/server/` como archivos `.mjs` (ESM)
- Path aliases resueltos correctamente
- Archivos estáticos (JSON, txt, etc.) copiados automáticamente manteniendo estructura

### 3. Build del Cliente

Bundlea el código del cliente usando Rspack:
- Code splitting automático
- Optimización de imports
- Minificación
- Output en `.loly/client/`

### 4. Generación de SSG

Para páginas con `force-static`:
- Ejecuta `generateStaticParams` si existe
- Ejecuta `getServerSideProps` para cada ruta
- Genera HTML estático
- Output en `.loly/ssg/`

### 5. Generación de Manifestos

Crea manifestos JSON:
- `routes-manifest.json`: Rutas y patrones
- `client-routes-manifest.json`: Rutas para el cliente
- `asset-manifest.json`: Assets con hashes

## Estructura de Output

```
.loly/
├── server/              # Código del servidor compilado (ESM .mjs)
│   ├── app/
│   ├── lib/             # Archivos estáticos copiados (JSON, etc.)
│   └── routes-manifest.json
├── client/              # Código del cliente
│   ├── client.js
│   ├── client.css
│   └── chunks/
│       ├── chunk-abc123.js
│       └── chunk-def456.js
├── ssg/                 # Páginas estáticas
│   ├── index.html
│   └── blog/
│       └── [slug]/
└── asset-manifest.json
```

**Nota:** El código del servidor se compila como módulos ESM (`.mjs`), lo que permite usar características modernas como top-level await, dynamic imports, y `import.meta.url`.

## Configuración de Build

### loly.config.ts

The framework uses native ESM by default. Server files are compiled as ESM modules (`.mjs`).

## Code Splitting

### Automático

El framework divide automáticamente:
- **Client bundle**: Código compartido
- **Route chunks**: Código por ruta
- **Error chunk**: Código de error page

### Lazy Loading

Los chunks se cargan bajo demanda:

```html
<link rel="modulepreload" href="/static/chunk-route.js" as="script">
```

## Optimizaciones

### Minificación

- JavaScript minificado
- CSS minificado
- HTML optimizado

### Tree Shaking

Elimina código no usado:
- Imports no utilizados
- Funciones no llamadas
- Módulos completos no importados

### Asset Hashing

Los assets incluyen hashes para cache busting:

```
client.js → client-abc123.js
chunk-route.js → chunk-route-def456.js
```

## Variables de Entorno

### Build Time

```env
LOLY_BUILD=1
NODE_ENV=production
```

### Runtime

```env
PORT=3000
HOST=0.0.0.0
PUBLIC_WS_BASE_URL=http://localhost:3000
```

## Hot Module Replacement (HMR)

En desarrollo:
- Recarga automática de componentes
- Preserva estado cuando es posible
- Recarga de rutas cuando cambian archivos

## Source Maps

En desarrollo, se generan source maps para debugging.

En producción, se pueden habilitar con configuración.

## Troubleshooting

### Build Falla

1. Verifica errores de TypeScript
2. Revisa imports circulares
3. Verifica dependencias faltantes

### Bundle Muy Grande

1. Revisa imports innecesarios
2. Usa code splitting
3. Optimiza dependencias

### SSG No Genera Páginas

1. Verifica que `dynamic = "force-static"`
2. Verifica que `generateStaticParams` retorna datos
3. Revisa errores en loaders

## Próximos Pasos

- [Configuración](./12-configuracion.md) - Configuración completa
- [Rendering](./07-rendering.md) - SSG y optimizaciones
