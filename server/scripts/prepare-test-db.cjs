const { spawnSync } = require("node:child_process");
const path = require("node:path");

process.env.DATABASE_URL = process.env.DATABASE_URL || "file:../data/product-shot-studio-test.db";

const prismaCli = path.join(__dirname, "..", "node_modules", "prisma", "build", "index.js");

for (const args of [
  ["prisma", "generate"],
  ["node", "scripts/init-db.cjs"]
]) {
  const command = process.execPath;
  const commandArgs = args[0] === "node" ? args.slice(1) : [prismaCli, ...args.slice(1)];
  const result = spawnSync(command, commandArgs, {
    cwd: __dirname + "/..",
    env: process.env,
    stdio: "inherit"
  });
  if (result.error) {
    console.error(result.error);
  }
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}
