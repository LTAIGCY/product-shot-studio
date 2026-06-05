import fs from "node:fs/promises";
import path from "node:path";
import { app } from "electron";
import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";
import type { StudioJob, WalletSummary, WalletTransaction } from "../../shared/types";

export interface StoredUser {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
}

export class AppDatabase {
  private SQL: SqlJsStatic | null = null;
  private db: Database | null = null;
  private readonly dbPath: string;

  constructor(userDataPath: string) {
    this.dbPath = path.join(userDataPath, "product-shot-studio.sqlite");
  }

  async init(): Promise<void> {
    this.SQL = await initSqlJs({
      locateFile: (file: string) =>
        app.isPackaged
          ? path.join(process.resourcesPath, file)
          : path.join(process.cwd(), "node_modules", "sql.js", "dist", file)
    });

    try {
      const bytes = await fs.readFile(this.dbPath);
      this.db = new this.SQL.Database(bytes);
    } catch {
      this.db = new this.SQL.Database();
    }

    this.exec(`
      CREATE TABLE IF NOT EXISTS product_jobs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        provider_id TEXT NOT NULL,
        status TEXT NOT NULL,
        source_image_path TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        payload_json TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_product_jobs_created_at ON product_jobs(created_at DESC);

      CREATE TABLE IF NOT EXISTS product_job_trash (
        job_id TEXT PRIMARY KEY,
        deleted_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_product_job_trash_deleted_at ON product_job_trash(deleted_at DESC);

      CREATE TABLE IF NOT EXISTS local_users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        amount_cents INTEGER NOT NULL,
        provider_id TEXT,
        model_id TEXT,
        job_id TEXT,
        note TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_created_at
        ON wallet_transactions(user_id, created_at DESC);
    `);
    await this.ensureColumn("product_jobs", "user_id", "TEXT");
    this.exec("CREATE INDEX IF NOT EXISTS idx_product_jobs_user_created_at ON product_jobs(user_id, created_at DESC)");
    await this.persist();
  }

  async upsertJob(job: StudioJob): Promise<void> {
    this.requireDb().run(
      `
      INSERT INTO product_jobs (id, user_id, provider_id, status, source_image_path, created_at, updated_at, payload_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        user_id = excluded.user_id,
        provider_id = excluded.provider_id,
        status = excluded.status,
        source_image_path = excluded.source_image_path,
        updated_at = excluded.updated_at,
        payload_json = excluded.payload_json
      `,
      [
        job.id,
        job.userId ?? null,
        job.request.providerId,
        job.status,
        job.sourceImagePath,
        job.createdAt,
        job.updatedAt,
        JSON.stringify(job)
      ]
    );
    await this.persist();
  }

  async claimUnownedJobs(userId: string): Promise<void> {
    this.requireDb().run("UPDATE product_jobs SET user_id = ? WHERE user_id IS NULL OR user_id = ''", [userId]);
    await this.persist();
  }

  listJobs(userId: string, limit = 50): StudioJob[] {
    const result = this.requireDb().exec(
      `
      SELECT payload_json FROM product_jobs
      WHERE user_id = ?
        AND id NOT IN (SELECT job_id FROM product_job_trash)
      ORDER BY created_at DESC
      LIMIT ${Number(limit) || 50}
      `,
      [userId]
    );
    if (result.length === 0) {
      return [];
    }
    return result[0].values.map((row) => normalizeStoredJob(JSON.parse(String(row[0])) as StudioJob));
  }

  listTrashedJobs(userId: string, limit = 50): StudioJob[] {
    const result = this.requireDb().exec(
      `
      SELECT product_jobs.payload_json
      FROM product_jobs
      INNER JOIN product_job_trash ON product_jobs.id = product_job_trash.job_id
      WHERE product_jobs.user_id = ?
      ORDER BY product_job_trash.deleted_at DESC
      LIMIT ${Number(limit) || 50}
      `,
      [userId]
    );
    if (result.length === 0) {
      return [];
    }
    return result[0].values.map((row) => normalizeStoredJob(JSON.parse(String(row[0])) as StudioJob));
  }

  async trashJob(jobId: string, userId: string): Promise<void> {
    if (!this.jobBelongsToUser(jobId, userId)) return;
    this.requireDb().run(
      `
      INSERT INTO product_job_trash (job_id, deleted_at)
      VALUES (?, ?)
      ON CONFLICT(job_id) DO UPDATE SET deleted_at = excluded.deleted_at
      `,
      [jobId, new Date().toISOString()]
    );
    await this.persist();
  }

  async restoreJob(jobId: string, userId: string): Promise<void> {
    if (!this.jobBelongsToUser(jobId, userId)) return;
    this.requireDb().run("DELETE FROM product_job_trash WHERE job_id = ?", [jobId]);
    await this.persist();
  }

  async deleteJobForever(jobId: string, userId: string): Promise<void> {
    if (!this.jobBelongsToUser(jobId, userId)) return;
    this.requireDb().run("DELETE FROM product_job_trash WHERE job_id = ?", [jobId]);
    this.requireDb().run("DELETE FROM product_jobs WHERE id = ?", [jobId]);
    await this.persist();
  }

  async createUser(user: StoredUser): Promise<void> {
    this.requireDb().run(
      `
      INSERT INTO local_users (id, username, password_hash, salt, created_at)
      VALUES (?, ?, ?, ?, ?)
      `,
      [user.id, user.username, user.passwordHash, user.salt, user.createdAt]
    );
    await this.persist();
  }

  getUserByUsername(username: string): StoredUser | null {
    const result = this.requireDb().exec(
      "SELECT id, username, password_hash, salt, created_at FROM local_users WHERE username = ?",
      [username]
    );
    if (result.length === 0 || result[0].values.length === 0) return null;
    return mapUserRow(result[0].values[0]);
  }

  getUserById(userId: string): StoredUser | null {
    const result = this.requireDb().exec(
      "SELECT id, username, password_hash, salt, created_at FROM local_users WHERE id = ?",
      [userId]
    );
    if (result.length === 0 || result[0].values.length === 0) return null;
    return mapUserRow(result[0].values[0]);
  }

  listUsers(): StoredUser[] {
    const result = this.requireDb().exec(
      "SELECT id, username, password_hash, salt, created_at FROM local_users ORDER BY created_at DESC"
    );
    if (result.length === 0) return [];
    return result[0].values.map((row) => mapUserRow(row));
  }

  async deleteUser(userId: string): Promise<void> {
    this.requireDb().run(
      "DELETE FROM product_job_trash WHERE job_id IN (SELECT id FROM product_jobs WHERE user_id = ?)",
      [userId]
    );
    this.requireDb().run("DELETE FROM product_jobs WHERE user_id = ?", [userId]);
    this.requireDb().run("DELETE FROM wallet_transactions WHERE user_id = ?", [userId]);
    this.requireDb().run("DELETE FROM local_users WHERE id = ?", [userId]);
    await this.persist();
  }

  async addWalletTransaction(transaction: WalletTransaction): Promise<void> {
    this.requireDb().run(
      `
      INSERT INTO wallet_transactions
        (id, user_id, type, amount_cents, provider_id, model_id, job_id, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        transaction.id,
        transaction.userId,
        transaction.type,
        transaction.amountCents,
        transaction.providerId ?? null,
        transaction.modelId ?? null,
        transaction.jobId ?? null,
        transaction.note,
        transaction.createdAt
      ]
    );
    await this.persist();
  }

  listWalletTransactions(userId: string, limit = 50): WalletTransaction[] {
    const result = this.requireDb().exec(
      `
      SELECT id, user_id, type, amount_cents, provider_id, model_id, job_id, note, created_at
      FROM wallet_transactions
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ${Number(limit) || 50}
      `,
      [userId]
    );
    if (result.length === 0) return [];
    return result[0].values.map((row) => ({
      id: String(row[0]),
      userId: String(row[1]),
      type: String(row[2]) as WalletTransaction["type"],
      amountCents: Number(row[3]),
      providerId: row[4] ? (String(row[4]) as WalletTransaction["providerId"]) : undefined,
      modelId: row[5] ? String(row[5]) : undefined,
      jobId: row[6] ? String(row[6]) : undefined,
      note: String(row[7]),
      createdAt: String(row[8])
    }));
  }

  getWalletSummary(userId: string): WalletSummary {
    const transactions = this.listWalletTransactions(userId, 100000);
    const totalRechargedCents = transactions
      .filter((item) => item.type === "recharge")
      .reduce((sum, item) => sum + item.amountCents, 0);
    const usedCents = transactions
      .filter((item) => item.type === "usage")
      .reduce((sum, item) => sum + Math.abs(item.amountCents), 0);
    const balanceCents = transactions.reduce((sum, item) => sum + item.amountCents, 0);
    return {
      userId,
      balanceCents,
      usedCents,
      totalRechargedCents,
      currency: "CNY",
      updatedAt: transactions[0]?.createdAt ?? new Date().toISOString()
    };
  }

  private exec(sql: string): void {
    this.requireDb().exec(sql);
  }

  private async ensureColumn(tableName: string, columnName: string, declaration: string): Promise<void> {
    const info = this.requireDb().exec(`PRAGMA table_info(${tableName})`);
    const exists = info[0]?.values.some((row) => String(row[1]) === columnName);
    if (!exists) {
      this.requireDb().run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${declaration}`);
    }
  }

  private jobBelongsToUser(jobId: string, userId: string): boolean {
    const result = this.requireDb().exec("SELECT id FROM product_jobs WHERE id = ? AND user_id = ?", [jobId, userId]);
    return result.length > 0 && result[0].values.length > 0;
  }

  private requireDb(): Database {
    if (!this.db) {
      throw new Error("Database has not been initialized.");
    }
    return this.db;
  }

  private async persist(): Promise<void> {
    const bytes = this.requireDb().export();
    await fs.mkdir(path.dirname(this.dbPath), { recursive: true });
    await fs.writeFile(this.dbPath, Buffer.from(bytes));
  }
}

function mapUserRow(row: unknown[]): StoredUser {
  return {
    id: String(row[0]),
    username: String(row[1]),
    passwordHash: String(row[2]),
    salt: String(row[3]),
    createdAt: String(row[4])
  };
}

function normalizeStoredJob(job: StudioJob): StudioJob {
  if (!("mediaType" in job) || !job.mediaType) {
    return { ...job, mediaType: "image" };
  }
  return job;
}
