# Space Explorer 🚀

A comprehensive example application that explores the universe using real data from public NASA and SpaceX APIs. This app is designed to showcase all the capabilities of the **Loly Framework**, demonstrating best practices for building modern web applications.

## Overview

Space Explorer is a full-featured web application that serves as a reference implementation for the Loly Framework. It demonstrates various rendering strategies, API patterns, security features, and developer experience improvements that Loly provides out of the box.

## Features

### 🎯 Core Functionality

- **Solar System Planets** - Explore all 8 planets with detailed information (SSG)
- **SpaceX Launches** - Real-time latest launches (SSR)
- **Astronauts** - Profiles of space heroes (SSG)
- **APOD (Astronomy Picture of the Day)** - NASA's daily space image (SSR)
- **Search API** - Full-text search with Zod validation
- **Favorites System** - User favorites with rate limiting

### 🛠️ Framework Capabilities Demonstrated

#### Routing System
- ✅ **File-based routing** - Intuitive route organization
- ✅ **Dynamic routes** - Parameterized routes (`[id]`, `[slug]`)
- ✅ **Nested layouts** - Hierarchical layout composition
- ✅ **Client-side navigation** - Fast, seamless page transitions

#### Rendering Strategies
- ✅ **SSG (Static Site Generation)** - Pre-rendered pages for planets and astronauts
- ✅ **SSR (Server-Side Rendering)** - Dynamic rendering for launches and APOD
- ✅ **Server hooks** - `server.hook.ts` for data fetching
- ✅ **Dynamic metadata** - SEO-optimized meta tags per page
- ✅ **Static params generation** - Automatic static page generation

#### API Routes
- ✅ **RESTful endpoints** - Standard HTTP methods (GET, POST, DELETE)
- ✅ **Zod validation** - Type-safe request validation
- ✅ **Rate limiting** - Configurable strict and normal rate limits
- ✅ **Custom middleware** - Request logging and processing
- ✅ **Error handling** - Structured error responses

#### Security Features
- ✅ **Rate limiting** - Per-route and global rate limiting
- ✅ **Input validation** - Automatic request validation
- ✅ **Input sanitization** - Built-in XSS protection
- ✅ **CORS configuration** - Environment-based CORS settings

#### Developer Experience
- ✅ **Full TypeScript** - End-to-end type safety
- ✅ **Structured logging** - Request/response logging
- ✅ **Custom error pages** - `_error.tsx` and `_not-found.tsx`
- ✅ **Theme support** - Dark/light mode with persistence
- ✅ **Hot reload** - Fast development iteration

## Project Structure

```
space-explorer/
├── app/                          # Application routes
│   ├── layout.tsx                # Root layout component
│   ├── page.tsx                  # Home page (SSR)
│   ├── server.hook.ts            # Server hook for home page
│   ├── _error.tsx                # Custom error page
│   ├── _not-found.tsx            # Custom 404 page
│   ├── planets/                  # Planets section
│   │   ├── page.tsx              # Planets list (SSG)
│   │   ├── server.hook.ts        # SSG with generateStaticParams
│   │   └── [id]/                 # Dynamic planet route
│   │       ├── page.tsx          # Planet detail (SSG)
│   │       └── server.hook.ts    # SSG configuration
│   ├── launches/                 # Launches section
│   │   ├── page.tsx              # Launches list (SSR)
│   │   ├── server.hook.ts        # SSR configuration
│   │   └── [id]/                 # Dynamic launch route
│   │       ├── page.tsx          # Launch detail (SSR)
│   │       └── server.hook.ts    # SSR configuration
│   ├── astronauts/               # Astronauts section
│   │   ├── page.tsx              # Astronauts list (SSG)
│   │   ├── server.hook.ts        # SSG configuration
│   │   └── [id]/                 # Dynamic astronaut route
│   │       ├── page.tsx          # Astronaut profile (SSG)
│   │       └── server.hook.ts    # SSG configuration
│   ├── apod/                     # APOD section
│   │   ├── page.tsx              # Astronomy Picture of the Day (SSR)
│   │   └── server.hook.ts        # SSR configuration
│   └── api/                      # API routes
│       ├── search/
│       │   └── route.ts          # Search API with validation
│       ├── favorites/
│       │   └── route.ts          # Favorites API with rate limiting
│       └── launches/
│           ├── route.ts          # Launches API endpoint
│           └── [id]/
│               └── route.ts     # Individual launch API
├── components/                   # React components
│   ├── ui/                       # Reusable UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── switch.tsx
│   └── shared/                   # Shared components
│       ├── theme-switch.tsx
│       └── test-router.tsx
├── lib/                          # Utility libraries
│   ├── space-api.ts              # NASA & SpaceX API clients
│   └── utils.ts                  # Helper functions
├── middlewares/                  # Custom middlewares
│   └── logger.ts                 # Request logging middleware
├── loly.config.ts                # Framework configuration
├── package.json
└── tsconfig.json
```

## APIs Used

### NASA API
- **APOD (Astronomy Picture of the Day)**: `https://api.nasa.gov/planetary/apod`
- **API Key**: `DEMO_KEY` (public key for development)
- **Documentation**: https://api.nasa.gov/

### SpaceX API
- **Launches**: `https://api.spacexdata.com/v4/launches`
- **Public API** - No authentication required
- **Documentation**: https://docs.spacexdata.com/

## Installation

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Production build
npm run build

# Start production server
npm start
```

## Usage Examples

### SSG (Static Site Generation)

Planets and astronauts use SSG for maximum performance and SEO:

```typescript
// app/planets/server.hook.ts
import type { ServerLoader, GenerateStaticParams } from "@lolyjs/core";
import { getAllPlanets } from "@/lib/space-api";

// Enable static generation
export const dynamic = "force-static" as const;

// Generate static params for all planets at build time
export const generateStaticParams: GenerateStaticParams = async () => {
  const planets = getAllPlanets();
  return planets.map((planet) => ({ id: planet.id }));
};

export const getServerSideProps: ServerLoader = async () => {
  const planets = getAllPlanets();
  
  return {
    props: { planets },
    metadata: {
      title: "Planets | Space Explorer",
      description: "Explore the 8 planets of the solar system with detailed information.",
    },
  };
};
```

### SSR (Server-Side Rendering)

Launches and APOD use SSR for dynamic, real-time data:

```typescript
// app/launches/server.hook.ts
import type { ServerLoader } from "@lolyjs/core";
import { getSpaceXLaunches } from "@/lib/space-api";

// Enable server-side rendering
export const dynamic = "force-dynamic" as const;

export const getServerSideProps: ServerLoader = async () => {
  const launches = await getSpaceXLaunches(20);
  
  return {
    props: { launches },
    metadata: {
      title: "Launches | Space Explorer",
      description: "Explore the most recent SpaceX launches with real-time data.",
    },
  };
};
```

### API Routes with Validation

```typescript
// app/api/search/route.ts
import type { ApiContext } from "@lolyjs/core";
import { z } from "zod";
import { validate } from "@lolyjs/core";

const searchSchema = z.object({
  query: z.string().min(1).max(100),
  type: z.enum(["all", "planets", "astronauts", "launches"]).optional(),
});

export async function POST(ctx: ApiContext) {
  try {
    const body = validate(searchSchema, ctx.req.body);
    const { query, type = "all" } = body;
    
    // Search logic...
    
    return ctx.Response({
      query,
      type,
      results: { /* ... */ },
      total: 0,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ValidationError") {
      return ctx.Response(
        { error: "Validation failed", message: error.message },
        400
      );
    }
    throw error;
  }
}
```

### Rate Limiting Configuration

```typescript
// loly.config.ts
import { ServerConfig } from "@lolyjs/core";

const DEFAULT_CONFIG: ServerConfig = {
  bodyLimit: "1mb",
  corsOrigin: "*",
  rateLimit: {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 1000,                   // Normal limit: 1000 requests
    strictMax: 5,                // Strict limit: 5 requests
    strictPatterns: [
      "/api/search/**",
      "/api/favorites/**",
    ],
  },
};
```

### Custom Middleware

```typescript
// middlewares/logger.ts
import type { RouteMiddleware } from "@lolyjs/core";
import { getRequestLogger } from "@lolyjs/core";

export const requestLogger: RouteMiddleware = async (ctx, next) => {
  const logger = getRequestLogger(ctx.req);
  const startTime = Date.now();

  logger.info("Request started", {
    method: ctx.req.method,
    path: ctx.pathname,
    userAgent: ctx.req.headers["user-agent"],
  });

  await next();

  const duration = Date.now() - startTime;
  logger.info("Request completed", {
    method: ctx.req.method,
    path: ctx.pathname,
    status: ctx.res.statusCode,
    duration: `${duration}ms`,
  });
};
```

## Available Routes

### Pages
- `/` - Home page with APOD and recent launches
- `/planets` - Planets list (SSG)
- `/planets/[id]` - Planet detail page (SSG)
- `/launches` - Launches list (SSR)
- `/launches/[id]` - Launch detail page (SSR)
- `/astronauts` - Astronauts list (SSG)
- `/astronauts/[id]` - Astronaut profile (SSG)
- `/apod` - Astronomy Picture of the Day (SSR)

### API Endpoints
- `GET/POST /api/search` - Search across planets, astronauts, and launches
- `GET/POST/DELETE /api/favorites` - Favorites management system
- `GET /api/launches` - Get all launches
- `GET /api/launches/[id]` - Get individual launch

## Advanced Features

### Dynamic Metadata

Each page includes custom metadata for SEO optimization:

```typescript
metadata: {
  title: "Planets | Space Explorer",
  description: "Explore the 8 planets of the solar system with detailed information.",
  metaTags: [
    {
      property: "og:title",
      content: "Planets | Space Explorer",
    },
    {
      property: "og:description",
      content: "Explore the 8 planets of the solar system with detailed information.",
    },
    {
      property: "og:type",
      content: "website",
    },
  ],
}
```

### Error Handling

- **Custom error page** (`_error.tsx`) - Handles server errors gracefully
- **Custom 404 page** (`_not-found.tsx`) - User-friendly not found page
- **API error handling** - Structured error responses in API routes

### Theme Support

- **Dark/Light mode** - Implemented with `ThemeProvider` from `@lolyjs/core/themes`
- **LocalStorage persistence** - Theme preference saved across sessions
- **Theme switch** - Toggle in header navigation

### Type Safety

Full TypeScript support throughout the application:
- Type-safe API clients
- Validated request/response types
- Type-safe routing with dynamic params
- Server hook type inference

## Framework Features Showcased

This example application demonstrates:

1. **Hybrid Rendering** - Strategic use of SSG and SSR based on data requirements
2. **API Design** - RESTful endpoints with validation and error handling
3. **Security** - Rate limiting, input validation, and CORS configuration
4. **Developer Experience** - TypeScript, logging, and error pages
5. **Performance** - Static generation for content that doesn't change frequently
6. **Real-time Data** - Server-side rendering for dynamic content
7. **SEO Optimization** - Dynamic metadata and static generation
8. **Modern UI** - Theme support and responsive design

## Configuration

The app uses `loly.config.ts` for framework configuration:

```typescript
export const config = (env: string): ServerConfig => {
  const isDev = env === "development";
  
  return {
    bodyLimit: "1mb",
    corsOrigin: isDev ? "*" : ["https://space-explorer.example.com"],
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      max: 1000,
      strictMax: 5,
      strictPatterns: ["/api/search/**", "/api/favorites/**"],
    },
  };
};
```

## Future Enhancements

- [ ] Add more space APIs (ISS, Mars Rover, etc.)
- [ ] Implement real authentication
- [ ] Database integration for favorites
- [ ] API response caching
- [ ] Unit and E2E tests
- [ ] PWA support
- [ ] Internationalization (i18n)
- [ ] Image optimization
- [ ] Analytics integration

## Contributing

This project serves as a comprehensive example of the Loly Framework's capabilities. Feel free to use it as a foundation for your own projects or contribute improvements.

## License

ISC

---

**Built with [Loly Framework](https://github.com/MenvielleValen/loly-framework)** - A modern, full-stack framework for building web applications.
