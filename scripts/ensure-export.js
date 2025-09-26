#!/usr/bin/env node
const fs = require('fs').promises;
const path = require('path');

async function findIndexHtml(startDir) {
  const entries = await fs.readdir(startDir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(startDir, e.name);
    if (e.isFile() && e.name.toLowerCase() === 'index.html') return startDir;
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      try {
        const found = await findIndexHtml(path.join(startDir, e.name));
        if (found) return found;
      } catch (err) {
        // ignore and continue
      }
    }
  }
  return null;
}

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const e of entries) {
    const srcPath = path.join(src, e.name);
    const destPath = path.join(dest, e.name);
    if (e.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else if (e.isFile()) {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function main() {
  const root = process.cwd();
  const nextDir = path.join(root, '.next');
  const target = path.join(nextDir, 'out');

  // Look for index.html under .next (recursive)
  try {
    const foundDir = await findIndexHtml(nextDir);
    if (!foundDir) {
      console.error('No index.html found under .next — export may have failed.');
      process.exit(1);
    }

    // Remove existing .next/out
    await fs.rm(target, { recursive: true, force: true });
    await copyDir(foundDir, target);
    console.log(`Export copied from ${foundDir} -> ${target}`);
    process.exit(0);
  } catch (err) {
    console.error('Error ensuring export:', err);
    process.exit(1);
  }
}

main();
