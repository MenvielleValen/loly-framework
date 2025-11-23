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

export const copyDirRecursive = (srcDir: string, destDir: string) => {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

export const copyStaticAssets = (projectRoot: string, outDir: string) => {
  // 1) Copiar carpeta assets/ (si existe) → .fw/client/assets/
  const assetsSrc = path.join(projectRoot, "assets");
  const assetsDest = path.join(outDir, "assets");
  copyDirRecursive(assetsSrc, assetsDest);

  // 2) Buscar favicon en app/ o en la raíz del proyecto
  const appDir = path.join(projectRoot, "app");
  const candidates = ["favicon.ico", "favicon.png"];

  for (const name of candidates) {
    const fromApp = path.join(appDir, name);
    const fromRoot = path.join(projectRoot, name);

    let src: string | null = null;
    if (fs.existsSync(fromApp)) src = fromApp;
    else if (fs.existsSync(fromRoot)) src = fromRoot;

    if (src) {
      const dest = path.join(outDir, name); // se servirá como /static/favicon.*
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
      break; // priorizamos el primero que encontremos
    }
  }
}
