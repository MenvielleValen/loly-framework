import fs from "fs";
import path from "path";
import type { RewriteRule } from "./rewrites";
import type { RewritesManifest } from "./rewrites-loader";
import { createRewriteLoader } from "./rewrites-loader";
import { BUILD_FOLDER_NAME } from "@constants/globals";

/**
 * Writes the rewrites manifest JSON file.
 * 
 * This manifest contains only data (no functions) and is:
 * - Readable by Node without compiling TypeScript
 * - Usable by the production server
 * 
 * Note: Functions in rewrite destinations cannot be serialized,
 * so only static rewrites are included in the manifest.
 * 
 * @param projectRoot - Root directory of the project
 */
export async function writeRewritesManifest(
  projectRoot: string
): Promise<void> {
  const buildDir = path.join(projectRoot, BUILD_FOLDER_NAME);
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }

  const manifestPath = path.join(buildDir, "rewrites-manifest.json");

  // Load rewrites using filesystem loader (dev mode)
  const loader = createRewriteLoader(projectRoot, true);
  const compiledRewrites = await loader.loadRewrites();

  // Convert compiled rewrites back to rules (for serialization)
  // Note: Functions cannot be serialized, so we filter them out
  const serializableRules: RewriteRule[] = [];

  for (const compiled of compiledRewrites) {
    // Only include static destinations (functions cannot be serialized)
    if (typeof compiled.destination === "string") {
      serializableRules.push({
        source: compiled.source,
        destination: compiled.destination,
        has: compiled.has,
      });
    } else {
      // Warn about functions that cannot be serialized
      console.warn(
        `[framework][build] Rewrite with source "${compiled.source}" has a function destination and will not be included in the manifest. ` +
        `Only static rewrites are supported in production builds.`
      );
    }
  }

  const manifest: RewritesManifest = {
    version: 1,
    rewrites: serializableRules,
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
}

