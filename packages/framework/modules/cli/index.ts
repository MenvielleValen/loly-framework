// src/cli/index.ts


// Register tsx so Node can require/import TypeScript config files
// like `loly.config.ts` from CJS entrypoints.
declare const require: any;

try {
  if (typeof require !== "undefined") {
    require("tsx/cjs");
  }
} catch {
  // If tsx is not installed for some reason, we just skip it.
  // The framework will then only work with plain JS configs.
}


import path from "path";
import process from "process";
import type {
  StartDevServerOptions,
  StartProdServerOptions,
} from "../../src/server";
import type { BuildAppOptions } from "../build";
import { buildApp } from"../build";
import { startDevServer, startProdServer } from "../../src/index";

/**
 * Shape of parsed CLI flags.
 *
 * Example:
 *   --port 3000   -> { port: "3000" }
 *   --appDir=app  -> { appDir: "app" }
 *   --flag        -> { flag: true }
 */
type CliFlags = Record<string, string | boolean>;

/**
 * Very small flag parser for patterns like:
 *   --port 3000
 *   --appDir=app
 *   --flag
 */
function parseArgs(argv: string[]): CliFlags {
  const args: CliFlags = {};

  for (let i = 0; i < argv.length; i++) {
    let arg = argv[i];
    if (!arg.startsWith("--")) continue;

    // Strip leading "--"
    arg = arg.slice(2);

    // Handle "--key=value"
    if (arg.includes("=")) {
      const [key, ...rest] = arg.split("=");
      args[key] = rest.join("=");
      continue;
    }

    // Handle "--key value" or boolean flag
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      args[arg] = next;
      i++; // skip value
    } else {
      args[arg] = true;
    }
  }

  return args;
}

/**
 * Print high-level usage and options.
 */
function printHelp(): void {
  console.log(`
loly - CLI for the framework

Usage:
  loly dev   [--port 3000] [--appDir app]
  loly build [--appDir app]
  loly start [--port 3000] [--appDir app]

Options:
  --port     HTTP port for the dev/prod server (default: 3000)
  --appDir   App directory relative to project root (default: "app")
`);
}

/**
 * Main CLI entrypoint.
 *
 * Supported commands:
 *   - dev
 *   - build
 *   - start
 */
async function run(): Promise<void> {
  const argv = process.argv.slice(2);
  const command = argv[0];

  if (
    !command ||
    command === "help" ||
    command === "--help" ||
    command === "-h"
  ) {
    printHelp();
    return;
  }

  const args = parseArgs(argv.slice(1));

  const projectRoot = process.cwd();
  const appDir = path.resolve(projectRoot, (args.appDir as string) || "app");
  const port =
    typeof args.port === "string" && args.port.trim().length > 0
      ? Number(args.port)
      : 3000;

  switch (command) {
    case "dev": {
      // Set a sensible default environment
      process.env.NODE_ENV ||= "development";

      const options: StartDevServerOptions = {
        rootDir: projectRoot,
        appDir,
        port,
      };

      startDevServer(options);
      break;
    }

    case "build": {
      process.env.NODE_ENV ||= "production";

      const options: BuildAppOptions = {
        rootDir: projectRoot,
        appDir,
      };

      await buildApp(options);
      
      // Force exit to ensure process terminates after build
      // This prevents hanging due to open handles from loaded modules
      process.exit(0);
      break;
    }

    case "start": {
      process.env.NODE_ENV ||= "production";

      const options: StartProdServerOptions = {
        rootDir: projectRoot,
        appDir,
        port,
      };

      await startProdServer(options);
      break;
    }

    default: {
      console.error(`Unknown command: "${command}"\n`);
      printHelp();
      process.exit(1);
    }
  }
}

run().catch((err) => {
  console.error("[loly] CLI error:", err);
  process.exit(1);
});
