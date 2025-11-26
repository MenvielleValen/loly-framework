import path from "path";
import { rspack, type Configuration } from "@rspack/core";
import { loadAliasesFromTsconfig } from "../utils";
import dotenv from 'dotenv';
import { BUILD_FOLDER_NAME, STATIC_PATH } from "@constants/globals";

/**
 * Creates Rspack configuration for client bundle.
 *
 * @param projectRoot - Root directory of the project
 * @param mode - Build mode ('development' or 'production')
 * @returns Rspack configuration and output directory
 *
 * @example
 * const { config, outDir } = createClientConfig('/path/to/project', 'production');
 */
export function createClientConfig(
  projectRoot: string,
  mode: "development" | "production"
): { config: Configuration; outDir: string } {
  const buildDir = path.join(projectRoot, BUILD_FOLDER_NAME);
  const clientEntry = path.join(buildDir, "boostrap.ts");
  const outDir = path.join(buildDir, "client");

  dotenv.config({
    path: projectRoot,
  });

  const publicEnv: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith("PUBLIC_")) {
      publicEnv[`process.env.${key}`] = JSON.stringify(value ?? "");
    }
  }

  const config: Configuration = {
    mode,
    entry: {
      client: clientEntry,
    },
    output: {
      path: outDir,
      filename: "client.js", // Main entry
      chunkFilename: "[name].js", // Code-split chunks (route-..., 0.js, etc.)
      publicPath: `${STATIC_PATH}/`,
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
        ...publicEnv,
      }),
      new rspack.CssExtractRspackPlugin({
        filename: "client.css",
      }),
    ],
    infrastructureLogging: {
      level: "error",
    },
    stats: "minimal",
  };

  return { config, outDir };
}
