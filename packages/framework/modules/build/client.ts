import path from "path";
import { rspack, type Configuration, type Compiler } from "@rspack/core";
import { copyStaticAssets, loadAliasesFromTsconfig } from "./utils";

export interface ClientBundlerResult {
  outDir: string;
}

function createClientConfig(
  projectRoot: string,
  mode: "development" | "production"
): { config: Configuration; outDir: string } {
  const clientEntry = path.join(projectRoot, "boostrap.ts");
  const outDir = path.join(projectRoot, ".fw", "client");

  const config: Configuration = {
    mode,
    entry: {
      client: clientEntry,
    },
    output: {
      path: outDir,
      filename: "client.js",          // principal entry
      chunkFilename: "[name].js",     // chunks import() (route-..., 0.js, etc.)
      publicPath: "/static/",
    },
    context: projectRoot,
    resolve: {
      extensions: [".tsx", ".ts", ".jsx", ".js"],
      alias: loadAliasesFromTsconfig(projectRoot),
    },
    module: {
      rules: [
        {
          test: /\.[jt]sx?$/,
          loader: "builtin:swc-loader",
          options: {
            jsc: {
              parser: { syntax: "typescript", tsx: true },
              transform: {
                react: {
                  runtime: "automatic",
                  development: mode === "development",
                  refresh: false,
                },
              },
            },
          },
        },
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
      new rspack.DefinePlugin({
        "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
      }),
      new rspack.CssExtractRspackPlugin({
        filename: "client.css",
      }),
    ],
    // optimization: {
    //   splitChunks: { chunks: "async" },
    // },
    infrastructureLogging: {
      level: "error",
    },
    stats: "minimal",
  };

  return { config, outDir };
}


export function startClientBundler(projectRoot: string): ClientBundlerResult {
  const { config, outDir } = createClientConfig(projectRoot, "development");
  
  copyStaticAssets(projectRoot, outDir);

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

export function buildClientBundle(
  projectRoot: string
): Promise<ClientBundlerResult> {
  const { config, outDir } = createClientConfig(projectRoot, "production");
  const compiler = rspack(config);

  return new Promise<ClientBundlerResult>((resolve, reject) => {
    compiler.run((err, stats) => {
      compiler.close(() => {});

      if (err) {
        console.error("[framework][client] Error en build:", err);
        return reject(err);
      }
      if (!stats) {
        const error = new Error("No stats from Rspack");
        console.error("[framework][client] Error en build:", error);
        return reject(error);
      }
      if (stats.hasErrors()) {
        console.error(
          "[framework][client] Build con errores:\n",
          stats.toString("errors-only")
        );
        return reject(new Error("Client build failed"));
      }

      copyStaticAssets(projectRoot, outDir);

      console.log("[framework][client] Build de cliente OK");
      resolve({ outDir });
    });
  });
}
