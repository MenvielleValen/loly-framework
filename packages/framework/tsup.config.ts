import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    cli: "modules/cli/index.ts",
    ['react/components']: "modules/react/components/index.ts",
    ['react/hooks']: "modules/react/hooks/index.ts",
    ['react/themes']: "modules/react/themes/index.ts",
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

  // toolings that you don't want bundled
  external: ["esbuild", "@rspack/core", "tsx"],
});
