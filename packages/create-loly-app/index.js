#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import fsExtra from "fs-extra";
import chalk from "chalk";
import prompts from "prompts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get project name from args or prompt
async function getProjectName() {
  const args = process.argv.slice(2);
  const projectName = args[0];

  if (projectName) {
    return projectName;
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

// Main function
async function main() {
  try {
    console.log(chalk.bold.cyan("\n✨ Welcome to Loly!\n"));

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

    // Find template directory
    // First try to find it in the package directory (for published version)
    let templateDir = path.join(__dirname, "template");
    
    // If not found, try to find it relative to the workspace root (for development)
    if (!fs.existsSync(templateDir)) {
      const workspaceRoot = path.resolve(__dirname, "../..");
      templateDir = path.join(workspaceRoot, "apps", "template");
    }

    if (!fs.existsSync(templateDir)) {
      throw new Error(
        `Template directory not found. Please ensure the template exists.\n` +
        `Tried: ${path.join(__dirname, "template")}\n` +
        `Tried: ${path.join(path.resolve(__dirname, "../.."), "apps", "template")}`
      );
    }

    // Create project directory
    console.log(chalk.blue(`\n📁 Creating project "${validatedName}"...`));
    fs.mkdirSync(projectDir, { recursive: true });

    // Copy template files
    copyTemplateFiles(templateDir, projectDir);

    // Update package.json
    const packageJsonPath = path.join(projectDir, "package.json");
    updatePackageJson(packageJsonPath, validatedName);
    
    // Check if we're in a workspace and adjust @lolyjs/core dependency
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    const isInWorkspace = fs.existsSync(path.resolve(projectDir, "../..", "pnpm-workspace.yaml"));
    
    if (packageJson.dependencies?.["@lolyjs/core"]?.startsWith("workspace:")) {
      if (!isInWorkspace) {
        // Replace workspace protocol with latest version for standalone projects
        packageJson.dependencies["@lolyjs/core"] = "^0.1.0-alpha.0";
        fs.writeFileSync(
          packageJsonPath,
          JSON.stringify(packageJson, null, 2) + "\n",
          "utf-8"
        );
        console.log(chalk.gray("  Updated @lolyjs/core to use published version"));
      } else {
        console.log(chalk.gray("  Using workspace dependency for @lolyjs/core"));
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

