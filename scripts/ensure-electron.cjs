const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const extract = require("extract-zip");
const { downloadArtifact } = require("@electron/get");

async function main() {
  const electronDir = path.resolve(__dirname, "..", "node_modules", "electron");
  const pkg = require(path.join(electronDir, "package.json"));
  const distDir = path.join(electronDir, "dist");
  const requiredFiles = [
    "electron.exe",
    "chrome_100_percent.pak",
    "chrome_200_percent.pak",
    "resources.pak",
    "icudtl.dat",
    path.join("locales", "zh-CN.pak")
  ];
  const missingFiles = requiredFiles.filter((file) => !fs.existsSync(path.join(distDir, file)));
  const exePath = path.join(distDir, "electron.exe");

  if (missingFiles.length === 0) {
    console.log(`Electron runtime present: ${distDir}`);
    return;
  }

  console.log(`Electron runtime incomplete, missing: ${missingFiles.join(", ")}`);

  const zipPath = await downloadArtifact({
    version: pkg.version,
    artifactName: "electron",
    platform: "win32",
    arch: "x64",
    force: process.env.force_no_cache === "true"
  });

  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(distDir, { recursive: true });
  await extractElectronArchive(zipPath, distDir);

  const stillMissing = requiredFiles.filter((file) => !fs.existsSync(path.join(distDir, file)));
  if (stillMissing.length > 0) {
    throw new Error(`Electron runtime restore failed, still missing: ${stillMissing.join(", ")}`);
  }

  fs.writeFileSync(path.join(electronDir, "path.txt"), "electron.exe");
  console.log(`Electron binary restored: ${exePath}`);
}

async function extractElectronArchive(zipPath, distDir) {
  if (process.platform === "win32") {
    const command = `Expand-Archive -LiteralPath ${quotePowerShell(zipPath)} -DestinationPath ${quotePowerShell(distDir)} -Force`;
    const result = spawnSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command], {
      stdio: "inherit"
    });
    if (result.status !== 0) {
      throw new Error(`PowerShell Expand-Archive failed with status ${result.status}`);
    }
    return;
  }

  await extract(zipPath, { dir: distDir });
}

function quotePowerShell(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
