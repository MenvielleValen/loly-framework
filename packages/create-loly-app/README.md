# create-loly-app

Scaffold a new Loly application with a single command.

**Homepage**: https://loly.dev/

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

# Using a specific template
npx create-loly-app my-app --template template
```

If you don't provide a project name, you'll be prompted to enter one.

### Template Selection

You can specify a template using the `--template` flag:

```bash
npx create-loly-app my-app --template template
```

If no template is specified, the default `template` will be used.

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

## Resources

- **Documentation**: https://loly.dev/
- **GitHub**: https://github.com/MenvielleValen/loly-framework

## How it works

The CLI downloads the template directly from the GitHub repository. It automatically:
- Fetches the latest version of `@lolyjs/core` from npm
- Downloads the template from the repository
- Copies all necessary files
- Installs dependencies
- Builds the project

