# Loly Framework

A modern, full-stack React framework with file-based routing, server-side rendering (SSR), and static site generation (SSG). Built with React 19, Express, and Rspack for optimal performance and developer experience.

## Features

- 🚀 **File-based Routing** - Automatic route generation from your file structure
- ⚡ **Server-Side Rendering (SSR)** - Fast initial page loads with React 18 streaming
- 📦 **Static Site Generation (SSG)** - Pre-render pages at build time for maximum performance
- 🔌 **API Routes** - Build RESTful APIs alongside your pages
- 🎨 **Layouts** - Nested layouts for shared UI across routes
- 🔄 **Hot Reload** - Instant feedback during development
- 🛠️ **TypeScript** - Full TypeScript support out of the box
- 📦 **Rspack** - Lightning-fast bundling powered by Rust
- 🎯 **Middleware Support** - Route-level and API middleware
- 📊 **Metadata API** - Dynamic SEO and meta tags

## Getting Started

### Installation

```bash
npm install @loly/core
# or
pnpm add @loly/core
# or
yarn add @loly/core
```

### Project Structure

```
your-app/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page (/)
│   ├── about/
│   │   └── page.tsx        # /about page
│   ├── blog/
│   │   ├── layout.tsx      # Blog layout
│   │   └── [slug]/
│   │       ├── page.tsx    # Dynamic route
│   │       └── server.hook.ts  # Server loader
│   └── api/
│       └── posts/
│           └── route.ts     # API endpoint
├── boostrap.ts             # Client entry point
├── init.server.ts          # Server initialization (optional)
└── package.json
```

### Basic Setup

1. **Create your app directory structure:**

```tsx
// app/page.tsx
export default function HomePage() {
  return (
    <main>
      <h1>Welcome to Loly</h1>
    </main>
  );
}
```

2. **Set up the client bootstrap:**

```tsx
// boostrap.ts
import "./app/styles.css";
import { routes } from "./.fw/routes-client";
import { bootstrapClient } from "@loly/core/modules/runtime/client";

bootstrapClient(routes);
```

3. **Add scripts to your `package.json`:**

```json
{
  "scripts": {
    "dev": "loly dev",
    "build": "loly build",
    "start": "loly start"
  }
}
```

4. **Start the development server:**

```bash
npm run dev
# or
loly dev
# or with custom port
loly dev --port 3001
```

The CLI supports the following commands:
- `loly dev` - Start development server with hot reload
- `loly build` - Build the application for production
- `loly start` - Start production server

**CLI Options:**
- `--port <number>` - Server port (default: 3000)
- `--appDir <path>` - App directory relative to root (default: "app")

## Routing

### File-based Routes

Routes are automatically created based on your file structure:

- `app/page.tsx` → `/`
- `app/about/page.tsx` → `/about`
- `app/blog/[slug]/page.tsx` → `/blog/:slug`
- `app/post/[...path]/page.tsx` → `/post/*` (catch-all)

### Dynamic Routes

Use brackets to create dynamic segments:

- `[slug]` - Single dynamic segment
- `[...path]` - Catch-all route
- `[id]/comments/[commentId]` - Multiple dynamic segments

### Layouts

Create nested layouts by adding `layout.tsx` files:

```tsx
// app/layout.tsx (Root layout)
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav>Navigation</nav>
        {children}
      </body>
    </html>
  );
}

// app/blog/layout.tsx (Blog layout)
export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="blog-container">
      <aside>Blog sidebar</aside>
      <main>{children}</main>
    </div>
  );
}
```

## Server-Side Rendering

### Loaders

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
    },
  };
};
```

### Redirects

```tsx
export const getServerSideProps: ServerLoader = async (ctx) => {
  return {
    redirect: {
      destination: "/new-path",
      permanent: true, // 301 redirect
    },
  };
};
```

### Accessing Request Data

```tsx
export const getServerSideProps: ServerLoader = async (ctx) => {
  const { req, res, params, pathname, locals } = ctx;
  
  // Access headers, cookies, etc.
  const userAgent = req.headers["user-agent"];
  
  // Set custom response headers
  res.setHeader("X-Custom-Header", "value");
  
  // Store data in locals (shared across middleware)
  locals.user = await getUser(req);
  
  return { props: {} };
};
```

## Static Site Generation (SSG)

Generate static pages at build time:

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

- `"force-static"` - Always generate static pages
- `"force-dynamic"` - Always use SSR
- `"auto"` - Default, framework decides

## API Routes

Create API endpoints in the `app/api` directory:

```tsx
// app/api/posts/route.ts
import type { ApiContext, ApiMiddleware } from "@loly/core";

// Global middleware for this route
export const beforeApi: ApiMiddleware[] = [
  async (ctx, next) => {
    // Authentication check
    const token = ctx.req.headers.authorization;
    if (!token) {
      ctx.res.status(401).json({ error: "Unauthorized" });
      return;
    }
    ctx.locals.user = await verifyToken(token);
    await next();
  },
];

// Method-specific middleware
export const beforeGET: ApiMiddleware[] = [
  async (ctx, next) => {
    // Logging, rate limiting, etc.
    await next();
  },
];

export async function GET(ctx: ApiContext) {
  const posts = await fetchPosts();
  ctx.res.json({ posts });
}

export async function POST(ctx: ApiContext) {
  const body = ctx.req.body;
  const newPost = await createPost(body);
  ctx.res.status(201).json(newPost);
}
```

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

## Metadata

Set page metadata for SEO:

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
          property: "og:image",
          content: "https://example.com/image.jpg",
        },
      ],
    },
  };
};
```

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

## Production

### Build

```bash
npm run build
# or
loly build
```

This will:
1. Build the client bundle with Rspack
2. Generate static pages (if using SSG)
3. Output to `.fw/client` and `.fw/ssg`

### Start Production Server

```bash
npm run start
# or
loly start
# or with custom port
loly start --port 3000
```

The production server:
- Serves static assets from `.fw/client`
- Serves pre-rendered SSG pages from `.fw/ssg`
- Falls back to SSR for dynamic routes

## TypeScript

Loly is built with TypeScript and provides full type safety:

```tsx
import type {
  ServerContext,
  ServerLoader,
  LoaderResult,
  ApiContext,
  ApiHandler,
  RouteMiddleware,
} from "@loly/core";

// Fully typed server loader
export const getServerSideProps: ServerLoader = async (ctx: ServerContext) => {
  // ctx is fully typed
  const { params, req, res, locals } = ctx;
  // ...
};
```

## Client-Side Navigation

Loly automatically handles client-side navigation for better performance. Use the `Link` component:

```tsx
import { Link } from "@loly/core";

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

## Styling

Loly supports CSS, PostCSS, and CSS-in-JS solutions. Import styles in your components:

```tsx
// app/styles.css
import "./styles.css";

export default function Page() {
  return <div className="container">Content</div>;
}
```

## Examples

Check out the [example app](./apps/example) for a complete working example with:
- Dynamic routes
- API routes
- Middleware
- SSG
- Layouts

## API Reference

### CLI Commands

The `loly` CLI is the recommended way to run your application:

```bash
# Development
loly dev [--port 3000] [--appDir app]

# Build for production
loly build [--appDir app]

# Start production server
loly start [--port 3000] [--appDir app]
```

### Programmatic API

You can also use the functions directly if needed:

#### `startDevServer(options)`

Start the development server programmatically.

```tsx
import { startDevServer } from "@loly/core";

startDevServer({
  port: 3000,
  rootDir: process.cwd(),
  appDir: "app",
});
```

**Options:**
- `port?: number` - Server port (default: 3000)
- `rootDir?: string` - Project root directory
- `appDir?: string` - App directory (default: `rootDir/app`)

#### `startProdServer(options)`

Start the production server programmatically.

```tsx
import { startProdServer } from "@loly/core";

await startProdServer({
  port: 3000,
  rootDir: process.cwd(),
  appDir: "app",
});
```

**Options:**
- `port?: number` - Server port (default: 3000)
- `rootDir?: string` - Project root directory
- `appDir?: string` - App directory (default: `rootDir/app`)

#### `buildApp(options)`

Build the application for production programmatically.

```tsx
import { buildApp } from "@loly/core";

await buildApp({
  rootDir: process.cwd(),
  appDir: "app",
});
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

ISC

## Acknowledgments

Built with:
- [React](https://react.dev/) - UI library
- [Express](https://expressjs.com/) - Web framework
- [Rspack](https://rspack.dev/) - Fast bundler
- [TypeScript](https://www.typescriptlang.org/) - Type safety

