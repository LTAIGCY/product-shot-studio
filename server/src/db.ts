import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

export function ensureDefaultDatabaseUrl(): void {
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "file:../data/product-shot-studio.db";
  }
  const sqlitePath = resolveSqlitePath(process.env.DATABASE_URL);
  if (sqlitePath) {
    fs.mkdirSync(path.dirname(sqlitePath), { recursive: true });
  }
}

export function createPrismaClient(): PrismaClient {
  ensureDefaultDatabaseUrl();
  return new PrismaClient();
}

function resolveSqlitePath(databaseUrl: string): string | null {
  if (!databaseUrl.startsWith("file:")) return null;
  const rawPath = databaseUrl.slice("file:".length);
  if (path.isAbsolute(rawPath)) return rawPath;
  return path.resolve(process.cwd(), "prisma", rawPath);
}
