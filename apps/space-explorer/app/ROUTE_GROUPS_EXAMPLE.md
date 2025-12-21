# Route Groups Example

This application demonstrates the use of **Route Groups** in Loly Framework.

## What are Route Groups?

Route groups are directories wrapped in parentheses like `(dashboard)` or `(landing)`. They allow you to organize routes without affecting the URL structure.

## Example Structure

```
app/
├── layout.tsx                    # Root layout (applies to all routes)
├── layout.server.hook.ts         # Root layout server hook
│
├── (explore)/                    # Route group for exploration pages
│   ├── layout.tsx                # Layout for explore group
│   ├── layout.server.hook.ts     # Server hook for explore group
│   ├── planets/
│   │   ├── page.tsx              # → /planets (NOT /explore/planets)
│   │   └── [id]/
│   │       └── page.tsx          # → /planets/:id
│   ├── launches/
│   │   ├── page.tsx              # → /launches (NOT /explore/launches)
│   │   └── [id]/
│   │       └── page.tsx          # → /launches/:id
│   └── astronauts/
│       ├── page.tsx              # → /astronauts (NOT /explore/astronauts)
│       └── [id]/
│           └── page.tsx          # → /astronauts/:id
│
└── (info)/                       # Route group for information pages
    ├── layout.tsx                # Layout for info group
    ├── layout.server.hook.ts     # Server hook for info group
    ├── about/
    │   └── page.tsx              # → /about (NOT /info/about)
    └── contact/
        └── page.tsx              # → /contact (NOT /info/contact)
```

## Key Points

1. **Route groups don't appear in URLs**: The `(explore)` and `(info)` groups are purely organizational.

2. **Shared layouts**: Each route group can have its own layout that applies to all routes within that group.

3. **Layout order**: Layouts are applied in this order:
   - Root layout (`app/layout.tsx`)
   - Route group layout (`app/(explore)/layout.tsx` or `app/(info)/layout.tsx`)
   - Nested layouts (if any)
   - Page component

4. **Server hooks**: Each layout can have its own server hook (`layout.server.hook.ts`) that provides props to all pages in that group.

5. **Props merging**: Props are merged in this order:
   - Root layout props (from `app/layout.server.hook.ts`)
   - Route group layout props (from `app/(explore)/layout.server.hook.ts`)
   - Page props (from `app/(explore)/planets/page.server.hook.ts`)

## Try It Out

1. Visit `/planets` - Notice the explore group header with navigation
2. Visit `/about` - Notice the info group header with navigation
3. Visit `/contact` - Same info group layout
4. Check the browser URL - Route groups don't appear!

## Benefits

- **Organization**: Group related routes together
- **Shared layouts**: Apply common styling/functionality to a group
- **Clean URLs**: Keep URLs simple without organizational directories
- **Maintainability**: Easier to manage large applications

## Future: Parallel Routes

The architecture is prepared for future parallel routes support (e.g., `(modal)`). Route groups can be extended to support special types that render in parallel slots.

