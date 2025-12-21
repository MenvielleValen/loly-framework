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

## Learn More

- [Loly Framework Documentation](https://github.com/MenvielleValen/loly-framework/blob/main/packages/loly-core/README.md)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [React Documentation](https://react.dev)

## License

ISC
