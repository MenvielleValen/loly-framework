import fs from "fs";
import path from "path";
import { rspack, type Configuration } from "@rspack/core";

function loadAliasesFromTsconfig(projectRoot: string): Record<string, string> {
  const tsconfigPath = path.join(projectRoot, "tsconfig.json");
  const aliases: Record<string, string> = {};

  if (!fs.existsSync(tsconfigPath)) {
    // fallback mínimo
    aliases["@app"] = path.resolve(projectRoot, "app");
    return aliases;
  }

  let tsconfig: any;
  try {
    tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf-8"));
  } catch (err) {
    console.warn("[framework] No se pudo leer tsconfig.json:", err);
    aliases["@app"] = path.resolve(projectRoot, "app");
    return aliases;
  }

  const compilerOptions = tsconfig.compilerOptions ?? {};
  const paths = compilerOptions.paths ?? {};
  const baseUrl = compilerOptions.baseUrl ?? ".";

  for (const [aliasPattern, targets] of Object.entries(paths) as [
    string,
    string[]
  ][]) {
    if (!Array.isArray(targets) || targets.length === 0) continue;

    // aliasPattern tipo "@components/*" -> "@components"
    const aliasKey = aliasPattern.replace(/\/\*$/, "");
    const firstTarget = targets[0]; // "components/*"
    const targetPath = firstTarget.replace(/\/\*$/, "");

    const resolved = path.resolve(projectRoot, baseUrl, targetPath);
    aliases[aliasKey] = resolved;
  }

  // fallback razonable por si el user no define @app
  if (!aliases["@app"]) {
    aliases["@app"] = path.resolve(projectRoot, "app");
  }

  return aliases;
}


export interface ClientBundlerResult {
  outDir: string;
}

/**
 * Inicia Rspack en modo watch para bundlear el cliente.
 * - Entry: <projectRoot>/client/root.tsx
 * - Output: <projectRoot>/.fw/client/client.js
 * - Se sirve desde /static/client.js
 */
export function startClientBundler(projectRoot: string): ClientBundlerResult {
  const clientEntry = path.join(projectRoot, "client", "root.tsx");
  const outDir = path.join(projectRoot, ".fw", "client");

  const aliases = loadAliasesFromTsconfig(projectRoot);

  const config: Configuration = {
    mode: "development",
    entry: {
      client: clientEntry,
    },
    output: {
      path: outDir,
      filename: "client.js",
      publicPath: "/static/",
    },
    context: projectRoot,
    resolve: {
      extensions: [".tsx", ".ts", ".jsx", ".js"],
      alias: aliases,
    },
    module: {
      rules: [
        {
          test: /\.[jt]sx?$/,
          loader: "builtin:swc-loader",
          options: {
            jsc: {
              parser: {
                syntax: "typescript",
                tsx: true,
              },
              transform: {
                react: {
                  runtime: "automatic",
                  development: true,
                  refresh: false,
                },
              },
            },
          },
        },
        // ⭐ Nuevo: usamos el extractor de CSS de Rspack
        {
          test: /\.css$/,
          use: [
            rspack.CssExtractRspackPlugin.loader,
            "css-loader",
            "postcss-loader",
          ],
        },
      ],
    },
    plugins: [
      new rspack.CssExtractRspackPlugin({
        filename: "client.css", // quedará en .fw/client/client.css
      }),
    ],
    infrastructureLogging: {
      level: "error",
    },
    stats: "minimal",
  };

  const compiler = rspack(config);

  compiler.watch({}, (err, stats) => {
    if (err) {
      console.error("[framework][client] Rspack error:", err);
      return;
    }
    if (!stats) return;
    if (stats.hasErrors()) {
      console.error(
        "[framework][client] Build con errores:\n",
        stats.toString("errors-only")
      );
    } else {
      console.log("[framework][client] Bundle actualizado");
    }
  });

  return { outDir };
}
