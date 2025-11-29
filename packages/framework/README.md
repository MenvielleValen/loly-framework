# Loly Framework

<div align="center">

**A modern, production-ready React framework with file-based routing, SSR, SSG, and built-in security**

[![npm version](https://img.shields.io/npm/v/@loly/core?style=flat-square)](https://www.npmjs.com/package/@loly/core)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg?style=flat-square)](https://opensource.org/licenses/ISC)

*Built with React 19, Express, Rspack, and TypeScript*

</div>

---

## Overview

Loly is a full-stack React framework designed for modern web applications. It combines the simplicity of file-based routing with powerful server-side rendering, static site generation, and enterprise-grade security features out of the box.

### Why Loly?

- ⚡ **Fast** - Lightning-fast bundling with Rspack and optimized SSR streaming
- 🔒 **Secure** - Built-in rate limiting, CORS, CSP, input validation, and sanitization
- 🎯 **Developer-Friendly** - File-based routing, hot reload, and full TypeScript support
- 🚀 **Production-Ready** - Structured logging, error handling, and optimized builds
- 🔧 **Flexible** - Customizable configuration for any use case

---

## Features

### Core Features

- **File-based Routing** - Automatic route generation from your file structure
- **Server-Side Rendering (SSR)** - Fast initial page loads with React 19 streaming
- **Static Site Generation (SSG)** - Pre-render pages at build time for maximum performance
- **API Routes** - Build RESTful APIs alongside your pages
- **Nested Layouts** - Shared UI components across routes
- **Hot Reload** - Instant feedback during development
- **Client-Side Navigation** - Fast page transitions without full reloads

### Security Features

- **Rate Limiting** - Configurable request limits with automatic strict patterns
- **CORS Protection** - Secure cross-origin resource sharing
- **Content Security Policy (CSP)** - XSS protection with nonce support
- **Input Validation** - Zod-based validation for request bodies, params, and queries
- **Input Sanitization** - Automatic XSS protection for route parameters
- **Security Headers** - HSTS, X-Frame-Options, and more via Helmet

### Developer Experience

- **TypeScript** - Full type safety throughout your application
- **Structured Logging** - Pino-based logging with colored output in dev, JSON in production
- **Request Tracking** - Automatic request ID generation and tracking
- **Error Handling** - Custom error and not-found pages
- **Metadata API** - Dynamic SEO and meta tags
- **Themes Support** - Built-in theme provider with dark/light mode

---

## Quick Start

### Installation

```bash
npm install @loly/core react react-dom
# or
pnpm add @loly/core react react-dom
# or
yarn add @loly/core react react-dom
```

### Project Structure

```
your-app/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Home page (/)
│   ├── _not-found.tsx          # Custom 404 page (optional)
│   ├── _error.tsx              # Custom error page (optional)
│   ├── about/
│   │   └── page.tsx            # /about page
│   ├── blog/
│   │   ├── layout.tsx          # Blog layout
│   │   └── [slug]/
│   │       ├── page.tsx        # Dynamic route: /blog/:slug
│   │       └── server.hook.ts  # Server-side data fetching
│   └── api/
│       └── posts/
│           └── route.ts        # API endpoint: /api/posts
├── bootstrap.tsx               # Client entry point
├── init.server.ts              # Server initialization (optional)
├── loly.config.ts              # Framework configuration (optional)
└── package.json
```

### Create Your First Page

```tsx
// app/page.tsx
export default function HomePage() {
  return (
    <main>
      <h1>Welcome to Loly</h1>
      <p>Build amazing apps with React and SSR</p>
    </main>
  );
}
```

### Add Scripts

```json
{
  "scripts": {
    "dev": "loly dev",
    "build": "loly build",
    "start": "loly start"
  }
}
```

### Start Development Server

```bash
npm run dev
# Server runs on http://localhost:3000
```

---

## Routing

### File-Based Routes

Routes are automatically created based on your file structure:

| File Path | Route |
|-----------|-------|
| `app/page.tsx` | `/` |
| `app/about/page.tsx` | `/about` |
| `app/blog/[slug]/page.tsx` | `/blog/:slug` |
| `app/post/[...path]/page.tsx` | `/post/*` (catch-all) |
| `app/shop/[category]/[id]/page.tsx` | `/shop/:category/:id` |

### Dynamic Routes

Use brackets to create dynamic segments:

- `[slug]` - Single dynamic segment
- `[...path]` - Catch-all route (matches everything)
- `[id]/comments/[commentId]` - Multiple dynamic segments

**Example:**

```tsx
// app/blog/[slug]/page.tsx
import { usePageProps } from "@loly/core/hooks";

export default function BlogPost() {
  const { params } = usePageProps();
  
  return (
    <article>
      <h1>Post: {params.slug}</h1>
    </article>
  );
}
```

### Layouts

Create nested layouts by adding `layout.tsx` files. The framework automatically generates the `<html>`, `<head>`, and `<body>` tags, so your layouts should only return content:

```tsx
// app/layout.tsx (Root layout)
export default function RootLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <div className="app-container">
      <nav>Navigation</nav>
      <main>{children}</main>
      <footer>Footer</footer>
    </div>
  );
}
```

**Nested Layouts**

```tsx
// app/blog/layout.tsx (Blog-specific layout)
export default function BlogLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <div className="blog-container">
      <aside>Blog sidebar</aside>
      <main>{children}</main>
    </div>
  );
}
```

**Note:** The framework automatically handles:
- HTML document structure (`<html>`, `<head>`, `<body>`)
- Meta tags (title, description, charset, viewport)
- Required scripts (client.js, initial data)
- App container for hydration

---

## Server-Side Rendering

### Loaders (Server-Side Data Fetching)

Use `server.hook.ts` files to fetch data on the server:

```tsx
// app/blog/[slug]/server.hook.ts
import type { ServerLoader } from "@loly/core";

export const getServerSideProps: ServerLoader = async (ctx) => {
  const { slug } = ctx.params;
  
  // Fetch data from database, API, etc.
  const post = await fetchPost(slug);
  
  if (!post) {
    return { notFound: true };
  }
  
  return {
    props: {
      post,
      slug,
    },
    metadata: {
      title: post.title,
      description: post.excerpt,
      metaTags: [
        {
          property: "og:image",
          content: post.imageUrl,
        },
      ],
    },
  };
};
```

### Accessing Server Context

```tsx
export const getServerSideProps: ServerLoader = async (ctx) => {
  const { req, res, params, pathname, locals } = ctx;
  
  // Access request headers, cookies, etc.
  const userAgent = req.headers["user-agent"];
  const cookies = req.cookies;
  
  // Set custom response headers
  res.setHeader("X-Custom-Header", "value");
  
  // Store data in locals (shared across middleware)
  locals.user = await getUser(req);
  
  return { props: {} };
};
```

### Redirects

```tsx
export const getServerSideProps: ServerLoader = async (ctx) => {
  return {
    redirect: {
      destination: "/new-path",
      permanent: true, // 301 redirect (false for 302)
    },
  };
};
```

### Access Props in Components

```tsx
// app/blog/[slug]/page.tsx
import { usePageProps } from "@loly/core/hooks";

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

---

## Static Site Generation (SSG)

Generate static pages at build time for maximum performance:

```tsx
// app/blog/[slug]/server.hook.ts
import type { ServerLoader, GenerateStaticParams } from "@loly/core";

// Enable SSG
export const dynamic = "force-static" as const;

// Define which pages to pre-render
export const generateStaticParams: GenerateStaticParams = async () => {
  const posts = await fetchAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
};

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

### Dynamic Modes

- `"force-static"` - Always generate static pages (SSG)
- `"force-dynamic"` - Always use SSR (no caching)
- `"auto"` - Framework decides (default)

---

## API Routes

Create RESTful API endpoints in the `app/api` directory:

```tsx
// app/api/posts/route.ts
import type { ApiContext } from "@loly/core";
import { z } from "zod";
import { validate } from "@loly/core";

const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
});

export async function GET(ctx: ApiContext) {
  const posts = await fetchPosts();
  return ctx.Response({ posts });
}

export async function POST(ctx: ApiContext) {
  // Validate request body
  const body = validate(createPostSchema, ctx.req.body);
  
  const newPost = await createPost(body);
  return ctx.Response(newPost, 201);
}
```

### Supported HTTP Methods

- `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`

### API Middleware

```tsx
// app/api/posts/route.ts
import type { ApiContext, ApiMiddleware } from "@loly/core";
import { strictRateLimiter } from "@loly/core";

// Global middleware for all methods
export const beforeApi: ApiMiddleware[] = [
  async (ctx, next) => {
    // Authentication
    const token = ctx.req.headers.authorization;
    if (!token) {
      return ctx.Response({ error: "Unauthorized" }, 401);
    }
    ctx.locals.user = await verifyToken(token);
    await next();
  },
];

// Method-specific middleware
export const beforePOST: ApiMiddleware[] = [strictRateLimiter];

export async function POST(ctx: ApiContext) {
  const user = ctx.locals.user; // Available from middleware
  // ...
}
```

---

## Middleware

### Route Middleware

Add middleware to pages using `server.hook.ts`:

```tsx
// app/middleware/auth.ts
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
import type { ServerLoader } from "@loly/core";

export const middlewares = [requireAuth];

export const getServerSideProps: ServerLoader = async (ctx) => {
  const user = ctx.locals.user; // Available from middleware
  return { props: { user } };
};
```

---

## Security

### Rate Limiting

Rate limiting is enabled by default with sensible defaults:

```tsx
// loly.config.ts
export const config = (env: string) => {
  return {
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per window
      strictMax: 5, // Strict limit for sensitive endpoints
      // Auto-apply strict rate limiting to these patterns
      strictPatterns: [
        '/api/auth/**',
        '/api/login/**',
        '/api/register/**',
        '/api/password/**',
      ],
    },
  };
};
```

**Manual Rate Limiting:**

```tsx
import { strictRateLimiter, lenientRateLimiter } from "@loly/core";

export const beforeApi = [strictRateLimiter];
```

### CORS Configuration

```tsx
// loly.config.ts
export const config = (env: string) => {
  return {
    corsOrigin: env === "production" 
      ? ["https://yourdomain.com"]
      : true, // Allow all in development
  };
};
```

**⚠️ Security Note:** Never use `'*'` as CORS origin in production.

### Content Security Policy (CSP)

CSP is enabled by default with nonce support for inline scripts:

```tsx
// loly.config.ts
export const config = (env: string) => {
  return {
    security: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          scriptSrc: ["'self'"], // Nonces are automatically added in production
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https:"], // Allow fetch to any HTTPS endpoint
          fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
        },
      },
    },
  };
};
```

### Input Validation

Validate request data using Zod schemas:

```tsx
import { z } from "zod";
import { validate, ValidationError } from "@loly/core";

const userSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().min(0).max(150),
});

export async function POST(ctx: ApiContext) {
  try {
    const body = validate(userSchema, ctx.req.body);
    // body is now type-safe and validated
    const user = await createUser(body);
    return ctx.Response(user, 201);
  } catch (error) {
    if (error instanceof ValidationError) {
      return ctx.Response({
        error: "Validation failed",
        details: error.format(),
      }, 400);
    }
    throw error;
  }
}
```

**Safe Validation (no exception):**

```tsx
import { safeValidate } from "@loly/core";

const result = safeValidate(userSchema, ctx.req.body);
if (!result.success) {
  return ctx.Response({ errors: result.error.format() }, 400);
}
const body = result.data; // Type-safe
```

### Input Sanitization

Route parameters and query strings are automatically sanitized. You can also manually sanitize:

```tsx
import { sanitizeString, sanitizeObject } from "@loly/core";

const clean = sanitizeString(userInput);
const sanitized = sanitizeObject(req.body);
```

---

## Logging

Loly includes a structured logging system powered by Pino:

### Using the Logger

```tsx
// In API routes or server hooks
import { getRequestLogger } from "@loly/core";

export const getServerSideProps: ServerLoader = async (ctx) => {
  const logger = getRequestLogger(ctx.req);
  
  logger.info("Processing request", { userId: ctx.locals.user?.id });
  logger.error("Error occurred", error, { context: "data-fetch" });
  
  return { props: {} };
};
```

### Module-Specific Logger

```tsx
import { createModuleLogger } from "@loly/core";

const logger = createModuleLogger("my-module");
logger.debug("Debug message");
logger.warn("Warning message");
logger.error("Error message", error);
```

### Logging Configuration

By default, the framework logs:
- ✅ Errors (500+ status codes)
- ✅ Warnings (400+ status codes)
- ❌ Successful requests (to reduce noise)

**Enable verbose logging:**

```bash
# Log all requests (including successful ones)
LOG_REQUESTS=true npm run dev

# Log static assets too
LOG_STATIC_ASSETS=true npm run dev

# Disable response logging
LOG_RESPONSES=false npm run dev
```

### Request Tracking

Every request automatically gets a unique `X-Request-ID` header for tracking across services.

---

## Metadata & SEO

Set page metadata for better SEO:

```tsx
export const getServerSideProps: ServerLoader = async (ctx) => {
  return {
    props: {},
    metadata: {
      title: "My Page Title",
      description: "Page description for SEO",
      metaTags: [
        {
          name: "keywords",
          content: "react, framework, ssr",
        },
        {
          property: "og:title",
          content: "Open Graph Title",
        },
        {
          property: "og:image",
          content: "https://example.com/image.jpg",
        },
      ],
    },
  };
};
```

---

## Client-Side Navigation

Use the `Link` component for fast client-side navigation:

```tsx
import { Link } from "@loly/core/components";

export default function Navigation() {
  return (
    <nav>
      <Link href="/">Home</Link>
      <Link href="/about">About</Link>
      <Link href="/blog/[slug]" params={{ slug: "my-post" }}>
        My Post
      </Link>
    </nav>
  );
}
```

---

## Themes

Built-in theme support with dark/light mode:

```tsx
import { ThemeProvider } from "@loly/core/themes";

export default function RootLayout({ children }) {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="my-app-theme">
      <body>{children}</body>
    </ThemeProvider>
  );
}
```

---

## Server Initialization

Run code when the server starts:

```tsx
// init.server.ts
import type { InitServerData } from "@loly/core";

export async function init({ serverContext }: { serverContext: InitServerData }) {
  const { server } = serverContext;
  
  // Setup database connections
  await connectDatabase();
  
  // Setup WebSocket, etc.
  setupWebSocket(server);
  
  console.log("Server initialized");
}
```

---

## Error Handling

### Custom Error Page

```tsx
// app/_error.tsx
export default function ErrorPage() {
  return (
    <div>
      <h1>Something went wrong</h1>
      <p>An error occurred while rendering this page.</p>
    </div>
  );
}
```

### Custom Not Found Page

```tsx
// app/_not-found.tsx
export default function NotFoundPage() {
  return (
    <div>
      <h1>404 - Page Not Found</h1>
      <p>The page you're looking for doesn't exist.</p>
    </div>
  );
}
```

---

## Configuration

Create a `loly.config.ts` file in your project root:

```tsx
export const config = (env: string) => {
  return {
    // Directory structure
    directories: {
      app: "app",
      build: ".loly",
      static: "public",
    },
    
    // Server configuration
    server: {
      port: 3000,
      host: env === "production" ? "0.0.0.0" : "localhost",
    },
    
    // Security
    security: {
      contentSecurityPolicy: {
        directives: {
          // ... CSP directives
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
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

## Production

### Build

```bash
npm run build
```

This will:
1. Build the client bundle with Rspack
2. Generate static pages (if using SSG)
3. Compile server code
4. Output to `.loly/client` and `.loly/ssg`

### Start Production Server

```bash
npm run start
```

The production server:
- Serves static assets from `.loly/client`
- Serves pre-rendered SSG pages from `.loly/ssg`
- Falls back to SSR for dynamic routes
- Uses structured JSON logging
- Includes all security features

### Environment Variables

```bash
# Server
PORT=3000
HOST=0.0.0.0

# Logging
LOG_LEVEL=info
LOG_REQUESTS=false
LOG_RESPONSES=true
LOG_STATIC_ASSETS=false
```

---

## CLI Commands

The `loly` CLI provides all the commands you need:

```bash
# Development
loly dev [--port 3000] [--appDir app]

# Build for production
loly build [--appDir app]

# Start production server
loly start [--port 3000] [--appDir app]
```

---

## Programmatic API

You can also use the framework programmatically:

```tsx
import { startDevServer, startProdServer, buildApp } from "@loly/core";

// Development
await startDevServer({
  port: 3000,
  rootDir: process.cwd(),
  appDir: "app",
});

// Production
await startProdServer({
  port: 3000,
  rootDir: process.cwd(),
});

// Build
await buildApp({
  rootDir: process.cwd(),
  appDir: "app",
});
```

---

## TypeScript

Loly is built with TypeScript and provides full type safety:

```tsx
import type {
  ServerContext,
  ServerLoader,
  ApiContext,
  RouteMiddleware,
  ApiMiddleware,
  LoaderResult,
} from "@loly/core";

// Fully typed server loader
export const getServerSideProps: ServerLoader = async (ctx: ServerContext) => {
  // ctx is fully typed
  const { params, req, res, locals } = ctx;
  // ...
};
```

---

## Examples

Check out the [example app](../apps/example) for a complete working example with:
- Dynamic routes
- API routes
- Middleware
- SSG
- Layouts
- Security features

---

## API Reference

### Exports

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
  LoaderResult,
  GenerateStaticParams,
} from "@loly/core";

// Validation
import { validate, safeValidate, ValidationError, commonSchemas } from "@loly/core";

// Security
import { sanitizeString, sanitizeObject, sanitizeParams } from "@loly/core";
import { createRateLimiter, strictRateLimiter } from "@loly/core";

// Logging
import { logger, createModuleLogger, getRequestLogger } from "@loly/core";

// Components & Hooks
import { Link } from "@loly/core/components";
import { usePageProps } from "@loly/core/hooks";
import { ThemeProvider } from "@loly/core/themes";
```

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## License

ISC

---

## Acknowledgments

Built with:
- [React](https://react.dev/) - UI library
- [Express](https://expressjs.com/) - Web framework
- [Rspack](https://rspack.dev/) - Fast bundler
- [Pino](https://getpino.io/) - Fast logger
- [Zod](https://zod.dev/) - Schema validation
- [Helmet](https://helmetjs.github.io/) - Security headers
- [TypeScript](https://www.typescriptlang.org/) - Type safety

---

<div align="center">

**Made with ❤️ by the Loly team**

</div>
