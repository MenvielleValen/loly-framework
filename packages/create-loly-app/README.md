# create-loly-app

Scaffold a new Loly application with a single command.

## Usage

```bash
# Using npx
npx create-loly-app my-app

# Using pnpm
pnpm create loly-app my-app

# Using npm
npm create loly-app my-app

# Using yarn
yarn create loly-app my-app
```

If you don't provide a project name, you'll be prompted to enter one.

## What it does

- Creates a new directory with your project name
- Copies the Loly template with all necessary files
- Configures `package.json` with your project name
- Installs all dependencies automatically
- Sets up TypeScript, Tailwind CSS, and all required configurations

## Next steps

After creating your project:

```bash
cd my-app
pnpm dev  # or npm run dev, yarn dev
```

## Requirements

- Node.js 18+ 
- A package manager (pnpm, npm, or yarn)

## Development

To update the template used by `create-loly-app`, run:

```bash
cd packages/create-loly-app
pnpm copy-template
```

This copies the latest template from `apps/template` to `packages/create-loly-app/template`.

