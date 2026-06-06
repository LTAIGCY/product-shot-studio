import type { PrismaClient } from "@prisma/client";

const schemaStatements = [
  `PRAGMA foreign_keys = ON`,
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    password_algo TEXT NOT NULL DEFAULT 'scrypt',
    status TEXT NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at DATETIME
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
  `CREATE INDEX IF NOT EXISTS audit_events_action_created_at_idx ON audit_events (action, created_at)`
];

export async function initializeDatabaseSchema(prisma: PrismaClient): Promise<void> {
  for (const statement of schemaStatements) {
    await prisma.$executeRawUnsafe(statement);
  }
}
