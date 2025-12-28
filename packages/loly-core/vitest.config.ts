import { defineConfig } from "vitest/config";
import path from "path";

const resolvePath = (relativePath: string): string =>
  path.resolve(__dirname, relativePath);

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: [
      "modules/**/*.test.ts",
      "modules/**/*.test.tsx",
      "modules/**/*.spec.ts",
      "modules/**/*.spec.tsx",
    ],
    coverage: {
      provider: "v8",
    },
  },
  resolve: {
    alias: {
      "@src": resolvePath("src"),
      "@constants": resolvePath("constants"),
      "@rendering": resolvePath("modules/rendering"),
      "@realtime": resolvePath("modules/realtime"),
      "@router": resolvePath("modules/router"),
      "@build": resolvePath("modules/build"),
      "@dev": resolvePath("modules/dev"),
      "@runtime": resolvePath("modules/runtime"),
      "@server": resolvePath("modules/server"),
      "@font": resolvePath("modules/font"),
      "@cache": resolvePath("modules/cache"),
      "@react": resolvePath("modules/react"),
      "@security": resolvePath("modules/security"),
      "@validation": resolvePath("modules/validation"),
      "@logger": resolvePath("modules/logger"),
    },
  },
});

