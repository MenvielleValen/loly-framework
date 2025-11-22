import fs from "fs";
import path from "path";

export const loadAliasesFromTsconfig = (
  projectRoot: string
): Record<string, string> => {
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
};
