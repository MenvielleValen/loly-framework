import fs from "fs";
import path from "path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { generateDependenciesManifest } from "../dependencies-manifest";
import type { LoadedRoute } from "../index.types";
import { BUILD_FOLDER_NAME } from "@constants/globals";
import { setupTempProject } from "../../build/utils/__tests__/helpers";

describe("generateDependenciesManifest - client components loaders", () => {
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

  it("emits route dependencies and client-component loaders including nested client components", () => {
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

    const chunkMap = { "/": "route-root" };
    generateDependenciesManifest([route], projectRoot, chunkMap);

    const fwDir = path.join(projectRoot, BUILD_FOLDER_NAME);
    const depsManifestPath = path.join(fwDir, "route-dependencies.json");
    const loadersPath = path.join(fwDir, "client-components-loaders.ts");

    expect(fs.existsSync(depsManifestPath)).toBe(true);
    expect(fs.existsSync(loadersPath)).toBe(true);

    const depsContent = JSON.parse(
      fs.readFileSync(depsManifestPath, "utf-8")
    );
    const routeDeps = depsContent.routes["/"];
    expect(routeDeps).toBeTruthy();

    const all = routeDeps.allClientComponents as string[];
    expect(all).toContain("components/ui/theme-switcher.client.tsx");
    expect(all).toContain("components/header/mobile-menu.client.tsx");

    const loadersSource = fs.readFileSync(loadersPath, "utf-8");
    expect(loadersSource).toMatch(
      /"components\/ui\/theme-switcher\.client\.tsx"/
    );
    expect(loadersSource).toMatch(
      /"components\/header\/mobile-menu\.client\.tsx"/
    );
  });
});

