#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import fsExtra from "fs-extra";
import chalk from "chalk";
import prompts from "prompts";
import os from "os";
import https from "https";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Template map: maps template names to their paths in the repository
const TEMPLATE_MAP = {
  template: "/apps/template",
  // Ready for adding more templates in the future
};

// Parse command line arguments
function parseArguments() {
  const args = process.argv.slice(2);
  const result = {
    projectName: null,
    template: "template", // default template
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--template" && i + 1 < args.length) {
      result.template = args[i + 1];
      i++; // Skip next argument as it's the template value
    } else if (arg.startsWith("--")) {
      // Unknown flag, skip
      continue;
    } else if (!result.projectName) {
      // First non-flag argument is the project name
      result.projectName = arg;
    }
  }

  return result;
}

// Get project name from args or prompt
async function getProjectName() {
  const parsed = parseArguments();

  if (parsed.projectName) {
    return parsed.projectName;
  }

  const response = await prompts({
    type: "text",
    name: "name",
    message: "What is your project name?",
    initial: "my-loly-app",
    validate: (value) => {
      if (!value || value.trim().length === 0) {
        return "Project name cannot be empty";
      }
      if (!/^[a-z0-9-]+$/.test(value)) {
        return "Project name can only contain lowercase letters, numbers, and hyphens";
      }
      return true;
    },
  });

  return response.name;
}

// Validate project name
function validateProjectName(name) {
  if (!name || name.trim().length === 0) {
    throw new Error("Project name cannot be empty");
  }
  if (!/^[a-z0-9-]+$/.test(name)) {
    throw new Error(
      "Project name can only contain lowercase letters, numbers, and hyphens"
    );
  }
  return name.trim();
}

// Validate template name
function validateTemplateName(templateName) {
  if (!templateName || typeof templateName !== "string") {
    throw new Error("Template name cannot be empty");
  }

  if (!TEMPLATE_MAP.hasOwnProperty(templateName)) {
    const availableTemplates = Object.keys(TEMPLATE_MAP).join(", ");
    throw new Error(
      `Template "${templateName}" not found. Available templates: ${availableTemplates}`
    );
  }

  return templateName;
}

// Get latest version of @lolyjs/core from npm registry
async function getLatestLolyCoreVersion() {
  return new Promise((resolve, reject) => {
    const url = "https://registry.npmjs.org/@lolyjs/core/latest";

    https
      .get(url, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            const version = json.version;
            if (version) {
              resolve(version);
            } else {
              reject(new Error("Version not found in npm registry response"));
            }
          } catch (error) {
            reject(
              new Error(`Failed to parse npm registry response: ${error.message}`)
            );
          }
        });
      })
      .on("error", (error) => {
        reject(new Error(`Failed to fetch version from npm: ${error.message}`));
      });
  });
}

// Copy template files
function copyTemplateFiles(templateDir, targetDir) {
  console.log(chalk.blue("📦 Copying template files..."));

  // Files/directories to exclude
  const exclude = [
    "node_modules",
    ".git",
    "dist",
    ".next",
    ".cache",
  ];

  fsExtra.copySync(templateDir, targetDir, {
    filter: (src) => {
      const basename = path.basename(src);
      return !exclude.includes(basename);
    },
  });

  // Verify that essential files were copied
  const essentialFiles = [
    "package.json",
    "loly.config.ts",
    "tsconfig.json",
  ];

  for (const file of essentialFiles) {
    const filePath = path.join(targetDir, file);
    if (!fs.existsSync(filePath)) {
      console.warn(
        chalk.yellow(
          `⚠️  Warning: Essential file ${file} not found in copied template`
        )
      );
    }
  }
}

// Replace placeholders in files
function replaceInFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, "utf-8");

  for (const [placeholder, value] of Object.entries(replacements)) {
    const regex = new RegExp(placeholder, "g");
    content = content.replace(regex, value);
  }

  fs.writeFileSync(filePath, content, "utf-8");
}

// Update package.json with project name
function updatePackageJson(packageJsonPath, projectName) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
  packageJson.name = projectName;
  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2) + "\n",
    "utf-8"
  );
}

// Install dependencies
function installDependencies(projectDir, packageManager = "pnpm") {
  console.log(chalk.blue(`\n📥 Installing dependencies with ${packageManager}...`));

  try {
    execSync(`${packageManager} install`, {
      cwd: projectDir,
      stdio: "inherit",
    });
  } catch (error) {
    console.error(chalk.red(`\n❌ Failed to install dependencies`));
    console.log(chalk.yellow(`\nYou can install them manually by running:`));
    console.log(chalk.cyan(`  cd ${path.basename(projectDir)}`));
    console.log(chalk.cyan(`  ${packageManager} install`));
    throw error;
  }
}

// Build project
function buildProject(projectDir, packageManager = "pnpm") {
  console.log(chalk.blue(`\n🔨 Building project...`));

  // Verify we're in the correct directory before building
  const packageJsonPath = path.join(projectDir, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(
      `package.json not found in project directory: ${projectDir}`
    );
  }

  // Verify build script exists in package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
  if (!packageJson.scripts || !packageJson.scripts.build) {
    console.warn(
      chalk.yellow(
        `⚠️  Warning: No build script found in package.json. Skipping build.`
      )
    );
    return;
  }

  // Verify loly.config.ts exists (required for build)
  const configPath = path.join(projectDir, "loly.config.ts");
  if (!fs.existsSync(configPath)) {
    console.warn(
      chalk.yellow(
        `⚠️  Warning: loly.config.ts not found. Build may fail.`
      )
    );
  }

  // Verify node_modules exists (dependencies should be installed)
  const nodeModulesPath = path.join(projectDir, "node_modules");
  if (!fs.existsSync(nodeModulesPath)) {
    console.warn(
      chalk.yellow(
        `⚠️  Warning: node_modules not found. Dependencies may not be installed.`
      )
    );
  }
  
  // Verify tsconfig.json exists (required for TypeScript builds)
  const tsconfigPath = path.join(projectDir, "tsconfig.json");
  if (!fs.existsSync(tsconfigPath)) {
    console.warn(
      chalk.yellow(
        `⚠️  Warning: tsconfig.json not found. Build may fail.`
      )
    );
  }

  try {
    // Use absolute path for cwd to ensure we're in the right directory
    const absoluteProjectDir = path.resolve(projectDir);
    
    // Verify the directory exists and is accessible
    if (!fs.existsSync(absoluteProjectDir)) {
      throw new Error(`Project directory does not exist: ${absoluteProjectDir}`);
    }

    // Build command differs by package manager
    const buildCommand = packageManager === "npm" 
      ? `${packageManager} run build` 
      : `${packageManager} build`;
    
    execSync(buildCommand, {
      cwd: absoluteProjectDir,
      stdio: "inherit",
      env: { ...process.env, FORCE_COLOR: "1" },
    });
    console.log(chalk.green("  ✓ Build completed successfully"));
  } catch (error) {
    // Log the actual error for debugging
    console.error(chalk.yellow(`\n⚠️  Build failed, but project is still ready to use`));
    
    // Try to get more information about the error
    if (error.message) {
      console.log(chalk.gray(`Error details: ${error.message}`));
    }
    
    // With stdio: "inherit", stdout/stderr are not available in the error object
    // The error output is already shown to the user via inherit
    // But we can check if there's additional info in the error object
    if (error.stdout) {
      console.log(chalk.gray("\nBuild output:"));
      console.log(chalk.gray(error.stdout.toString()));
    }
    if (error.stderr) {
      console.log(chalk.gray("\nBuild errors:"));
      console.log(chalk.gray(error.stderr.toString()));
    }
    
    // Show the exit code if available
    if (error.status !== undefined && error.status !== null) {
      console.log(chalk.gray(`Build exited with code: ${error.status}`));
    }
    
    console.log(chalk.gray(`\nYou can build it manually later by running:`));
    console.log(chalk.cyan(`  cd ${path.basename(projectDir)}`));
    const manualBuildCommand = packageManager === "npm" 
      ? `${packageManager} run build` 
      : `${packageManager} build`;
    console.log(chalk.cyan(`  ${manualBuildCommand}`));
    // Don't throw - build failure is not critical for project creation
  }
}

// Detect package manager
function detectPackageManager() {
  if (process.env.npm_config_user_agent) {
    if (process.env.npm_config_user_agent.includes("pnpm")) {
      return "pnpm";
    }
    if (process.env.npm_config_user_agent.includes("yarn")) {
      return "yarn";
    }
  }

  // Check for lock files
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, "pnpm-lock.yaml"))) {
    return "pnpm";
  }
  if (fs.existsSync(path.join(cwd, "yarn.lock"))) {
    return "yarn";
  }

  return "npm";
}

// Check if git is available
function isGitAvailable() {
  try {
    execSync("git --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// Download template from git repository
async function downloadTemplateFromGit(templatePath) {
  const repoUrl = process.env.LOLY_TEMPLATE_REPO || "https://github.com/MenvielleValen/loly-framework";
  const branch = process.env.LOLY_TEMPLATE_BRANCH || "main";

  console.log(chalk.blue(`📥 Downloading template from ${repoUrl} (${branch})...`));

  if (!isGitAvailable()) {
    throw new Error(
      "Git is not available. Please install git to download the template.\n" +
      "You can download it from: https://git-scm.com/downloads"
    );
  }

  // Create temporary directory
  const tempDir = path.join(os.tmpdir(), `loly-template-${Date.now()}`);

  try {
    // Clone repository (shallow clone for faster download)
    console.log(chalk.gray("  Cloning repository..."));
    execSync(
      `git clone --depth 1 --branch ${branch} ${repoUrl} "${tempDir}"`,
      { stdio: "pipe" }
    );

    const templateDir = path.join(tempDir, templatePath);

    if (!fs.existsSync(templateDir)) {
      // Try master branch if main doesn't exist
      if (branch === "main") {
        console.log(chalk.gray("  Trying master branch..."));
        fsExtra.removeSync(tempDir);
        execSync(
          `git clone --depth 1 --branch master ${repoUrl} "${tempDir}"`,
          { stdio: "pipe" }
        );

        if (!fs.existsSync(templateDir)) {
          throw new Error(
            `Template directory not found in repository.\n` +
            `Expected path: ${templatePath}\n` +
            `Repository: ${repoUrl}`
          );
        }
      } else {
        throw new Error(
          `Template directory not found in repository.\n` +
          `Expected path: ${templatePath}\n` +
          `Repository: ${repoUrl}`
        );
      }
    }

    // Create a temporary directory for the extracted template
    const extractedTemplateDir = path.join(os.tmpdir(), `loly-template-extracted-${Date.now()}`);
    fsExtra.copySync(templateDir, extractedTemplateDir);

    // Clean up cloned repository
    fsExtra.removeSync(tempDir);

    console.log(chalk.green("  ✓ Template downloaded successfully"));

    return extractedTemplateDir;
  } catch (error) {
    // Clean up on error
    if (fs.existsSync(tempDir)) {
      fsExtra.removeSync(tempDir);
    }

    if (error.message.includes("not found") || error.message.includes("fatal:")) {
      throw new Error(
        `Failed to download template from ${repoUrl}.\n` +
        `Error: ${error.message}\n\n` +
        `You can set a custom repository URL using:\n` +
        `  LOLY_TEMPLATE_REPO=<url> create-loly-app <project-name>\n` +
        `Or set a custom branch:\n` +
        `  LOLY_TEMPLATE_BRANCH=<branch> create-loly-app <project-name>`
      );
    }

    throw error;
  }
}

// Get template directory (download from git or use local fallback)
async function getTemplateDirectory(templateName) {
  // Check if we should use local template (for development)
  const useLocalTemplate = process.env.LOLY_USE_LOCAL_TEMPLATE === "true";

  if (useLocalTemplate) {
    // Try local template first (for development)
    let templateDir = path.join(__dirname, "template");

    if (!fs.existsSync(templateDir)) {
      const workspaceRoot = path.resolve(__dirname, "../..");
      templateDir = path.join(workspaceRoot, "packages", "create-loly-app", "template");
    }

    if (fs.existsSync(templateDir)) {
      console.log(chalk.gray("  Using local template (development mode)"));
      return templateDir;
    }
  }

  // Validate template name and get path
  const validatedTemplateName = validateTemplateName(templateName);
  const templatePath = TEMPLATE_MAP[validatedTemplateName];

  // Download from git
  return await downloadTemplateFromGit(templatePath);
}

// Main function
async function main() {
  try {
    console.log(chalk.bold.cyan("\n✨ Welcome to Loly!\n"));

    // Parse arguments to get template name
    const parsedArgs = parseArguments();
    const templateName = parsedArgs.template;

    // Get project name
    const projectName = await getProjectName();
    const validatedName = validateProjectName(projectName);

    const projectDir = path.resolve(process.cwd(), validatedName);

    // Check if directory already exists
    if (fs.existsSync(projectDir)) {
      const response = await prompts({
        type: "confirm",
        name: "overwrite",
        message: `Directory "${validatedName}" already exists. Overwrite?`,
        initial: false,
      });

      if (!response.overwrite) {
        console.log(chalk.yellow("❌ Cancelled"));
        process.exit(0);
      }

      fsExtra.removeSync(projectDir);
    }

    // Get template directory (download from git or use local)
    const templateDir = await getTemplateDirectory(templateName);

    // Create project directory
    console.log(chalk.blue(`\n📁 Creating project "${validatedName}"...`));
    fs.mkdirSync(projectDir, { recursive: true });

    // Read template package.json to get the original @lolyjs/core version before copying
    // Template always has a production version (never workspace in published templates)
    const templatePackageJsonPath = path.join(templateDir, "package.json");
    let templateLolyCoreVersion = null;
    if (fs.existsSync(templatePackageJsonPath)) {
      const templatePackageJson = JSON.parse(fs.readFileSync(templatePackageJsonPath, "utf-8"));
      templateLolyCoreVersion = templatePackageJson.dependencies?.["@lolyjs/core"];
    }

    // Copy template files
    copyTemplateFiles(templateDir, projectDir);

    // Clean up downloaded template if it was downloaded
    if (templateDir.startsWith(os.tmpdir())) {
      fsExtra.removeSync(templateDir);
    }

    // Update package.json
    const packageJsonPath = path.join(projectDir, "package.json");
    updatePackageJson(packageJsonPath, validatedName);

    // Get latest version of @lolyjs/core and update package.json
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    const isInWorkspace = fs.existsSync(path.resolve(projectDir, "../..", "pnpm-workspace.yaml"));

    if (packageJson.dependencies?.["@lolyjs/core"]) {
      // Store original version from template (template always has a production version, never workspace)
      const originalVersion = packageJson.dependencies["@lolyjs/core"];
      
      // Check if it's a workspace dependency (only happens in local development)
      if (originalVersion.startsWith("workspace:")) {
        if (!isInWorkspace) {
          // Replace workspace protocol with latest version for standalone projects
          try {
            console.log(chalk.blue("  Fetching latest @lolyjs/core version from npm..."));
            const latestVersion = await getLatestLolyCoreVersion();
            packageJson.dependencies["@lolyjs/core"] = `^${latestVersion}`;
            fs.writeFileSync(
              packageJsonPath,
              JSON.stringify(packageJson, null, 2) + "\n",
              "utf-8"
            );
            console.log(chalk.gray(`  Updated @lolyjs/core to version ^${latestVersion}`));
          } catch (error) {
            // If fetch fails, use the version from template (which always has a production version)
            console.warn(chalk.yellow(`  ⚠️  Failed to fetch latest version: ${error.message}`));
            if (templateLolyCoreVersion && !templateLolyCoreVersion.startsWith("workspace:")) {
              packageJson.dependencies["@lolyjs/core"] = templateLolyCoreVersion;
              fs.writeFileSync(
                packageJsonPath,
                JSON.stringify(packageJson, null, 2) + "\n",
                "utf-8"
              );
              console.log(chalk.gray(`  Using version from template: ${templateLolyCoreVersion}`));
            } else {
              // This shouldn't happen if template always has production version
              console.warn(chalk.yellow(`  ⚠️  Template version not available, using fallback`));
              packageJson.dependencies["@lolyjs/core"] = "^0.1.0-alpha.0";
              fs.writeFileSync(
                packageJsonPath,
                JSON.stringify(packageJson, null, 2) + "\n",
                "utf-8"
              );
              console.log(chalk.gray("  Using fallback version ^0.1.0-alpha.0"));
            }
          }
        } else {
          console.log(chalk.gray("  Using workspace dependency for @lolyjs/core"));
        }
      } else if (!isInWorkspace) {
        // If not a workspace dependency and not in workspace, try to update to latest version
        // If fetch fails, keep the original version from template (which is always production)
        try {
          console.log(chalk.blue("  Fetching latest @lolyjs/core version from npm..."));
          const latestVersion = await getLatestLolyCoreVersion();
          packageJson.dependencies["@lolyjs/core"] = `^${latestVersion}`;
          fs.writeFileSync(
            packageJsonPath,
            JSON.stringify(packageJson, null, 2) + "\n",
            "utf-8"
          );
          console.log(chalk.gray(`  Updated @lolyjs/core to version ^${latestVersion}`));
        } catch (error) {
          console.warn(chalk.yellow(`  ⚠️  Failed to fetch latest version: ${error.message}`));
          console.log(chalk.gray(`  Keeping version from template: ${originalVersion}`));
          // Version already set from template, no need to write again
        }
      }
    }

    // Replace app name in layout.tsx if it exists
    const layoutPath = path.join(projectDir, "app", "layout.tsx");
    if (fs.existsSync(layoutPath)) {
      // Convert kebab-case to Title Case
      const appDisplayName = validatedName
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      replaceInFile(layoutPath, {
        "loly-app": validatedName,
        "Loly App": appDisplayName,
      });
    }

    // Detect and use package manager
    const packageManager = detectPackageManager();

    // Install dependencies
    installDependencies(projectDir, packageManager);

    // Build project
    buildProject(projectDir, packageManager);

    // Success message
    console.log(chalk.bold.green("\n✅ Project created successfully!\n"));
    console.log(chalk.cyan("Next steps:"));
    console.log(chalk.white(`  cd ${validatedName}`));
    console.log(chalk.white(`  ${packageManager} dev`));
    console.log(chalk.gray("\nHappy coding! 🚀\n"));
  } catch (error) {
    console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
    process.exit(1);
  }
}

main();
