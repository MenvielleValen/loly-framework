import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
  },
  dts: true,
  format: ["cjs", "esm"],
  outDir: "dist",
  clean: true,
  splitting: false,
  sourcemap: true,
  target: "node18",

  // "toolings"
  external: ["esbuild", "@rspack/core", "tsx"],
});
