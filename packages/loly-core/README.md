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
npx @lolyjs/cli@latest my-app
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
      // See "SEO & Metadata" section below for full metadata options
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

### 🔌 Native WebSocket Support (Realtime v1)

Loly includes production-ready WebSocket support with automatic namespace routing, authentication, validation, rate limiting, and multi-instance scaling. Define WebSocket events using the new `defineWssRoute()` API:

```tsx
// app/wss/chat/events.ts
import { defineWssRoute } from "@lolyjs/core";
import { z } from "zod";

export default defineWssRoute({
  // Authentication hook
  auth: async (ctx) => {
    const token = ctx.req.headers.authorization;
    return await verifyToken(token); // Returns user or null
  },

  // Connection hook
  onConnect: (ctx) => {
    console.log("User connected:", ctx.user?.id);
  },

  // Event handlers with validation, guards, and rate limiting
  events: {
    message: {
      // Schema validation (Zod/Valibot)
      schema: z.object({
        text: z.string().min(1).max(500),
      }),
      
      // Guard (permissions check)
      guard: ({ user }) => !!user, // Require authentication
      
      // Per-event rate limiting
      rateLimit: {
        eventsPerSecond: 10,
        burst: 20,
      },
      
      // Handler
      handler: (ctx) => {
        ctx.actions.broadcast("message", {
          text: ctx.data.text,
          from: ctx.user?.id,
        });
      },
    },
  },
});
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

**Key Features:**

- ✅ **Production-ready**: Auth, validation, rate limiting, logging
- ✅ **Multi-instance**: Redis adapter for horizontal scaling
- ✅ **State Store**: Shared state across instances (memory/Redis)
- ✅ **Presence**: User-to-socket mapping for targeted messaging
- ✅ **Type-safe**: Full TypeScript support
- ✅ **Automatic namespace creation** from file structure
- ✅ **Same routing pattern** as pages and APIs
- ✅ **Built-in helpers**: `emit`, `broadcast`, `toUser()`, `toRoom()`, `join()`, `leave()`
- ✅ **No manual configuration required** (works out of the box for localhost)

**📖 For complete documentation, see [REALTIME.md](./docs/REALTIME.md)**

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

// Global middleware for all methods (GET, POST, PUT, etc.)
export const beforeApi: ApiMiddleware[] = [
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

// Method-specific middleware (only runs before POST)
export const beforePOST: ApiMiddleware[] = [
  async (ctx, next) => {
    // Validation specific to POST
    await next();
  },
];

// Method-specific middleware (only runs before GET)
export const beforeGET: ApiMiddleware[] = [
  async (ctx, next) => {
    // Cache logic specific to GET
    await next();
  },
];

export async function GET(ctx: ApiContext) {
  const user = ctx.locals.user;
  return ctx.Response({ user });
}

export async function POST(ctx: ApiContext) {
  const user = ctx.locals.user;
  const data = ctx.req.body;
  return ctx.Response({ created: true }, 201);
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

### 📦 Route Groups

Route groups allow you to organize routes without affecting the URL structure. Directories wrapped in parentheses like `(dashboard)` or `(landing)` are treated as route groups and don't appear in the URL.

**Key Features:**
- Route groups don't appear in URLs
- Each route group can have its own layout
- Route groups help organize large applications
- Layouts are applied in order: root → route group → nested → page

**Example Structure:**

```
app/
├── layout.tsx                    # Root layout (applies to all routes)
├── layout.server.hook.ts         # Root layout server hook
├── (dashboard)/
│   ├── layout.tsx                # Dashboard layout (applies to /settings, /profile)
│   ├── layout.server.hook.ts     # Dashboard layout server hook
│   ├── settings/
│   │   └── page.tsx              # → /settings (NOT /dashboard/settings)
│   └── profile/
│       └── page.tsx              # → /profile (NOT /dashboard/profile)
├── (landing)/
│   ├── layout.tsx                # Landing layout (applies to /about, /contact)
│   ├── layout.server.hook.ts     # Landing layout server hook
│   ├── about/
│   │   └── page.tsx              # → /about (NOT /landing/about)
│   └── contact/
│       └── page.tsx              # → /contact (NOT /landing/contact)
└── page.tsx                       # → / (root page)
```

**Layout Order:**

For a page at `app/(dashboard)/settings/page.tsx`, layouts are applied in this order:

1. `app/layout.tsx` (root layout)
2. `app/(dashboard)/layout.tsx` (route group layout)
3. `app/(dashboard)/settings/layout.tsx` (if exists, nested layout)

**Server Hooks:**

Server hooks work the same way with route groups. The execution order is:

1. Root layout hook (`app/layout.server.hook.ts`)
2. Route group layout hook (`app/(dashboard)/layout.server.hook.ts`)
3. Nested layout hooks (if any)
4. Page hook (`app/(dashboard)/settings/page.server.hook.ts`)

**Example:**

```tsx
// app/(dashboard)/layout.tsx
export default function DashboardLayout({ children, user }) {
  return (
    <div className="dashboard">
      <nav>Dashboard Navigation</nav>
      {children}
    </div>
  );
}
```

```tsx
// app/(dashboard)/layout.server.hook.ts
import type { ServerLoader } from "@lolyjs/core";

export const getServerSideProps: ServerLoader = async (ctx) => {
  const user = await getCurrentUser(ctx.req);
  return {
    props: {
      user, // Available to all pages in (dashboard) group
    },
  };
};
```

```tsx
// app/(dashboard)/settings/page.tsx
export default function SettingsPage({ user, settings }) {
  // user comes from (dashboard)/layout.server.hook.ts
  // settings comes from page.server.hook.ts
  return <div>Settings for {user.name}</div>;
}
```

**Important Notes:**
- Route groups are purely organizational - they don't affect URLs
- You cannot have duplicate routes that would result from ignoring route groups
  - ❌ Invalid: `app/(dashboard)/settings/page.tsx` and `app/settings/page.tsx` (both map to `/settings`)
  - ✅ Valid: `app/(dashboard)/settings/page.tsx` and `app/(landing)/settings/page.tsx` (both map to `/settings` - conflict!)
- Route groups work seamlessly with SPA navigation and preloading

**Future: Parallel Routes**

The architecture is prepared for future parallel routes support (e.g., `(modal)`). Route groups can be extended to support special types that render in parallel slots.

### 🔄 URL Rewrites

URL rewrites allow you to rewrite incoming request paths to different destination paths internally, without changing the URL visible in the browser. This is especially useful for multitenancy, API proxying, and other advanced routing scenarios.

**Key Features:**
- Rewrites happen internally - the URL in the browser doesn't change
- Support for dynamic parameters (`:param`, `*` catch-all)
- Conditional rewrites based on host, headers, cookies, or query parameters
- Async destination functions for dynamic rewrites
- High performance with pre-compiled regex patterns and caching

**Configuration:**

Create `rewrites.config.ts` in your project root:

```typescript
import type { RewriteConfig } from "@lolyjs/core";

export default async function rewrites(): Promise<RewriteConfig> {
  return [
    // Static rewrite
    {
      source: "/old-path",
      destination: "/new-path",
    },
    
    // Rewrite with parameters
    {
      source: "/tenant/:tenant*",
      destination: "/app/:tenant*",
    },
    
    // Rewrite with async function (for dynamic logic)
    {
      source: "/api/proxy/:path*",
      destination: async (params, req) => {
        const tenant = extractTenantFromRequest(req);
        return `/api/${tenant}/:path*`;
      },
    },
    
    // Conditional rewrite based on host (multitenant by subdomain)
    {
      source: "/:path*",
      has: [
        { type: "host", value: ":tenant.example.com" },
      ],
      destination: "/project/:tenant/:path*",
    },
  ];
}
```

**Multitenant by Subdomain (Main Use Case):**

The most common use case is multitenancy where each tenant has its own subdomain:

```typescript
// rewrites.config.ts
import type { RewriteConfig } from "@lolyjs/core";

export default async function rewrites(): Promise<RewriteConfig> {
  return [
    // Multitenant by subdomain - catch-all pattern
    // tenant1.example.com/* → /project/tenant1/*
    // tenant2.example.com/* → /project/tenant2/*
    // All routes under the tenant subdomain will be rewritten
    // If a route doesn't exist in /project/[tenantId]/*, it will return 404
    {
      source: "/:path*",
      has: [
        { 
          type: "host", 
          value: ":tenant.example.com"  // Captures tenant from subdomain
        }
      ],
      destination: "/project/:tenant/:path*",
    },
  ];
}
```

**How It Works:**
- User visits: `tenant1.example.com/dashboard`
- Internally rewrites to: `/project/tenant1/dashboard`
- URL visible in browser: `tenant1.example.com/dashboard` (unchanged)
- Route `/project/[tenantId]/dashboard` receives `params.tenantId = "tenant1"`

**Multitenant by Path:**

Alternatively, you can use path-based multitenancy:

```typescript
// rewrites.config.ts
export default async function rewrites(): Promise<RewriteConfig> {
  return [
    // /tenant1/dashboard → /project/tenant1/dashboard
    {
      source: "/:tenant/:path*",
      destination: "/project/:tenant/:path*",
    },
  ];
}
```

**API Proxy Example:**

```typescript
export default async function rewrites(): Promise<RewriteConfig> {
  return [
    // Proxy all /api/proxy/* requests to external API
    {
      source: "/api/proxy/:path*",
      destination: async (params, req) => {
        const externalApi = process.env.EXTERNAL_API_URL;
        return `${externalApi}/${params.path}`;
      },
    },
  ];
}
```

**Conditional Rewrites:**

Rewrites can be conditional based on request properties:

```typescript
export default async function rewrites(): Promise<RewriteConfig> {
  return [
    // Rewrite based on host
    {
      source: "/:path*",
      has: [
        { type: "host", value: "api.example.com" },
      ],
      destination: "/api/:path*",
    },
    
    // Rewrite based on header
    {
      source: "/admin/:path*",
      has: [
        { type: "header", key: "X-Admin-Key", value: "secret" },
      ],
      destination: "/admin-panel/:path*",
    },
    
    // Rewrite based on cookie
    {
      source: "/premium/:path*",
      has: [
        { type: "cookie", key: "premium", value: "true" },
      ],
      destination: "/premium-content/:path*",
    },
    
    // Rewrite based on query parameter
    {
      source: "/:path*",
      has: [
        { type: "query", key: "version", value: "v2" },
      ],
      destination: "/v2/:path*",
    },
  ];
}
```

**Pattern Syntax:**

- `:param` - Named parameter (matches one segment)
- `:param*` - Named catch-all (matches remaining path)
- `*` - Anonymous catch-all (matches remaining path)

**Accessing Extracted Parameters:**

Parameters extracted from rewrites (including from host conditions) are automatically available in:
- `req.query` - Query parameters
- `req.locals` - Request locals (for server hooks)
- `ctx.params` - Route parameters (if the rewritten path matches a dynamic route)

```typescript
// app/project/[tenantId]/dashboard/page.server.hook.ts
export const getServerSideProps: ServerLoader = async (ctx) => {
  // tenantId comes from the rewrite: /project/:tenant/:path*
  const tenantId = ctx.params.tenantId;
  
  // Also available in req.query and req.locals
  const tenantFromQuery = ctx.req.query.tenant;
  const tenantFromLocals = ctx.req.locals?.tenant;
  
  return { props: { tenantId } };
};
```

**Performance & Caching:**

- Rewrites config is loaded once and cached
- Regex patterns are pre-compiled for performance
- In development: File tracking invalidates cache only when `rewrites.config.ts` changes
- In production: Rewrites are loaded from manifest (faster, no async functions)

**Important Notes:**

- Rewrites are applied **before** route matching
- The original URL is preserved in the browser (not a redirect)
- Query parameters are preserved and can be extended
- Rewrites work for both pages and API routes
- Functions in rewrite destinations cannot be serialized in production builds (only static rewrites are included in manifest)
- Rewrites are evaluated in order - the first match wins
- **Behavior**: Rewrites are applied ALWAYS if the source pattern matches, regardless of whether the destination route exists
- If a rewritten route doesn't exist, a 404 will be returned (strict behavior, no fallback to original route)
- Catch-all patterns (`/:path*`) are fully supported and recommended for multitenancy scenarios
- **API Routes**: Can be rewritten. If rewritten route starts with `/api/`, it's handled as API route. Otherwise, it's handled as a page route
- **WSS Routes**: Automatically excluded from rewrites (WebSocket handled separately by Socket.IO)
- System routes (`/static/*`, `/__fw/*`, `/favicon.ico`) are automatically excluded from rewrites

**Validation:**

The framework automatically validates rewrites to prevent:
- Infinite loops (warns if source and destination are identical)
- Duplicate source patterns (warns if multiple rewrites have the same source)

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

### 📄 Static Files & Assets

Loly serves static files from the `public/` directory at the root of your application. This is perfect for SEO files like `sitemap.xml`, `robots.txt`, favicons, and other static assets.

**How it works:**
- Files in `public/` are served at the root URL (e.g., `public/sitemap.xml` → `/sitemap.xml`)
- Static files have **priority over dynamic routes** - if a file exists in `public/`, it will be served instead of matching a route
- Perfect for SEO: Google automatically finds `sitemap.xml` and `robots.txt` at the root
- Works in both development and production environments
- Subdirectories are supported: `public/assets/logo.png` → `/assets/logo.png`

**Directory Structure:**
```
public/
├── sitemap.xml      # Available at /sitemap.xml
├── robots.txt       # Available at /robots.txt
├── favicon.ico      # Available at /favicon.ico (or favicon.png)
├── favicon.png      # Available at /favicon.png (alternative to .ico)
└── assets/
    ├── logo.png     # Available at /assets/logo.png
    └── images/      # Available at /assets/images/*
        └── hero.jpg
```

**Favicon:**
Place your favicon in the `public/` directory as either `favicon.ico` or `favicon.png`. The framework automatically detects and includes it in the HTML head with the correct MIME type:
- `public/favicon.ico` → `/favicon.ico` (type: `image/x-icon`)
- `public/favicon.png` → `/favicon.png` (type: `image/png`)

If both exist, `favicon.ico` takes priority (checked first).

**SEO Example:**

Create `public/sitemap.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2024-01-01</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```

Create `public/robots.txt`:
```
User-agent: *
Allow: /

Sitemap: https://example.com/sitemap.xml
```

Both files will be automatically available at `/sitemap.xml` and `/robots.txt` respectively, and search engines will find them at the standard locations.

**Important Notes:**
- **All static files** (including favicons) must be placed in the `public/` directory
- The framework **only** looks for favicons in `public/` (not in the root or `app/` directory)
- Favicons are automatically detected and included in the HTML `<head>` with the correct MIME type
- Static files have **priority over dynamic routes** - perfect for SEO files

**Configuration:**
The static directory can be customized in `loly.config.ts`:
```tsx
import type { FrameworkConfig } from "@lolyjs/core";

export default {
  directories: {
    static: "public",  // Default: "public"
  },
} satisfies Partial<FrameworkConfig>;
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

### 📊 SEO & Metadata

Loly provides comprehensive metadata support for SEO and social sharing. Metadata can be defined at both layout and page levels, with intelligent merging:

**Layout Metadata (Base/Defaults):**

```tsx
// app/layout.server.hook.ts
import type { ServerLoader } from "@lolyjs/core";

export const getServerSideProps: ServerLoader = async () => {
  return {
    props: { /* ... */ },
    metadata: {
      // Site-wide defaults
      description: "My awesome site",
      lang: "en",
      robots: "index, follow",
      themeColor: "#000000",
      
      // Open Graph defaults
      openGraph: {
        type: "website",
        siteName: "My Site",
        locale: "en_US",
      },
      
      // Twitter Card defaults
      twitter: {
        card: "summary_large_image",
      },
      
      // Custom meta tags
      metaTags: [
        { name: "author", content: "My Name" },
      ],
      
      // Custom link tags (preconnect, etc.)
      links: [
        { rel: "preconnect", href: "https://api.example.com" },
      ],
    },
  };
};
```

**Page Metadata (Overrides Layout):**

```tsx
// app/page.server.hook.ts
import type { ServerLoader } from "@lolyjs/core";

export const getServerSideProps: ServerLoader = async (ctx) => {
  const post = await getPost(ctx.params.slug);
  
  return {
    props: { post },
    metadata: {
      // Page-specific (overrides layout)
      title: `${post.title} | My Site`,
      description: post.excerpt,
      canonical: `https://mysite.com/blog/${post.slug}`,
      
      // Open Graph (inherits type, siteName from layout)
      openGraph: {
        title: post.title,
        description: post.excerpt,
        url: `https://mysite.com/blog/${post.slug}`,
        image: {
          url: post.imageUrl,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      },
      
      // Twitter Card (inherits card type from layout)
      twitter: {
        title: post.title,
        description: post.excerpt,
        image: post.imageUrl,
        imageAlt: post.title,
      },
    },
  };
};
```

**Full Metadata API:**

```tsx
interface PageMetadata {
  // Basic fields
  title?: string;
  description?: string;
  lang?: string;
  canonical?: string;
  robots?: string;
  themeColor?: string;
  viewport?: string;
  
  // Open Graph
  openGraph?: {
    title?: string;
    description?: string;
    type?: string;
    url?: string;
    image?: string | {
      url: string;
      width?: number;
      height?: number;
      alt?: string;
    };
    siteName?: string;
    locale?: string;
  };
  
  // Twitter Cards
  twitter?: {
    card?: "summary" | "summary_large_image" | "app" | "player";
    title?: string;
    description?: string;
    image?: string;
    imageAlt?: string;
    site?: string;
    creator?: string;
  };
  
  // Custom meta tags
  metaTags?: Array<{
    name?: string;
    property?: string;
    httpEquiv?: string;
    content: string;
  }>;
  
  // Custom link tags
  links?: Array<{
    rel: string;
    href: string;
    as?: string;
    crossorigin?: string;
    type?: string;
  }>;
}
```

**Key Features:**

- **Layout + Page Merging**: Layout metadata provides defaults, page metadata overrides specific fields
- **Automatic Updates**: Metadata updates automatically during SPA navigation
- **SSR & SSG Support**: Works in both server-side rendering and static generation
- **Type-Safe**: Full TypeScript support with `PageMetadata` type

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
├── public/                     # Static files (served at root: /sitemap.xml, /robots.txt, etc.)
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
  if (someCondition) {
    return ctx.Redirect("/new-path", true); // permanent redirect
  }

  // Not found
  if (!data) {
    return ctx.NotFound();
  }

  // Return props
  return {
    props: { data },
    metadata: {
      title: "Page Title",
      description: "Page description",
      // See "SEO & Metadata" section above for full metadata options
      // including Open Graph, Twitter Cards, canonical URLs, etc.
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

### WebSocket Event Handler (New API - Realtime v1)

```tsx
import { defineWssRoute } from "@lolyjs/core";
import { z } from "zod";

export default defineWssRoute({
  auth: async (ctx) => {
    // Authenticate user
    return await getUserFromToken(ctx.req.headers.authorization);
  },

  onConnect: (ctx) => {
    console.log("User connected:", ctx.user?.id);
  },

  events: {
    "custom-event": {
      schema: z.object({ message: z.string() }),
      guard: ({ user }) => !!user,
      handler: (ctx) => {
        // Emit to all clients
        ctx.actions.emit("response", { message: "Hello" });

        // Broadcast to all except sender
        ctx.actions.broadcast("notification", ctx.data);

        // Send to specific user
        ctx.actions.toUser(userId).emit("private", ctx.data);

        // Send to room
        ctx.actions.toRoom("room-name").emit("room-message", ctx.data);
      },
    },
  },
});
```
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
import type { FrameworkConfig } from "@lolyjs/core";

// Option 1: Partial config (only specify what you want to change)
export default {
  directories: {
    static: "public",
  },
} satisfies Partial<FrameworkConfig>;

// Option 2: Full config (for strict validation)
// export default {
//   directories: { app: "app", build: ".loly", static: "public" },
//   conventions: { /* ... */ },
//   routing: { /* ... */ },
//   build: { /* ... */ },
//   server: { adapter: "express", port: 3000, host: "localhost" },
//   rendering: { framework: "react", streaming: true, ssr: true, ssg: true },
// } satisfies FrameworkConfig;
```

### Server Configuration

Configure server settings (CORS, rate limiting, WebSocket, etc.) in `loly.config.ts` by exporting a `config` function:

```tsx
// loly.config.ts
import { ServerConfig } from "@lolyjs/core";

export const config = (env: string): ServerConfig => {
  const isDev = env === "development";
  
  return {
    bodyLimit: "1mb",
    corsOrigin: isDev ? "*" : ["https://yourdomain.com"],
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      max: 1000,
      strictMax: 5,
      strictPatterns: ["/api/auth/**"],
    },
    // Realtime (WebSocket) configuration
    realtime: {
      enabled: true,
      // For production, configure allowed origins
      // For development, localhost is auto-allowed
      allowedOrigins: isDev ? undefined : ["https://yourdomain.com"],
      // Optional: Configure Redis for multi-instance scaling
      // scale: {
      //   mode: "cluster",
      //   adapter: { url: "redis://localhost:6379" },
      //   stateStore: { name: "redis", url: "redis://localhost:6379" },
      // },
    },
  };
};
```

**Note:** For local development, Realtime works out of the box without any configuration. The framework automatically allows `localhost` connections. Only configure `allowedOrigins` when deploying to production.

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
# PUBLIC_WS_BASE_URL is optional - defaults to window.location.origin
# Only set if WebSocket server is on a different domain
PUBLIC_WS_BASE_URL=http://localhost:3000
```

**Note:** For WebSocket connections, `PUBLIC_WS_BASE_URL` is optional. By default, `lolySocket` uses `window.location.origin`, so you only need to set it if your WebSocket server is on a different domain than your web app.

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
