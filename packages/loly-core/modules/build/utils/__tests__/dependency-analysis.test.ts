import path from "path";
import fs from "fs";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { RecursiveDependencyAnalyzer } from "../dependency-analysis";
import type { LoadedRoute } from "@router/index";
import { setupTempProject } from "./helpers";
import { extractImports, resolveImportPath, filterLocalImports } from "../import-extractor";
import { isClientComponentFile } from "../detect-client-components";

describe("RecursiveDependencyAnalyzer - client components", () => {
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

  it("detects client components imported via Header in layout chain", () => {
    const route: LoadedRoute = {
      pattern: "/",
      regex: /^\/$/,
      paramNames: [],
      component: () => null,
      layouts: [],
      pageFile: path.join(projectRoot, "app/page.tsx"),
      layoutFiles: [path.join(projectRoot, "app/layout.tsx")],
      middlewares: [],
      loader: null,
      layoutServerHooks: [],
      layoutMiddlewares: [],
      dynamic: "auto",
      generateStaticParams: null,
    };


    const analyzer = new RecursiveDependencyAnalyzer();
    const deps = analyzer.analyze(route, {
      projectRoot,
      depth: Infinity,
      followBarrelExports: true,
      includeTransitive: true,
    });

    const all = deps.allClientComponents.map((p) =>
      path.relative(projectRoot, p).replace(/\\/g, "/")
    );
    
    expect(all).toContain("components/ui/theme-switcher.client.tsx");
    expect(all).toContain("components/header/mobile-menu.client.tsx");
    expect(new Set(all).size).toBe(all.length); // no duplicates
  });

  it.skip("handles client components that import other client components (nested)", () => {
    // Create a test scenario where a client component imports another client component
    const nestedClientPath = path.join(projectRoot, "components/nested-client.client.tsx");
    const baseClientPath = path.join(projectRoot, "components/base-client.client.tsx");
    
    fs.writeFileSync(nestedClientPath, `
      import { BaseClient } from "./base-client.client";
      export const NestedClient = () => <BaseClient />;
    `);
    
    fs.writeFileSync(baseClientPath, `
      export const BaseClient = () => <div>Base</div>;
    `);

    // Update header to import nested client
    const headerPath = path.join(projectRoot, "components/header/index.tsx");
    const headerContent = fs.readFileSync(headerPath, "utf-8");
    fs.writeFileSync(headerPath, headerContent + `\nimport { NestedClient } from "../nested-client.client";`);

    const route: LoadedRoute = {
      pattern: "/",
      regex: /^\/$/,
      paramNames: [],
      component: () => null,
      layouts: [],
      pageFile: path.join(projectRoot, "app/page.tsx"),
      layoutFiles: [path.join(projectRoot, "app/layout.tsx")],
      middlewares: [],
      loader: null,
      layoutServerHooks: [],
      layoutMiddlewares: [],
      dynamic: "auto",
      generateStaticParams: null,
    };

    const analyzer = new RecursiveDependencyAnalyzer();
    const deps = analyzer.analyze(route, {
      projectRoot,
      depth: Infinity,
      followBarrelExports: true,
      includeTransitive: true,
    });

    const all = deps.allClientComponents.map((p) =>
      path.relative(projectRoot, p).replace(/\\/g, "/")
    );

    // Should include both nested and base client components
    expect(all).toContain("components/nested-client.client.tsx");
    expect(all).toContain("components/base-client.client.tsx");
  });

  it("handles duplicate client components (same component imported from multiple places)", () => {
    // Create a scenario where the same client component is imported from multiple places
    const sharedClientPath = path.join(projectRoot, "components/shared/button.client.tsx");
    fs.mkdirSync(path.dirname(sharedClientPath), { recursive: true });
    fs.writeFileSync(sharedClientPath, `export const Button = () => <button>Click</button>;`);

    // Import from header
    const headerPath = path.join(projectRoot, "components/header/index.tsx");
    const headerContent = fs.readFileSync(headerPath, "utf-8");
    fs.writeFileSync(headerPath, headerContent + `\nimport { Button } from "../shared/button.client";`);

    // Also import from page
    const pagePath = path.join(projectRoot, "app/page.tsx");
    const pageContent = fs.readFileSync(pagePath, "utf-8");
    fs.writeFileSync(pagePath, pageContent + `\nimport { Button } from "@/components/shared/button.client";`);

    const route: LoadedRoute = {
      pattern: "/",
      regex: /^\/$/,
      paramNames: [],
      component: () => null,
      layouts: [],
      pageFile: pagePath,
      layoutFiles: [path.join(projectRoot, "app/layout.tsx")],
      middlewares: [],
      loader: null,
      layoutServerHooks: [],
      layoutMiddlewares: [],
      dynamic: "auto",
      generateStaticParams: null,
    };

    const analyzer = new RecursiveDependencyAnalyzer();
    const deps = analyzer.analyze(route, {
      projectRoot,
      depth: Infinity,
      followBarrelExports: true,
      includeTransitive: true,
    });

    const all = deps.allClientComponents.map((p) =>
      path.relative(projectRoot, p).replace(/\\/g, "/")
    );

    // Should contain the shared component only once (no duplicates)
    const buttonCount = all.filter(p => p === "components/shared/button.client.tsx").length;
    expect(buttonCount).toBe(1);
    expect(all).toContain("components/shared/button.client.tsx");
  });

  it.skip("handles circular dependencies gracefully", () => {
    // Create circular dependency: client-a imports client-b, client-b imports client-a
    const clientAPath = path.join(projectRoot, "components/client-a.client.tsx");
    const clientBPath = path.join(projectRoot, "components/client-b.client.tsx");
    
    fs.writeFileSync(clientAPath, `
      import { ClientB } from "./client-b.client";
      export const ClientA = () => <ClientB />;
    `);
    
    fs.writeFileSync(clientBPath, `
      import { ClientA } from "./client-a.client";
      export const ClientB = () => <ClientA />;
    `);

    // Import client-a from header
    const headerPath = path.join(projectRoot, "components/header/index.tsx");
    const headerContent = fs.readFileSync(headerPath, "utf-8");
    fs.writeFileSync(headerPath, headerContent + `\nimport { ClientA } from "../client-a.client";`);

    const route: LoadedRoute = {
      pattern: "/",
      regex: /^\/$/,
      paramNames: [],
      component: () => null,
      layouts: [],
      pageFile: path.join(projectRoot, "app/page.tsx"),
      layoutFiles: [path.join(projectRoot, "app/layout.tsx")],
      middlewares: [],
      loader: null,
      layoutServerHooks: [],
      layoutMiddlewares: [],
      dynamic: "auto",
      generateStaticParams: null,
    };

    const analyzer = new RecursiveDependencyAnalyzer();
    const deps = analyzer.analyze(route, {
      projectRoot,
      depth: Infinity,
      followBarrelExports: true,
      includeTransitive: true,
    });

    const all = deps.allClientComponents.map((p) =>
      path.relative(projectRoot, p).replace(/\\/g, "/")
    );

    // Should detect both components but not get stuck in infinite loop
    expect(all).toContain("components/client-a.client.tsx");
    expect(all).toContain("components/client-b.client.tsx");
    // Should not have duplicates (seen set should prevent re-processing)
    const aCount = all.filter(p => p === "components/client-a.client.tsx").length;
    const bCount = all.filter(p => p === "components/client-b.client.tsx").length;
    expect(aCount).toBe(1);
    expect(bCount).toBe(1);
  });

  it("does not include node_modules dependencies", () => {
    // Even if a file imports something that looks like a client component from node_modules, it shouldn't be included
    const headerPath = path.join(projectRoot, "components/header/index.tsx");
    const headerContent = fs.readFileSync(headerPath, "utf-8");
    // Add an import that looks like it could be a client component but is from node_modules
    fs.writeFileSync(headerPath, headerContent + `\nimport { SomeComponent } from "some-package/component.client";`);

    const route: LoadedRoute = {
      pattern: "/",
      regex: /^\/$/,
      paramNames: [],
      component: () => null,
      layouts: [],
      pageFile: path.join(projectRoot, "app/page.tsx"),
      layoutFiles: [path.join(projectRoot, "app/layout.tsx")],
      middlewares: [],
      loader: null,
      layoutServerHooks: [],
      layoutMiddlewares: [],
      dynamic: "auto",
      generateStaticParams: null,
    };

    const analyzer = new RecursiveDependencyAnalyzer();
    const deps = analyzer.analyze(route, {
      projectRoot,
      depth: Infinity,
      followBarrelExports: true,
      includeTransitive: true,
    });

    const all = deps.allClientComponents.map((p) =>
      path.relative(projectRoot, p).replace(/\\/g, "/")
    );

    // Should not include anything from node_modules
    expect(all.every(p => !p.includes("node_modules"))).toBe(true);
  });
});

