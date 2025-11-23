#!/usr/bin/env node
require("tsx/cjs");

const path = require("path");

// 👇 Intentamos cargar la lib ya compilada
let core;
try {
  core = require("../dist/index.js"); // main CJS de @loly/core
} catch (err) {
  console.error(
    "[loly] No se pudo cargar ../dist/index.js. " +
      "¿Corriste `pnpm --filter @loly/core build` primero?"
  );
  console.error(err);
  process.exit(1);
}

// De acá esperamos que salgan estas funciones
const { startDevServer, startProdServer, buildApp } = core;

/**
 * Parseo simple de flags tipo:
 *   --port 3000
 *   --appDir=app
 *   --flag
 */
function parseArgs(argv) {
  try {
    const args = {};

    for (let i = 0; i < argv.length; i++) {
      let arg = argv[i];
      if (!arg.startsWith("--")) continue;

      arg = arg.slice(2);

      if (arg.includes("=")) {
        const [key, ...rest] = arg.split("=");
        args[key] = rest.join("=");
        continue;
      }

      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        args[arg] = next;
        i++;
      } else {
        args[arg] = true;
      }
    }

    return args;
  } catch (error) {
    console.log("Error parse args");
  }
}

function printHelp() {
  console.log(`
loly - CLI para el framework

Uso:
  loly dev   [--port 3000] [--appDir app]
  loly build [--appDir app]
  loly start [--port 3000] [--appDir app]

Opciones:
  --port     Puerto para el servidor HTTP (dev/start)
  --appDir   Directorio de la app relativo al root (default: "app")
`);
}

async function run() {
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
  const appDir = path.resolve(projectRoot, args.appDir || "app");
  const port = args.port ? Number(args.port) : 3000;

  switch (command) {
    case "dev": {
      process.env.NODE_ENV ||= "development";
      startDevServer({ rootDir: projectRoot, appDir, port });
      break;
    }
    case "build": {
      process.env.NODE_ENV ||= "production";
      buildApp({ rootDir: projectRoot, appDir });
      break;
    }
    case "start": {
      process.env.NODE_ENV ||= "production";
      await startProdServer({ rootDir: projectRoot, appDir, port });
      break;
    }
    default:
      console.error(`Comando desconocido: "${command}"\n`);
      printHelp();
      process.exit(1);
  }
}

run().catch((err) => {
  console.error("[loly] Error en CLI:", err);
  process.exit(1);
});
