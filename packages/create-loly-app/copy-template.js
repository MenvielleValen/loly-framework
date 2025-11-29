#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const workspaceRoot = path.resolve(__dirname, "../..");
const sourceTemplate = path.join(workspaceRoot, "apps", "template");
const targetTemplate = path.join(__dirname, "template");

// Files and directories to exclude
const exclude = [
  "node_modules",
  ".git",
  "dist",
  ".next",
  ".cache",
  ".DS_Store",
];

function copyRecursive(src, dest) {
  const stats = fs.statSync(src);
  
  if (stats.isDirectory()) {
    const basename = path.basename(src);
    if (exclude.includes(basename)) {
      return;
    }
    
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      const srcPath = path.join(src, entry);
      const destPath = path.join(dest, entry);
      copyRecursive(srcPath, destPath);
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

console.log(`Copying template from ${sourceTemplate} to ${targetTemplate}...`);

if (!fs.existsSync(sourceTemplate)) {
  console.error(`Source template not found: ${sourceTemplate}`);
  process.exit(1);
}

// Remove existing template directory
if (fs.existsSync(targetTemplate)) {
  fs.rmSync(targetTemplate, { recursive: true, force: true });
}

// Copy template files
copyRecursive(sourceTemplate, targetTemplate);

console.log("✅ Template copied successfully!");

