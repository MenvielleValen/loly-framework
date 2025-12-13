import path from "path";
import fs from "fs";
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

  const envPath = path.join(projectRoot, ".env");
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }

  const publicEnv: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith("PUBLIC_")) {
      publicEnv[`process.env.${key}`] = JSON.stringify(value ?? "");
    }
  }

  // Always define PUBLIC_WS_BASE_URL to prevent "process.env is not defined" errors
  if (!publicEnv["process.env.PUBLIC_WS_BASE_URL"]) {
    publicEnv["process.env.PUBLIC_WS_BASE_URL"] = JSON.stringify(undefined);
  }

  const config: Configuration = {
    mode,
    entry: {
      client: clientEntry,
    },
    output: {
      path: outDir,
      filename: mode === "production" ? "client.[contenthash].js" : "client.js", // Main entry
      chunkFilename: mode === "production" ? "[name].[contenthash].js" : "[name].js", // Code-split chunks (route-..., 0.js, etc.)
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
        // Use mode directly to ensure development mode is correctly set
        // This replaces process.env.NODE_ENV in the client bundle with the literal string value
        "process.env.NODE_ENV": JSON.stringify(mode),
        ...publicEnv,
      }),
      new rspack.CssExtractRspackPlugin({
        filename: mode === "production" ? "client.[contenthash].css" : "client.css",
      }),
    ],
    infrastructureLogging: {
      level: "error",
    },
    stats: "minimal",
  };

  return { config, outDir };
}
