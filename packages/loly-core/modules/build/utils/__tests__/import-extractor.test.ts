import path from "path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolveImportPath } from "../import-extractor";
import fs from "fs";
import { setupTempProject } from "./helpers";

describe("resolveImportPath", () => {
  let projectRoot: string;
  let cleanup: () => void;

  beforeEach(() => {
    const tmp = setupTempProject();
    projectRoot = tmp.projectRoot;
    cleanup = tmp.cleanup;
  });

  afterEach(() => {
    cleanup();
  });

  it("resolves @components alias to client component file", () => {
    const fromFile = path.join(
      projectRoot,
      "components/header/index.tsx"
    );
    const importPath = "@components/ui/theme-switcher.client";

    const resolved = resolveImportPath(
      importPath,
      fromFile,
      projectRoot
    );

    const expected = path.join(
      projectRoot,
      "components/ui/theme-switcher.client.tsx"
    );
    expect(resolved).toBe(expected);
    expect(fs.existsSync(resolved!)).toBe(true);
  });

  it("resolves @/ alias to directory index", () => {
    const fromFile = path.join(projectRoot, "app/layout.tsx");
    const importPath = "@/components/header";

    const resolved = resolveImportPath(
      importPath,
      fromFile,
      projectRoot
    );

    const expected = path.join(
      projectRoot,
      "components/header/index.tsx"
    );
    expect(resolved).toBe(expected);
    expect(fs.existsSync(resolved!)).toBe(true);
  });

  it("resolves relative client component import from header", () => {
    const fromFile = path.join(
      projectRoot,
      "components/header/index.tsx"
    );
    const importPath = "./mobile-menu.client";

    const resolved = resolveImportPath(
      importPath,
      fromFile,
      projectRoot
    );

    const expected = path.join(
      projectRoot,
      "components/header/mobile-menu.client.tsx"
    );
    expect(resolved).toBe(expected);
    expect(fs.existsSync(resolved!)).toBe(true);
  });
});

