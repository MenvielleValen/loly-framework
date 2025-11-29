# Space Explorer 🚀

Una aplicación completa que explora el universo utilizando datos reales de APIs públicas de NASA y SpaceX. Esta app está diseñada para llevar al límite todas las capacidades del framework Loly.

## Características

### 🎯 Funcionalidades Principales

- **Planetas del Sistema Solar** - Explora los 8 planetas con información detallada (SSG)
- **Lanzamientos de SpaceX** - Últimos lanzamientos en tiempo real (SSR)
- **Astronautas** - Perfiles de los héroes del espacio (SSG)
- **APOD (Astronomy Picture of the Day)** - Imagen del día de NASA (SSR)
- **Búsqueda** - API de búsqueda con validación Zod
- **Favoritos** - Sistema de favoritos con rate limiting

### 🛠️ Tecnologías del Framework Utilizadas

#### Routing
- ✅ File-based routing
- ✅ Rutas dinámicas (`[id]`, `[slug]`)
- ✅ Nested layouts
- ✅ Client-side navigation

#### Rendering
- ✅ **SSG (Static Site Generation)** - Planetas y astronautas
- ✅ **SSR (Server-Side Rendering)** - Lanzamientos y APOD
- ✅ Server hooks (`server.hook.ts`)
- ✅ Metadata dinámica para SEO

#### API Routes
- ✅ RESTful API endpoints
- ✅ Validación con Zod
- ✅ Rate limiting (strict y normal)
- ✅ Middleware personalizado

#### Seguridad
- ✅ Rate limiting configurado
- ✅ Validación de inputs
- ✅ Sanitización automática
- ✅ CORS configurado

#### Developer Experience
- ✅ TypeScript completo
- ✅ Logging estructurado
- ✅ Error handling personalizado
- ✅ Páginas 404 y error customizadas
- ✅ Theme support (dark/light mode)

## Estructura del Proyecto

```
space-explorer/
├── app/
│   ├── layout.tsx              # Layout principal
│   ├── page.tsx                 # Página de inicio (SSR)
│   ├── server.hook.ts          # Server hook para home
│   ├── _error.tsx              # Página de error
│   ├── _not-found.tsx          # Página 404
│   ├── planets/
│   │   ├── page.tsx            # Lista de planetas (SSG)
│   │   ├── server.hook.ts      # Server hook con generateStaticParams
│   │   └── [id]/
│   │       ├── page.tsx        # Detalle de planeta (SSG)
│   │       └── server.hook.ts  # Server hook con SSG
│   ├── launches/
│   │   ├── page.tsx            # Lista de lanzamientos (SSR)
│   │   ├── server.hook.ts      # Server hook con SSR
│   │   └── [id]/
│   │       ├── page.tsx        # Detalle de lanzamiento (SSR)
│   │       └── server.hook.ts  # Server hook con SSR
│   ├── astronauts/
│   │   ├── page.tsx            # Lista de astronautas (SSG)
│   │   ├── server.hook.ts      # Server hook con SSG
│   │   └── [id]/
│   │       ├── page.tsx        # Perfil de astronauta (SSG)
│   │       └── server.hook.ts  # Server hook con SSG
│   ├── apod/
│   │   ├── page.tsx            # Astronomy Picture of the Day (SSR)
│   │   └── server.hook.ts      # Server hook con SSR
│   └── api/
│       ├── search/
│       │   └── route.ts        # API de búsqueda con validación
│       ├── favorites/
│       │   └── route.ts         # API de favoritos con rate limiting
│       └── launches/
│           ├── route.ts        # API de lanzamientos
│           └── [id]/
│               └── route.ts    # API de lanzamiento individual
├── components/
│   ├── ui/                      # Componentes UI reutilizables
│   └── shared/                  # Componentes compartidos
├── lib/
│   ├── space-api.ts            # Cliente de APIs (NASA, SpaceX)
│   └── utils.ts                 # Utilidades
├── middlewares/
│   └── logger.ts                # Middleware de logging
├── loly.config.ts               # Configuración del framework
└── package.json
```

## APIs Utilizadas

### NASA API
- **APOD (Astronomy Picture of the Day)**: `https://api.nasa.gov/planetary/apod`
- API Key: `DEMO_KEY` (pública para desarrollo)

### SpaceX API
- **Launches**: `https://api.spacexdata.com/v4/launches`
- API pública sin autenticación

## Instalación

```bash
# Instalar dependencias
npm install

# Desarrollo
npm run dev

# Build para producción
npm run build

# Iniciar servidor de producción
npm start
```

## Ejemplos de Uso

### SSG (Static Site Generation)

Los planetas y astronautas usan SSG para máximo rendimiento:

```typescript
// app/planets/server.hook.ts
export const dynamic = "force-static" as const;

export const generateStaticParams: GenerateStaticParams = async () => {
  const planets = getAllPlanets();
  return planets.map((planet) => ({ id: planet.id }));
};
```

### SSR (Server-Side Rendering)

Los lanzamientos y APOD usan SSR para datos dinámicos:

```typescript
// app/launches/server.hook.ts
export const dynamic = "force-dynamic" as const;

export const getServerSideProps: ServerLoader = async () => {
  const launches = await getSpaceXLaunches(20);
  return { props: { launches } };
};
```

### API Routes con Validación

```typescript
// app/api/search/route.ts
const searchSchema = z.object({
  query: z.string().min(1).max(100),
  type: z.enum(["all", "planets", "astronauts", "launches"]).optional(),
});

export async function POST(ctx: ApiContext) {
  const body = validate(searchSchema, ctx.req.body);
  // ...
}
```

### Rate Limiting

```typescript
// app/api/favorites/route.ts
export const beforeApi: ApiMiddleware[] = [strictRateLimiter];
```

## Rutas Disponibles

### Páginas
- `/` - Página de inicio con APOD y lanzamientos recientes
- `/planets` - Lista de planetas (SSG)
- `/planets/[id]` - Detalle de planeta (SSG)
- `/launches` - Lista de lanzamientos (SSR)
- `/launches/[id]` - Detalle de lanzamiento (SSR)
- `/astronauts` - Lista de astronautas (SSG)
- `/astronauts/[id]` - Perfil de astronauta (SSG)
- `/apod` - Astronomy Picture of the Day (SSR)

### API Endpoints
- `GET/POST /api/search` - Búsqueda con validación
- `GET/POST/DELETE /api/favorites` - Sistema de favoritos
- `GET /api/launches` - Lista de lanzamientos
- `GET /api/launches/[id]` - Lanzamiento individual

## Características Avanzadas

### Metadata Dinámica
Cada página incluye metadata personalizada para SEO:

```typescript
metadata: {
  title: "Planetas | Space Explorer",
  description: "Explora los 8 planetas del sistema solar",
  metaTags: [
    { property: "og:title", content: "..." },
    { property: "og:description", content: "..." },
  ],
}
```

### Error Handling
- Página de error personalizada (`_error.tsx`)
- Página 404 personalizada (`_not-found.tsx`)
- Manejo de errores en API routes

### Theme Support
- Dark/Light mode con `ThemeProvider`
- Persistencia en localStorage
- Switch de tema en el header

## Próximas Mejoras

- [ ] Agregar más APIs espaciales (ISS, Mars Rover, etc.)
- [ ] Implementar autenticación real
- [ ] Base de datos para favoritos
- [ ] Caché de respuestas API
- [ ] Tests unitarios y E2E
- [ ] PWA support
- [ ] Internacionalización (i18n)

## Contribuir

Este proyecto es un ejemplo completo de las capacidades del framework Loly. Siéntete libre de usarlo como base para tus propios proyectos.

## Licencia

ISC

