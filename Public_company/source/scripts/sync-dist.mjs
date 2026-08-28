import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const sourceRoot = path.resolve(path.dirname(currentFile), "..");
const distRoot = path.join(sourceRoot, "dist");
const releaseRoot = path.resolve(sourceRoot, "..");

const requiredPaths = [
  path.join(distRoot, "index.html"),
  path.join(distRoot, "assets"),
  path.join(distRoot, "data")
];

for (const requiredPath of requiredPaths) {
  await fs.access(requiredPath);
}

for (const directory of ["assets", "data"]) {
  const target = path.join(releaseRoot, directory);
  await fs.rm(target, { recursive: true, force: true });
  await fs.cp(path.join(distRoot, directory), target, { recursive: true });
}

await fs.copyFile(
  path.join(distRoot, "index.html"),
  path.join(releaseRoot, "index.html")
);

process.stdout.write(`发布产物已同步到 ${releaseRoot}\n`);
