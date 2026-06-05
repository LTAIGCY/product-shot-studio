const fs = require("node:fs");
const path = require("node:path");
const extract = require("extract-zip");
const { downloadArtifact } = require("@electron/get");

async function main() {
  const electronDir = path.resolve(__dirname, "..", "node_modules", "electron");
  const pkg = require(path.join(electronDir, "package.json"));
  const distDir = path.join(electronDir, "dist");
  const exePath = path.join(distDir, "electron.exe");

  if (fs.existsSync(exePath)) {
    console.log(`Electron binary present: ${exePath}`);
    return;
  }

  const zipPath = await downloadArtifact({
    version: pkg.version,
    artifactName: "electron",
    platform: "win32",
    arch: "x64",
    force: process.env.force_no_cache === "true"
  });

  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(distDir, { recursive: true });
  await extract(zipPath, { dir: distDir });
  fs.writeFileSync(path.join(electronDir, "path.txt"), "electron.exe");
  console.log(`Electron binary restored: ${exePath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
