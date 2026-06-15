import type { PrismaClient } from "@prisma/client";

const schemaStatements = [
  `PRAGMA foreign_keys = ON`,
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY NOT NULL,
    account_id TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    password_algo TEXT NOT NULL DEFAULT 'scrypt',
    password_updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at DATETIME,
    last_seen_at DATETIME,
    last_logout_at DATETIME
  )`,
  `CREATE TABLE IF NOT EXISTS wallets (
    user_id TEXT PRIMARY KEY NOT NULL,
    balance_points INTEGER NOT NULL DEFAULT 0,
    reserved_points INTEGER NOT NULL DEFAULT 0,
    total_recharged_points INTEGER NOT NULL DEFAULT 0,
    total_used_points INTEGER NOT NULL DEFAULT 0,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS wallet_transactions (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    amount_points INTEGER NOT NULL,
    balance_after_points INTEGER NOT NULL,
    provider_id TEXT,
    model_id TEXT,
    job_id TEXT,
    note TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT wallet_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS generation_jobs (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    reservation_id TEXT,
    media_type TEXT NOT NULL,
    provider_id TEXT,
    model_id TEXT,
    status TEXT NOT NULL,
    estimated_points INTEGER NOT NULL DEFAULT 0,
    charged_points INTEGER NOT NULL DEFAULT 0,
    result_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    CONSTRAINT generation_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS usage_reservations (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'reserved',
    estimated_points INTEGER NOT NULL,
    provider_id TEXT,
    model_id TEXT,
    media_type TEXT,
    job_id TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    committed_at DATETIME,
    canceled_at DATETIME,
    CONSTRAINT usage_reservations_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS audit_events (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT,
    action TEXT NOT NULL,
    ip TEXT,
    metadata_json TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT audit_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS wallet_transactions_user_id_created_at_idx ON wallet_transactions (user_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS wallet_transactions_type_created_at_idx ON wallet_transactions (type, created_at)`,
  `CREATE INDEX IF NOT EXISTS generation_jobs_user_id_created_at_idx ON generation_jobs (user_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS generation_jobs_status_created_at_idx ON generation_jobs (status, created_at)`,
  `CREATE INDEX IF NOT EXISTS usage_reservations_user_id_created_at_idx ON usage_reservations (user_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS usage_reservations_status_created_at_idx ON usage_reservations (status, created_at)`,
  `CREATE INDEX IF NOT EXISTS audit_events_user_id_created_at_idx ON audit_events (user_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS audit_events_action_created_at_idx ON audit_events (action, created_at)`,
  `CREATE INDEX IF NOT EXISTS users_username_idx ON users (username)`
];

export async function initializeDatabaseSchema(prisma: PrismaClient): Promise<void> {
  await migrateUsersTable(prisma);
  for (const statement of schemaStatements) {
    await prisma.$executeRawUnsafe(statement);
  }
  await ensureColumn(prisma, "users", "last_seen_at", "DATETIME");
  await ensureColumn(prisma, "users", "last_logout_at", "DATETIME");
  await ensureColumn(prisma, "users", "password_updated_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
  await verifyForeignKeys(prisma);
}

async function ensureColumn(prisma: PrismaClient, tableName: string, columnName: string, columnDefinition: string) {
  const columns = (await prisma.$queryRawUnsafe(`PRAGMA table_info(${tableName})`)) as Array<{ name: string }>;
  if (columns.some((column) => column.name === columnName)) return;
  await prisma.$executeRawUnsafe(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
}

async function migrateUsersTable(prisma: PrismaClient): Promise<void> {
  const tables = (await prisma.$queryRawUnsafe(
    `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'`
  )) as Array<{ sql: string | null }>;
  const usersSql = tables[0]?.sql ?? "";
  if (!usersSql) return;

  const columns = (await prisma.$queryRawUnsafe(`PRAGMA table_info(users)`)) as Array<{ name: string }>;
  const hasAccountId = columns.some((column) => column.name === "account_id");
  const hasPasswordUpdatedAt = columns.some((column) => column.name === "password_updated_at");
  const usernameIsUnique = /username\s+TEXT\s+NOT\s+NULL\s+UNIQUE/i.test(usersSql);
  if (hasAccountId && hasPasswordUpdatedAt && !usernameIsUnique) return;

  const accountIdExpression = hasAccountId ? "account_id" : "username";
  const passwordUpdatedExpression = hasPasswordUpdatedAt ? "password_updated_at" : "created_at";

  await prisma.$executeRawUnsafe(`PRAGMA foreign_keys = OFF`);
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`DROP TABLE IF EXISTS users_migrating`);
      await tx.$executeRawUnsafe(`CREATE TABLE users_migrating (
        id TEXT PRIMARY KEY NOT NULL,
        account_id TEXT NOT NULL UNIQUE,
        username TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        password_algo TEXT NOT NULL DEFAULT 'scrypt',
        password_updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        status TEXT NOT NULL DEFAULT 'active',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_login_at DATETIME,
        last_seen_at DATETIME,
        last_logout_at DATETIME
      )`);
      await tx.$executeRawUnsafe(`INSERT INTO users_migrating (
        id, account_id, username, password_hash, password_salt, password_algo,
        password_updated_at, status, created_at, last_login_at, last_seen_at, last_logout_at
      )
      SELECT
        id, ${accountIdExpression}, username, password_hash, password_salt, password_algo,
        ${passwordUpdatedExpression}, status, created_at, last_login_at,
        ${columns.some((column) => column.name === "last_seen_at") ? "last_seen_at" : "NULL"},
        ${columns.some((column) => column.name === "last_logout_at") ? "last_logout_at" : "NULL"}
      FROM users`);
      await tx.$executeRawUnsafe(`DROP TABLE users`);
      await tx.$executeRawUnsafe(`ALTER TABLE users_migrating RENAME TO users`);
    });
  } finally {
    await prisma.$executeRawUnsafe(`PRAGMA foreign_keys = ON`);
  }
}

async function verifyForeignKeys(prisma: PrismaClient): Promise<void> {
  const issues = (await prisma.$queryRawUnsafe(`PRAGMA foreign_key_check`)) as unknown[];
  if (issues.length > 0) {
    throw new Error(`数据库迁移后的外键检查失败，共发现 ${issues.length} 个问题。`);
  }
}
