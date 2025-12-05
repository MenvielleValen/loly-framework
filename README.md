# Loly Framework

A modern, full-stack React framework built with TypeScript, featuring server-side rendering, file-based routing, and smart client-side caching.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Available Commands](#available-commands)
- [Development Workflow](#development-workflow)
- [Monorepo Structure](#monorepo-structure)

## 🔧 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **pnpm** (v10.24.0 or higher) - This project uses pnpm as the package manager

### Installing pnpm

If you don't have pnpm installed, you can install it globally using one of the following methods:

```bash
# Using npm
npm install -g pnpm

# Using Homebrew (macOS/Linux)
brew install pnpm

# Using standalone script
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

Verify your installation:

```bash
pnpm --version
```

## 🚀 Installation

1. **Clone the repository** (if you haven't already):

```bash
git clone <repository-url>
cd framework
```

2. **Install all dependencies**:

```bash
pnpm install
```

This command will install dependencies for all packages and apps in the monorepo using pnpm workspaces.

## 📁 Project Structure

This is a **pnpm workspace monorepo** with the following structure:

```
framework/
├── apps/                    # Applications
│   ├── space-explorer/      # Main demo application
│   └── chat/                # Chat example application
├── packages/                # Shared packages
│   ├── loly-core/           # Core framework package
│   └── create-loly-app/     # CLI tool for creating new apps
├── docs/                    # Documentation
├── package.json             # Root package.json with workspace scripts
├── pnpm-workspace.yaml      # pnpm workspace configuration
└── pnpm-lock.yaml          # Lockfile for dependencies
```

## 🏁 Getting Started

### Development Mode

To start the development server for the **space-explorer** app (main demo):

```bash
pnpm dev
```

This will:
- Build the `@lolyjs/core` package if needed
- Start the development server with hot-reload
- Open the app at `http://localhost:3000` (or the configured port)

### Building Packages First

If you've made changes to the core package and want to build everything before starting:

```bash
pnpm full-dev
```

This will build all packages and then start the dev server.

## 📜 Available Commands

### Root Level Commands

All commands run from the root directory:

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all dependencies for all packages and apps |
| `pnpm dev` | Start development server for `space-explorer` app |
| `pnpm full-dev` | Build all packages, then start dev server |
| `pnpm build` | Build all packages and apps |
| `pnpm start` | Start production server for `space-explorer` app |
| `pnpm lint` | Run linter on all packages and apps |

### Working with Specific Packages/Apps

Use pnpm filters to run commands on specific workspaces:

#### Build a specific package

```bash
# Build only the core package
pnpm --filter @lolyjs/core build

# Build only the space-explorer app
pnpm --filter space-explorer build
```

#### Run dev for a specific app

```bash
# Run space-explorer app in dev mode
pnpm --filter space-explorer dev

# Run chat app in dev mode
pnpm --filter chat dev
```

#### Install a dependency

```bash
# Add dependency to a specific package/app
pnpm --filter space-explorer add <package-name>

# Add dev dependency
pnpm --filter space-explorer add -D <package-name>

# Add dependency to core package
pnpm --filter @lolyjs/core add <package-name>
```

#### Run scripts in a specific workspace

```bash
# Run any script from a package/app's package.json
pnpm --filter <workspace-name> <script-name>

# Example: Run lint in space-explorer
pnpm --filter space-explorer lint
```

### Using the Init Script

For convenience, there's a helper script to start apps:

```bash
# Start space-explorer in dev mode
node init-example dev space-explorer

# Start space-explorer in production mode
node init-example start space-explorer
```

## 💻 Development Workflow

### 1. Making Changes to Core Package

If you're working on the `@lolyjs/core` package:

1. Make your changes in `packages/loly-core/`
2. Build the package:
   ```bash
   pnpm --filter @lolyjs/core build
   ```
3. The changes will be reflected in apps using `workspace:*` protocol

### 2. Making Changes to an App

1. Navigate to the app directory or use filters:
   ```bash
   cd apps/space-explorer
   # or stay at root and use filters
   ```
2. Make your changes
3. The dev server will hot-reload automatically

### 3. Adding a New Dependency

```bash
# Add to a specific app
pnpm --filter space-explorer add axios

# Add to core package
pnpm --filter @lolyjs/core add zod

# Add to root (shared dev tools)
pnpm add -D -w typescript
```

> **Note**: The `-w` flag adds the dependency to the root workspace, useful for shared dev dependencies.

## 🏗️ Monorepo Structure

### Packages

#### `@lolyjs/core`

The core framework package containing:
- Server runtime
- Client runtime
- React components and hooks
- Build tools
- Router and routing logic

**Location**: `packages/loly-core/`

**Build**: `pnpm --filter @lolyjs/core build`

#### `create-loly-app`

CLI tool for scaffolding new Loly applications.

**Location**: `packages/create-loly-app/`

### Apps

#### `space-explorer`

Main demo application showcasing framework features:
- File-based routing
- Server-side rendering
- Client-side caching and revalidation
- API routes
- Dynamic routes

**Location**: `apps/space-explorer/`

**Dev**: `pnpm --filter space-explorer dev`

**Build**: `pnpm --filter space-explorer build`

#### `chat`

Example chat application.

**Location**: `apps/chat/`

## 🔍 Common pnpm Workspace Commands

### List all workspaces

```bash
pnpm -r list
```

### Run a command in all workspaces

```bash
# Run build in all workspaces
pnpm -r build

# Run lint in all workspaces
pnpm -r lint
```

### Run a command with dependencies

```bash
# Run build, including dependencies
pnpm --filter space-explorer... build
```

### Run a command excluding dependencies

```bash
# Run build only for space-explorer (not its dependencies)
pnpm --filter space-explorer^... build
```

## 🐛 Troubleshooting

### Issues with dependencies

If you encounter dependency issues:

```bash
# Clean install
rm -rf node_modules packages/*/node_modules apps/*/node_modules
rm pnpm-lock.yaml
pnpm install
```

### Build errors

If you see build errors:

1. Make sure all packages are built:
   ```bash
   pnpm build
   ```

2. Clear build artifacts:
   ```bash
   # Clean core package
   rm -rf packages/loly-core/dist
   pnpm --filter @lolyjs/core build
   ```

### Hot reload not working

1. Restart the dev server
2. Clear browser cache
3. Check that files are being watched correctly

## 📚 Additional Resources

- [pnpm Documentation](https://pnpm.io/)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Loly Core README](./packages/loly-core/README.md)

## 🤝 Contributing

1. Make your changes in the appropriate workspace
2. Build affected packages: `pnpm build`
3. Test your changes
4. Submit a pull request

## 📝 Notes

- This project uses **pnpm workspaces** for monorepo management
- All apps depend on `@lolyjs/core` using the `workspace:*` protocol
- The workspace configuration is in `pnpm-workspace.yaml`
- Package versions are managed in individual `package.json` files

---

Happy coding! 🚀

