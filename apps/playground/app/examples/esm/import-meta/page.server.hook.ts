import type { ServerLoader } from "@lolyjs/core";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFile } from "fs/promises";

/**
 * Import.meta Example
 * 
 * Demonstrates ESM's import.meta.url for module metadata.
 * In CJS you'd use __dirname, but that's not available in ESM.
 * 
 * ✅ This only works in ESM - import.meta
 */

// import.meta.url - NOT available in CJS
// In CJS you would use __dirname, but it's not available in pure ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read a file relative to the current module
const readLocalFile = async () => {
  const filePath = join(__dirname, "data.json");
  try {
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    return {
      message: "File not found, but import.meta.url works!",
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

export const getServerSideProps: ServerLoader = async () => {
  const data = await readLocalFile();

  return {
    props: {
      moduleUrl: import.meta.url,
      moduleDir: __dirname,
      data,
      message: "Using import.meta.url to resolve module paths!",
      explanation:
        "import.meta.url provides the absolute URL of the current module, allowing us to resolve paths relative to the module file itself. This is only available in ESM.",
    },
    metadata: {
      title: "Import.meta Example",
      description: "Demonstrating ESM import.meta.url capability",
    },
  };
};

