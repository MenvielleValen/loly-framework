#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import fsExtra from "fs-extra";
import chalk from "chalk";
import prompts from "prompts";
import os from "os";

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

// Build project
function buildProject(projectDir, packageManager = "pnpm") {
  console.log(chalk.blue(`\n🔨 Building project...`));
  
  try {
    execSync(`${packageManager} build`, {
      cwd: projectDir,
      stdio: "inherit",
    });
    console.log(chalk.green("  ✓ Build completed successfully"));
  } catch (error) {
    console.error(chalk.yellow(`\n⚠️  Build failed, but project is still ready to use`));
    console.log(chalk.gray(`  You can build it manually later by running:`));
    console.log(chalk.cyan(`  cd ${path.basename(projectDir)}`));
    console.log(chalk.cyan(`  ${packageManager} build`));
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
async function downloadTemplateFromGit() {
  const repoUrl = process.env.LOLY_TEMPLATE_REPO || "https://github.com/MenvielleValen/loly-framework";
  const branch = process.env.LOLY_TEMPLATE_BRANCH || "main";
  const templatePath = "/apps/template";
  
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
async function getTemplateDirectory() {
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
  
  // Download from git
  return await downloadTemplateFromGit();
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

    // Get template directory (download from git or use local)
    const templateDir = await getTemplateDirectory();

    // Create project directory
    console.log(chalk.blue(`\n📁 Creating project "${validatedName}"...`));
    fs.mkdirSync(projectDir, { recursive: true });

    // Copy template files
    copyTemplateFiles(templateDir, projectDir);
    
    // Clean up downloaded template if it was downloaded
    if (templateDir.startsWith(os.tmpdir())) {
      fsExtra.removeSync(templateDir);
    }

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

