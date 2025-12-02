import { defineConfig } from "tsup";
import { resolve } from "path";

// Convert tsconfig paths to esbuild alias format
// These should match the paths in tsconfig.json
const alias: Record<string, string> = {
  "@src": resolve("./src"),
  "@constants": resolve("./constants"),
  "@components": resolve("./modules/components"),
  "@rendering": resolve("./modules/rendering"),
  "@router": resolve("./modules/router"),
  "@build": resolve("./modules/build"),
  "@dev": resolve("./modules/dev"),
  "@runtime": resolve("./modules/runtime"),
  "@server": resolve("./modules/server"),
  "@font": resolve("./modules/font"),
  "@cache": resolve("./modules/cache"),
  "@security": resolve("./modules/security"),
  "@validation": resolve("./modules/validation"),
  "@logger": resolve("./modules/logger"),
};

export default defineConfig({
  entry: {
    index: "src/index.ts",
    cli: "modules/cli/index.ts",
    ['react/components']: "modules/react/components/index.ts",
    ['react/hooks']: "modules/react/hooks/index.ts",
    ['react/themes']: "modules/react/themes/index.ts",
    ['react/cache']: "modules/react/cache/index.ts",
    ['react/sockets']: "modules/react/sockets/index.ts",
    runtime: "modules/runtime/client/index.tsx",
  },
  dts: true,
  format: ["cjs", "esm"], 
  outDir: "dist",
  clean: true,
  splitting: false,
  sourcemap: true,
  target: "node18",
  platform: "node",

  // Important: generate .cjs for CJS and .js for ESM
  outExtension({ format }) {
    return format === "cjs"
      ? { js: ".cjs" } // index.cjs, cli.cjs
      : { js: ".js" }; // index.js, cli.js
  },

  // Resolve path aliases from tsconfig
  esbuildOptions(options) {
    options.alias = { ...options.alias, ...alias };
  },

  // toolings that you don't want bundled
  external: ["esbuild", "@rspack/core", "tsx"],
});
