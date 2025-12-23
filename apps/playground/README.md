# Loly Framework Template

A modern, production-ready starter template for building applications with [Loly Framework](https://github.com/MenvielleValen/loly-framework).

## Features

- ⚡ **Fast Development** - Hot reload and optimized build with Rspack
- 🎨 **Modern UI** - Tailwind CSS v4 with dark mode support
- 🔒 **Type Safe** - Full TypeScript support throughout
- 📱 **Responsive** - Mobile-first design
- 🌙 **Theme Support** - Built-in light/dark theme switching
- 🎯 **Best Practices** - Follows Loly Framework conventions

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm 8+ (recommended) or npm/yarn

### Installation

1. Copy this template to your project directory:

```bash
cp -r apps/template my-app
cd my-app
```

2. Install dependencies:

```bash
pnpm install
```

3. Start the development server:

```bash
pnpm dev
```

The app will be available at `http://localhost:3000`.

### Build for Production

```bash
pnpm build
pnpm start
```

## Project Structure

```
template/
├── app/                    # Application routes and pages
│   ├── layout.tsx          # Root layout component
│   ├── layout.server.hook.ts  # Layout server-side data
│   ├── page.tsx            # Home page
│   ├── page.server.hook.ts # Home page server-side data
│   ├── styles.css          # Global styles and theme variables
│   ├── _error.tsx          # Error page
│   └── _not-found.tsx      # 404 page
├── components/             # React components
│   └── shared/             # Shared components (ThemeSwitch, etc.)
├── public/                 # Static files (SEO, assets)
│   ├── sitemap.xml         # Sitemap for search engines
│   ├── robots.txt          # Robots.txt for crawlers
│   └── README.md           # Static files guide
├── loly.config.ts          # Loly Framework server configuration
├── tailwind.config.js      # Tailwind CSS configuration
├── postcss.config.js       # PostCSS configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Dependencies and scripts
```

## Key Concepts

### File-Based Routing

Pages are created in the `app/` directory. The file structure determines the route:

- `app/page.tsx` → `/`
- `app/about/page.tsx` → `/about`
- `app/blog/[id]/page.tsx` → `/blog/:id`

### Server Hooks

Server-side data fetching is done through server hooks:

- `app/layout.server.hook.ts` - Data available to layout and all pages
- `app/page.server.hook.ts` - Data specific to a page

Example:

```typescript
// app/page.server.hook.ts
import type { ServerLoader } from "@lolyjs/core";

export const getServerSideProps: ServerLoader = async () => {
  return {
    props: {
      data: "Hello from server!",
    },
    metadata: {
      title: "My Page",
      description: "Page description",
    },
  };
};
```

### Styling

This template uses **Tailwind CSS v4** with a custom theme system. Important rules:

- ❌ **DO NOT** use inline styles in components
- ✅ **DO** use Tailwind utility classes
- ✅ **DO** define custom styles in `app/styles.css`

### Components

Components are organized in `components/shared/`:

- Shared application components (ThemeSwitch, etc.)

### Theme System

The template includes a complete theme system with:

- Light and dark modes
- CSS custom properties for colors
- Theme switcher component
- Automatic theme persistence

Theme variables are defined in `app/styles.css` and can be customized.

## Customization

### Changing the App Name

Update `app/layout.server.hook.ts`:

```typescript
props: {
  appName: "My Awesome App",
  // ...
}
```

### Adding Navigation Items

Update the `navigation` array in `app/layout.server.hook.ts`:

```typescript
navigation: [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
],
```

### Customizing Colors

Edit the CSS variables in `app/styles.css`:

```css
:root {
  --primary: oklch(0.55 0.22 240);
  /* ... */
}
```

### Adding API Routes

Create files in `app/api/`:

```typescript
// app/api/hello/route.ts
import type { ApiContext } from "@lolyjs/core";

export async function GET(ctx: ApiContext) {
  return ctx.Response({ message: "Hello from API!" });
}
```

### Adding WebSocket Routes

Create files in `app/wss/`:

```typescript
// app/wss/chat/events.ts
import { defineWssRoute } from "@lolyjs/core";

export default defineWssRoute({
  events: {
    message: {
      handler: (ctx) => {
        ctx.actions.broadcast("message", ctx.data);
      },
    },
  },
});
```

### Static Files (SEO & Assets)

Files in the `public/` directory are served at the root URL. This is perfect for SEO files and static assets:

- `public/sitemap.xml` → `/sitemap.xml`
- `public/robots.txt` → `/robots.txt`
- `public/favicon.ico` → `/favicon.ico`
- `public/assets/logo.png` → `/assets/logo.png`

**Important:** Static files have **priority over dynamic routes**. If a file exists in `public/`, it will be served instead of matching a route.

**Example files included:**
- `public/sitemap.xml` - Update with your site URLs
- `public/robots.txt` - Configure for search engines

See `public/README.md` for more details.

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server

## Dependencies

### Core

- `@lolyjs/core` - Loly Framework core
- `react` & `react-dom` - React library

### UI

- `tailwindcss` - Utility-first CSS framework
- `lucide-react` - Icon library

## Testing Catch-All Routes

This playground includes examples and test cases for catch-all routes to verify that `req.originalUrl` and `req.params` are automatically set correctly.

### Test Page

Visit `/examples/catch-all-routes` to see all test cases with clickable links.

### Manual Test Cases

#### Case 1: Simple catch-all route
- **URL**: `GET /api/catch-all/test/path/here`
- **Expected**:
  - `ctx.params.path` = `"test/path/here"`
  - `ctx.req.originalUrl` = `"/api/catch-all/test/path/here"`
  - `ctx.req.params.path` = `"test/path/here"`

#### Case 2: Catch-all with query string
- **URL**: `GET /api/catch-all/test?foo=bar&baz=qux`
- **Expected**:
  - `ctx.params.path` = `"test"`
  - `ctx.req.originalUrl` = `"/api/catch-all/test?foo=bar&baz=qux"`
  - `ctx.req.query.foo` = `"bar"`

#### Case 3: Normal parameter + catch-all
- **URL**: `GET /api/files/123/documents/reports/2024`
- **Expected**:
  - `ctx.params.id` = `"123"`
  - `ctx.params.path` = `"documents/reports/2024"`
  - `ctx.req.originalUrl` = `"/api/files/123/documents/reports/2024"`
  - `ctx.req.params.id` = `"123"`
  - `ctx.req.params.path` = `"documents/reports/2024"`

#### Case 4: Normal route (without catch-all) - verify it doesn't break
- **URL**: `GET /api/posts/456`
- **Route**: `app/api/posts/[id]/route.ts`
- **Expected**:
  - `ctx.params.id` = `"456"`
  - `ctx.req.originalUrl` = `"/api/posts/456"`
  - `ctx.req.params.id` = `"456"`

#### Case 5: Empty catch-all (base route)
- **URL**: `GET /api/catch-all`
- **Expected**:
  - `ctx.params.path` = `""` or `undefined`
  - `ctx.req.originalUrl` = `"/api/catch-all"`

#### Case 6: Catch-all with hyphens (important for auth routes)
- **URL**: `GET /api/catch-all/sign-in/social/google`
- **Expected**:
  - `ctx.params.path` = `"sign-in/social/google"`
  - `ctx.req.originalUrl` = `"/api/catch-all/sign-in/social/google"`
  - `ctx.req.params.path` = `"sign-in/social/google"`

#### Case 7: Catch-all with hyphens and query string
- **URL**: `GET /api/catch-all/callback/google?code=123&state=abc`
- **Expected**:
  - `ctx.params.path` = `"callback/google"`
  - `ctx.req.originalUrl` = `"/api/catch-all/callback/google?code=123&state=abc"`
  - `ctx.req.query.code` = `"123"`

### How to Verify

1. Click on each test case link in the test page
2. Verify that the JSON response contains:
   - `originalUrl` should contain the full path
   - `reqParams` should contain the captured parameters
   - `path` (for catch-all) should contain all captured segments
3. For cases with query strings, verify that query parameters are present
4. For cases with hyphens, verify that hyphens are preserved correctly

## Learn More

- [Loly Framework Documentation](https://github.com/MenvielleValen/loly-framework/blob/main/packages/loly-core/README.md)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [React Documentation](https://react.dev)

## License

ISC
