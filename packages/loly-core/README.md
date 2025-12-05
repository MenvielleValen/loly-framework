# Loly Framework EXPERIMENTAL

<div align="center">

**A modern, production-ready React framework with file-based routing, SSR, SSG, and built-in security**

[![npm version](https://img.shields.io/npm/v/@loly/core?style=flat-square)](https://www.npmjs.com/package/@loly/core)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg?style=flat-square)](https://opensource.org/licenses/ISC)

*Built with React 19, Express, Rspack, and TypeScript*

</div>

---

## Overview

Loly is a full-stack React framework that combines the simplicity of file-based routing with powerful server-side rendering, static site generation, and enterprise-grade security features.

### Why Loly?

- ⚡ **Fast** - Lightning-fast bundling with Rspack and optimized SSR streaming
- 🔒 **Secure** - Built-in rate limiting, CORS, CSP, input validation, and sanitization
- 🎯 **Developer-Friendly** - File-based routing, hot reload, and full TypeScript support
- 🚀 **Production-Ready** - Structured logging, error handling, and optimized builds
- 💾 **Smart Caching** - LRU cache with path indexing for optimal performance

---

## Quick Start

### Installation

```bash
npm install @loly/core react react-dom
# or
pnpm add @loly/core react react-dom
```

### Create Your First App

```bash
# Create app directory
mkdir my-app && cd my-app

# Create your first page
mkdir -p app
```

```tsx
// app/page.tsx
export default function Home() {
  return <h1>Hello, Loly!</h1>;
}
```

```tsx
// bootstrap.tsx
import { bootstrapClient } from "@lolyjs/core/runtime";
import routes from "@lolyjs/core/runtime";

bootstrapClient(routes);
```

```json
// package.json
{
  "scripts": {
    "dev": "loly dev",
    "build": "loly build",
    "start": "loly start"
  }
}
```

```bash
npm run dev
# Server runs on http://localhost:3000
```

---

## Core Concepts

### File-Based Routing

Routes are automatically created from your file structure:

| File Path | Route |
|-----------|-------|
| `app/page.tsx` | `/` |
| `app/about/page.tsx` | `/about` |
| `app/blog/[slug]/page.tsx` | `/blog/:slug` |
| `app/post/[...path]/page.tsx` | `/post/*` (catch-all) |

### Server-Side Data Fetching

Use `server.hook.ts` to fetch data on the server:

```tsx
// app/blog/[slug]/server.hook.ts
import type { ServerLoader } from "@loly/core";

export const getServerSideProps: ServerLoader = async (ctx) => {
  const { slug } = ctx.params;
  const post = await fetchPost(slug);
  
  return {
    props: { post },
    metadata: {
      title: post.title,
      description: post.excerpt,
    },
  };
};
```

```tsx
// app/blog/[slug]/page.tsx
import { usePageProps } from "@lolyjs/core/hooks";

export default function BlogPost() {
  const { props } = usePageProps();
  const { post } = props;
  
  return (
    <article>
      <h1>{post.title}</h1>
      <div>{post.content}</div>
    </article>
  );
}
```

### Client-Side Navigation

Fast page transitions without full reloads:

```tsx
import { Link } from "@lolyjs/core/components";

export default function Navigation() {
  return (
    <nav>
      <Link href="/">Home</Link>
      <Link href="/about">About</Link>
    </nav>
  );
}
```

### Cache Revalidation

Invalidate and refresh route data:

```tsx
import { revalidatePath, revalidate } from "@lolyjs/core/client-cache";

// Revalidate a specific route
revalidatePath('/posts');

// Revalidate and refresh current page (similar to Next.js router.refresh())
await revalidate();
```

Components using `usePageProps()` automatically update when you call `revalidate()`.

---

## Features

### Core Features

- ✅ **File-based Routing** - Automatic route generation
- ✅ **Server-Side Rendering (SSR)** - React 19 streaming
- ✅ **Static Site Generation (SSG)** - Pre-render at build time
- ✅ **API Routes** - RESTful APIs alongside pages
- ✅ **Nested Layouts** - Shared UI components
- ✅ **Client-Side Navigation** - Fast page transitions
- ✅ **Smart Caching** - LRU cache with path indexing

### Security Features

- 🔒 **Rate Limiting** - Configurable with strict patterns
- 🔒 **CORS Protection** - Secure cross-origin sharing
- 🔒 **Content Security Policy** - XSS protection with nonce
- 🔒 **Input Validation** - Zod-based validation
- 🔒 **Input Sanitization** - Automatic XSS protection

---

## API Reference

### Server Loader

```tsx
import type { ServerLoader } from "@loly/core";

export const getServerSideProps: ServerLoader = async (ctx) => {
  const { req, res, params, pathname, locals } = ctx;
  
  // Fetch data
  const data = await fetchData();
  
  // Redirect
  return {
    redirect: {
      destination: "/new-path",
      permanent: true,
    },
  };
  
  // Not found
  return { notFound: true };
  
  // Return props
  return {
    props: { data },
    metadata: {
      title: "Page Title",
      description: "Page description",
    },
  };
};
```

### Static Site Generation

```tsx
import type { ServerLoader, GenerateStaticParams } from "@loly/core";

export const dynamic = "force-static" as const;

export const generateStaticParams: GenerateStaticParams = async () => {
  const posts = await fetchAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
};

export const getServerSideProps: ServerLoader = async (ctx) => {
  const { slug } = ctx.params;
  const post = await fetchPost(slug);
  return { props: { post } };
};
```

### API Routes

```tsx
import type { ApiContext } from "@loly/core";
import { validate } from "@loly/core";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
});

export async function GET(ctx: ApiContext) {
  const posts = await fetchPosts();
  return ctx.Response({ posts });
}

export async function POST(ctx: ApiContext) {
  const body = validate(schema, ctx.req.body);
  const post = await createPost(body);
  return ctx.Response(post, 201);
}
```

### Middleware

```tsx
import type { RouteMiddleware } from "@loly/core";

export const requireAuth: RouteMiddleware = async (ctx, next) => {
  const user = await getUser(ctx.req);
  if (!user) {
    ctx.res.redirect("/login");
    return;
  }
  ctx.locals.user = user;
  await next();
};
```

```tsx
// app/dashboard/server.hook.ts
import { requireAuth } from "../middleware/auth";

export const middlewares = [requireAuth];

export const getServerSideProps: ServerLoader = async (ctx) => {
  const user = ctx.locals.user; // Available from middleware
  return { props: { user } };
};
```

### Cache Management

```tsx
import { revalidatePath, revalidate } from "@lolyjs/core/client-cache";

// Revalidate a specific route (removes from cache)
revalidatePath('/posts');

// Revalidate with query params
revalidatePath('/posts?page=2');

// Revalidate current page and refresh components
await revalidate();
```

### Client Hooks

```tsx
import { usePageProps } from "@lolyjs/core/hooks";

export default function Page() {
  const { params, props } = usePageProps();
  // Automatically updates when revalidate() is called
  return <div>{/* Your UI */}</div>;
}
```

---

## Configuration

Create `loly.config.ts` in your project root:

```tsx
export const config = (env: string) => {
  return {
    // Server
    server: {
      port: 3000,
      host: env === "production" ? "0.0.0.0" : "localhost",
    },
    
    // Security
    security: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
        },
      },
    },
    
    // Rate limiting
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      max: 100,
      strictMax: 5,
      strictPatterns: ["/api/auth/**"],
    },
    
    // CORS
    corsOrigin: env === "production" 
      ? ["https://yourdomain.com"]
      : true,
  };
};
```

---

## Project Structure

```
your-app/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Home page (/)
│   ├── _not-found.tsx          # Custom 404 (optional)
│   ├── _error.tsx              # Custom error (optional)
│   ├── about/
│   │   └── page.tsx            # /about
│   ├── blog/
│   │   ├── layout.tsx          # Blog layout
│   │   └── [slug]/
│   │       ├── page.tsx        # /blog/:slug
│   │       └── server.hook.ts  # Server-side data
│   └── api/
│       └── posts/
│           └── route.ts        # /api/posts
├── bootstrap.tsx               # Client entry
├── init.server.ts              # Server init (optional)
├── loly.config.ts              # Config (optional)
└── package.json
```

---

## Advanced

### Layouts

```tsx
// app/layout.tsx (Root)
export default function RootLayout({ children }) {
  return (
    <div className="app">
      <nav>Navigation</nav>
      <main>{children}</main>
      <footer>Footer</footer>
    </div>
  );
}
```

```tsx
// app/blog/layout.tsx (Nested)
export default function BlogLayout({ children }) {
  return (
    <div className="blog">
      <aside>Sidebar</aside>
      <main>{children}</main>
    </div>
  );
}
```

### Themes

```tsx
import { ThemeProvider } from "@lolyjs/core/themes";

export default function RootLayout({ children, theme }) {
  return (
    <ThemeProvider initialTheme={theme}>
      {children}
    </ThemeProvider>
  );
}
```

### Validation & Sanitization

```tsx
import { validate, safeValidate, sanitizeString } from "@loly/core";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
});

// Throw on error
const data = validate(schema, req.body);

// Return result object
const result = safeValidate(schema, req.body);
if (!result.success) {
  return Response({ errors: result.error }, 400);
}

// Sanitize strings
const clean = sanitizeString(userInput);
```

### Logging

```tsx
import { getRequestLogger, createModuleLogger } from "@loly/core";

// In server hooks or API routes
export const getServerSideProps: ServerLoader = async (ctx) => {
  const logger = getRequestLogger(ctx.req);
  logger.info("Processing request", { userId: ctx.locals.user?.id });
  return { props: {} };
};

// Module logger
const logger = createModuleLogger("my-module");
logger.debug("Debug message");
logger.error("Error", error);
```

---

## TypeScript Support

Loly is built with TypeScript and provides full type safety:

```tsx
import type {
  ServerContext,
  ServerLoader,
  ApiContext,
  RouteMiddleware,
  ApiMiddleware,
} from "@loly/core";

// Fully typed server loader
export const getServerSideProps: ServerLoader = async (ctx) => {
  // ctx is fully typed
  const { params, req, res, locals } = ctx;
  // ...
};
```

---

## Production

### Build

```bash
npm run build
```

This generates:
- Client bundle (`.loly/client`)
- Static pages if using SSG (`.loly/ssg`)
- Server code

### Start

```bash
npm run start
```

### Environment Variables

```bash
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=info
LOG_REQUESTS=false
```

---

## CLI Commands

```bash
# Development
loly dev [--port 3000] [--appDir app]

# Build
loly build [--appDir app]

# Start production server
loly start [--port 3000] [--appDir app]
```

---

## All Exports

```tsx
// Server
import { startDevServer, startProdServer, buildApp } from "@loly/core";

// Types
import type {
  ServerContext,
  ServerLoader,
  ApiContext,
  RouteMiddleware,
  ApiMiddleware,
  GenerateStaticParams,
} from "@loly/core";

// Validation
import { validate, safeValidate, ValidationError } from "@loly/core";

// Security
import { sanitizeString, sanitizeObject } from "@loly/core";
import { strictRateLimiter, lenientRateLimiter } from "@loly/core";

// Logging
import { logger, createModuleLogger, getRequestLogger } from "@loly/core";

// Client
import { Link } from "@lolyjs/core/components";
import { usePageProps } from "@lolyjs/core/hooks";
import { ThemeProvider } from "@lolyjs/core/themes";
import { revalidatePath, revalidate } from "@lolyjs/core/client-cache";
```

---

## License

ISC

---

## Built With

- [React](https://react.dev/) - UI library
- [Express](https://expressjs.com/) - Web framework
- [Rspack](https://rspack.dev/) - Fast bundler
- [Pino](https://getpino.io/) - Fast logger
- [Zod](https://zod.dev/) - Schema validation
- [Helmet](https://helmetjs.github.io/) - Security headers

---

<div align="center">

**Made with ❤️ by the Loly team**

</div>
