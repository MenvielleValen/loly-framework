# Loly Framework

<div align="center">

**A modern, full-stack React framework with native WebSocket support, route-level middlewares, and enterprise-grade features**

[![npm version](https://img.shields.io/npm/v/@lolyjs/core?style=flat-square)](https://www.npmjs.com/package/@lolyjs/core)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg?style=flat-square)](https://opensource.org/licenses/ISC)
![Downloads](https://img.shields.io/npm/dm/@lolyjs/core)
<br>
[![Alpha](https://img.shields.io/badge/status-alpha-red.svg)](https://github.com/MenvielleValen/loly-framework)
[![Expermiental](https://img.shields.io/badge/phase-experimental-black.svg)](https://github.com/MenvielleValen/loly-framework)

_Built with React 19, Express, Rspack, Socket.IO, and TypeScript_

</div>

---

## Getting Started

Create a new Loly application in seconds:

```bash
npx create-loly-app mi-app
```

This will create a new project with all the necessary files and dependencies. For more information about the CLI, visit the [@lolyjs/cli package](https://www.npmjs.com/package/@lolyjs/cli).

---

## Overview

Loly is a full-stack React framework that combines the simplicity of file-based routing with powerful server-side rendering, static site generation, and unique features like native WebSocket support and route-level middlewares.

### What Makes Loly Different?

- 🔌 **Native WebSocket Support** - Built-in Socket.IO integration with automatic namespace routing
- 🎯 **Route-Level Middlewares** - Define middlewares directly in your routes for pages and APIs
- 📁 **Separation of Concerns** - Server logic in `page.server.hook.ts` and `layout.server.hook.ts` separate from React components
- 🚀 **Hybrid Rendering** - SSR, SSG, and CSR with streaming support
- 🛡️ **Security First** - Built-in rate limiting, validation, sanitization, and security headers
- ⚡ **Performance** - Fast bundling with Rspack and optimized code splitting

---

## Quick Start

### Installation

```bash
npm install @lolyjs/core react react-dom
# or
pnpm add @lolyjs/core react react-dom
```

### Create Your First Page

```tsx
// app/page.tsx
export default function Home() {
  return <h1>Hello, Loly!</h1>;
}
```

### Add Server-Side Data

```tsx
// app/page.server.hook.ts (preferred) or app/server.hook.ts (legacy)
import type { ServerLoader } from "@lolyjs/core";

export const getServerSideProps: ServerLoader = async (ctx) => {
  const data = await fetchData();

  return {
    props: { data },
    metadata: {
      title: "Home Page",
      description: "Welcome to Loly",
    },
  };
};
```

```tsx
// app/page.tsx
export default function Home({ props }) {
  return <h1>{props.data}</h1>;
}
```

### Start Development Server

```bash
npx loly dev
# Server runs on http://localhost:3000
```

---

## Key Features

### 🔌 Native WebSocket Support

Loly includes built-in WebSocket support with automatic namespace routing. Define WebSocket events using the same file-based routing pattern as pages and APIs:

```tsx
// app/wss/chat/events.ts
import type { WssContext } from "@lolyjs/core";

export const events = [
  {
    name: "connection",
    handler: (ctx: WssContext) => {
      console.log("Client connected:", ctx.socket.id);
    },
  },
  {
    name: "message",
    handler: (ctx: WssContext) => {
      const { data, actions } = ctx;
      // Broadcast to all clients
      actions.broadcast("message", {
        text: data.text,
        from: ctx.socket.id,
      });
    },
  },
];
```

**Client-side:**

```tsx
import { lolySocket } from "@lolyjs/core/sockets";

const socket = lolySocket("/chat");

socket.on("message", (data) => {
  console.log("Received:", data);
});

socket.emit("message", { text: "Hello!" });
```

**Key Benefits:**

- Automatic namespace creation from file structure
- Same routing pattern as pages and APIs
- Built-in broadcasting helpers (`emit`, `broadcast`, `emitTo`, `emitToClient`)
- No manual configuration required

### 🎯 Route-Level Middlewares

Define middlewares directly in your routes for fine-grained control. Middlewares run before `getServerSideProps` (pages) or API handlers and can modify `ctx.locals`, set headers, redirect, etc.

**For Pages:**

```tsx
// app/dashboard/page.server.hook.ts (preferred) or app/dashboard/server.hook.ts (legacy)
import type { RouteMiddleware, ServerLoader } from "@lolyjs/core";

export const beforeServerData: RouteMiddleware[] = [
  async (ctx, next) => {
    // Authentication
    const token = ctx.req.headers.authorization;
    if (!token) {
      ctx.res.redirect("/login");
      return; // Don't call next() if redirecting
    }
    ctx.locals.user = await verifyToken(token);
    await next(); // Call next() to continue to next middleware or getServerSideProps
  },
];

export const getServerSideProps: ServerLoader = async (ctx) => {
  const user = ctx.locals.user; // Available from middleware
  return { props: { user } };
};
```

**For API Routes:**

```tsx
// app/api/protected/route.ts
import type { ApiMiddleware, ApiContext } from "@lolyjs/core";

// Global middleware for all methods
export const middlewares: ApiMiddleware[] = [
  async (ctx, next) => {
    // Authentication
    const user = await getUser(ctx.req);
    if (!user) {
      return ctx.Response({ error: "Unauthorized" }, 401);
    }
    ctx.locals.user = user;
    await next();
  },
];

// Method-specific middleware
export const methodMiddlewares = {
  POST: [
    async (ctx, next) => {
      // Validation specific to POST
      await next();
    },
  ],
};

export async function GET(ctx: ApiContext) {
  const user = ctx.locals.user;
  return ctx.Response({ user });
}
```

**Key Benefits:**

- Middlewares execute before loaders/handlers
- Share data via `ctx.locals`
- Method-specific middlewares for APIs
- Clean separation of concerns

### 📁 File-Based Routing

Routes are automatically created from your file structure:

| File Path                     | Route                 |
| ----------------------------- | --------------------- |
| `app/page.tsx`                | `/`                   |
| `app/about/page.tsx`          | `/about`              |
| `app/blog/[slug]/page.tsx`    | `/blog/:slug`         |
| `app/post/[...path]/page.tsx` | `/post/*` (catch-all) |

**Nested Layouts:**

**⚠️ Important**: Layouts should NOT include `<html>` or `<body>` tags. The framework automatically handles the base HTML structure. Layouts should only contain content that goes inside the body.

```tsx
// app/layout.tsx (Root layout)
export default function RootLayout({ children, appName, navigation }) {
  return (
    <div>
      <nav>{navigation}</nav>
      {children}
      <footer>{appName}</footer>
    </div>
  );
}
```

```tsx
// app/layout.server.hook.ts (Root layout server hook - same directory as layout.tsx)
import type { ServerLoader } from "@lolyjs/core";

export const getServerSideProps: ServerLoader = async (ctx) => {
  return {
    props: {
      appName: "My App",
      navigation: ["Home", "About", "Blog"],
    },
  };
};
```

```tsx
// app/blog/layout.tsx (Nested layout)
export default function BlogLayout({ children, sectionTitle }) {
  return (
    <div>
      <h1>{sectionTitle}</h1>
      <aside>Sidebar</aside>
      <main>{children}</main>
    </div>
  );
}
```

```tsx
// app/blog/layout.server.hook.ts (Nested layout server hook - same directory as layout.tsx)
import type { ServerLoader } from "@lolyjs/core";

export const getServerSideProps: ServerLoader = async (ctx) => {
  return {
    props: {
      sectionTitle: "Blog Section",
    },
  };
};
```

**Layout Server Hooks:**

Layouts can have their own server hooks that provide stable data across all pages. Props from layout server hooks are automatically merged with page props:

- **Layout props** (from `layout.server.hook.ts`) are stable and available to both the layout and all pages
- **Page props** (from `page.server.hook.ts`) are specific to each page and override layout props if there's a conflict
- **Combined props** are available to both layouts and pages

**File Convention:**
- Layout server hooks: `app/layout.server.hook.ts` (same directory as `layout.tsx`)
- Page server hooks: `app/page.server.hook.ts` (preferred) or `app/server.hook.ts` (legacy, backward compatible)

### 🚀 Hybrid Rendering

Choose the best rendering strategy for each page:

**SSR (Server-Side Rendering):**

```tsx
// app/posts/page.server.hook.ts (preferred) or app/posts/server.hook.ts (legacy)
export const dynamic = "force-dynamic" as const;

export const getServerSideProps: ServerLoader = async (ctx) => {
  const posts = await fetchFreshPosts();
  return { props: { posts } };
};
```

**SSG (Static Site Generation):**

```tsx
// app/blog/[slug]/page.server.hook.ts (preferred) or app/blog/[slug]/server.hook.ts (legacy)
export const dynamic = "force-static" as const;

export const generateStaticParams: GenerateStaticParams = async () => {
  const posts = await getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
};

export const getServerSideProps: ServerLoader = async (ctx) => {
  const post = await getPost(ctx.params.slug);
  return { props: { post } };
};
```

**CSR (Client-Side Rendering):**

```tsx
// app/dashboard/page.tsx (No page.server.hook.ts)
import { useState, useEffect } from "react";

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchData().then(setData);
  }, []);

  return <div>{data}</div>;
}
```

### 🔌 API Routes

Create RESTful APIs with flexible middleware support:

```tsx
// app/api/posts/route.ts
import type { ApiContext } from "@lolyjs/core";
import { validate } from "@lolyjs/core";
import { z } from "zod";

const postSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
});

export async function GET(ctx: ApiContext) {
  const posts = await getPosts();
  return ctx.Response({ posts });
}

export async function POST(ctx: ApiContext) {
  const data = validate(postSchema, ctx.req.body);
  const post = await createPost(data);
  return ctx.Response({ post }, 201);
}
```

### 🛡️ Built-in Security

**Rate Limiting:**

```tsx
// loly.config.ts
import { ServerConfig } from "@lolyjs/core";

export const config = (env: string): ServerConfig => {
  return {
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000,
      strictMax: 5,
      strictPatterns: ["/api/auth/**"],
    },
  };
};
```

**Validation with Zod:**

```tsx
import { validate, ValidationError } from "@lolyjs/core";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  age: z.number().int().min(0).max(150),
});

try {
  const data = validate(schema, req.body);
} catch (error) {
  if (error instanceof ValidationError) {
    return Response({ errors: error.format() }, 400);
  }
}
```

**Automatic Sanitization:**

Route parameters and query strings are automatically sanitized to prevent XSS attacks.

**Security Headers:**

Helmet is configured by default with CSP (Content Security Policy) and nonce support.

### 📝 Structured Logging

```tsx
import { getRequestLogger, createModuleLogger } from "@lolyjs/core";

// Request logger (automatic request ID)
export const getServerSideProps: ServerLoader = async (ctx) => {
  const logger = getRequestLogger(ctx.req);
  logger.info("Processing request", { userId: ctx.locals.user?.id });
  return { props: {} };
};

// Module logger
const logger = createModuleLogger("my-module");
logger.info("Module initialized");
logger.error("Error occurred", error);
```

---

## Project Structure

```
your-app/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── layout.server.hook.ts  # Root layout server hook (stable props)
│   ├── page.tsx                # Home page (/)
│   ├── page.server.hook.ts    # Page server hook (preferred) or server.hook.ts (legacy)
│   ├── _not-found.tsx          # Custom 404
│   ├── _error.tsx              # Custom error page
│   ├── blog/
│   │   ├── layout.tsx          # Blog layout
│   │   ├── layout.server.hook.ts  # Blog layout server hook
│   │   ├── page.tsx            # /blog
│   │   └── [slug]/
│   │       ├── page.tsx        # /blog/:slug
│   │       └── page.server.hook.ts  # Page server hook
│   ├── api/
│   │   └── posts/
│   │       └── route.ts        # /api/posts
│   └── wss/
│       └── chat/
│           └── events.ts       # WebSocket namespace /chat
├── components/                 # React components
├── lib/                        # Utilities
├── public/                     # Static files
├── loly.config.ts              # Framework configuration
├── init.server.ts              # Server initialization (DB, services, etc.)
└── package.json
```

---

## API Reference

### Server Loader

**Page Server Hook:**

```tsx
// app/page.server.hook.ts (preferred) or app/server.hook.ts (legacy)
import type { ServerLoader } from "@lolyjs/core";

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

**Layout Server Hook:**

```tsx
// app/layout.server.hook.ts (same directory as layout.tsx)
import type { ServerLoader } from "@lolyjs/core";

export const getServerSideProps: ServerLoader = async (ctx) => {
  // Fetch stable data that persists across all pages
  const user = await getCurrentUser();
  const navigation = await getNavigation();

  return {
    props: {
      user,        // Available to layout and all pages
      navigation,  // Available to layout and all pages
    },
  };
};
```

**Props Merging:**

- Layout props (from `layout.server.hook.ts`) are merged first
- Page props (from `page.server.hook.ts`) are merged second and override layout props
- Both layouts and pages receive the combined props

```tsx
// app/layout.tsx
export default function Layout({ user, navigation, children }) {
  // Receives: user, navigation (from layout.server.hook.ts)
  // Also receives: any props from page.server.hook.ts
  return <div>{/* ... */}</div>;
}

// app/page.tsx
export default function Page({ user, navigation, posts }) {
  // Receives: user, navigation (from layout.server.hook.ts)
  // Receives: posts (from page.server.hook.ts)
  return <div>{/* ... */}</div>;
}
```

### API Route Handler

```tsx
import type { ApiContext } from "@lolyjs/core";

export async function GET(ctx: ApiContext) {
  return ctx.Response({ data: "value" });
}

export async function POST(ctx: ApiContext) {
  return ctx.Response({ created: true }, 201);
}

export async function DELETE(ctx: ApiContext) {
  return ctx.Response({ deleted: true }, 204);
}
```

### WebSocket Event Handler

```tsx
import type { WssContext } from "@lolyjs/core";

export const events = [
  {
    name: "connection",
    handler: (ctx: WssContext) => {
      // Handle connection
    },
  },
  {
    name: "custom-event",
    handler: (ctx: WssContext) => {
      const { socket, data, actions } = ctx;

      // Emit to all clients
      actions.emit("response", { message: "Hello" });

      // Broadcast to all except sender
      actions.broadcast("notification", data);

      // Emit to specific socket
      actions.emitTo(socketId, "private", data);
    },
  },
];
```

### Client Cache

```tsx
import { revalidate } from "@lolyjs/core/client-cache";

export default function Page({ props }) {
  const handleRefresh = async () => {
    await revalidate(); // Refresh current page data
  };

  return <div>{/* Your UI */}</div>;
}
```

### Components

```tsx
import { Link } from "@lolyjs/core/components";

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

## Configuration

### Framework Configuration

Create `loly.config.ts` in your project root to configure the framework:

```tsx
import { FrameworkConfig } from "@lolyjs/core";

export default {
  directories: {
    app: "app",
    build: ".loly",
    static: "public",
  },
  server: {
    port: 3000,
    host: "localhost",
  },
  routing: {
    trailingSlash: "ignore",
    caseSensitive: false,
    basePath: "",
  },
  rendering: {
    framework: "react",
    streaming: true,
    ssr: true,
    ssg: true,
  },
} satisfies FrameworkConfig;
```

### Server Configuration

Configure server settings (CORS, rate limiting, etc.) in `loly.config.ts` by exporting a `config` function:

```tsx
// loly.config.ts
import { ServerConfig } from "@lolyjs/core";

export const config = (env: string): ServerConfig => {
  return {
    bodyLimit: "1mb",
    corsOrigin: env === "production" ? ["https://yourdomain.com"] : "*",
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      max: 1000,
      strictMax: 5,
      strictPatterns: ["/api/auth/**"],
    },
  };
};
```

### Server Initialization

Create `init.server.ts` in your project root to initialize services when Express starts (database connections, external services, etc.):

```tsx
// init.server.ts
import { InitServerData } from "@lolyjs/core";

export async function init({
  serverContext,
}: {
  serverContext: InitServerData;
}) {
  // Initialize database connection
  await connectToDatabase();

  // Setup external services
  await setupExternalServices();

  // Any other initialization logic
  console.log("Server initialized successfully");
}
```

**Note**: `init.server.ts` is for initializing your application services, not for configuring Loly Framework. Framework configuration goes in `loly.config.ts`.

---

## CLI Commands

```bash
# Development server
npx loly dev

# Build for production
npx loly build

# Start production server
npx loly start
```

---

## TypeScript Support

Loly is built with TypeScript and provides full type safety:

```tsx
import type {
  ServerContext,
  ServerLoader,
  ApiContext,
  WssContext,
  RouteMiddleware,
  ApiMiddleware,
  GenerateStaticParams,
} from "@lolyjs/core";
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
- Server code (`.loly/server`)

### Environment Variables

```bash
PORT=3000
HOST=0.0.0.0
NODE_ENV=production
PUBLIC_WS_BASE_URL=http://localhost:3000
```

---

## Exports

```tsx
// Server
import { startDevServer, startProdServer, buildApp } from "@lolyjs/core";

// Types
import type {
  ServerContext,
  ServerLoader,
  ApiContext,
  WssContext,
  RouteMiddleware,
  ApiMiddleware,
  GenerateStaticParams,
} from "@lolyjs/core";

// Validation
import { validate, safeValidate, ValidationError } from "@lolyjs/core";

// Security
import { sanitizeString, sanitizeObject } from "@lolyjs/core";
import {
  createRateLimiter,
  defaultRateLimiter,
  strictRateLimiter,
} from "@lolyjs/core";

// Logging
import { logger, createModuleLogger, getRequestLogger } from "@lolyjs/core";

// Client
import { Link } from "@lolyjs/core/components";
import { lolySocket } from "@lolyjs/core/sockets";
import { revalidate, revalidatePath } from "@lolyjs/core/client-cache";
```

---

## License

ISC

---

## Built With

- [React](https://react.dev/) - UI library
- [Express](https://expressjs.com/) - Web framework
- [Rspack](https://rspack.dev/) - Fast bundler
- [Socket.IO](https://socket.io/) - WebSocket library
- [Pino](https://getpino.io/) - Fast logger
- [Zod](https://zod.dev/) - Schema validation
- [Helmet](https://helmetjs.github.io/) - Security headers

---

<div align="center">

**Made with ❤️ by the Loly team**

</div>
