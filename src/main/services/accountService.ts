import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { AuthCredentials, AuthSession, LocalAccountSummary } from "../../shared/types";
import type { AppDatabase, StoredUser } from "./database";

export class AccountService {
  private session: AuthSession | null = null;
  private readonly rememberedPath: string;

  constructor(private readonly database: AppDatabase, userDataPath: string) {
    this.rememberedPath = path.join(userDataPath, "remembered-session.json");
  }

  getSession(): AuthSession | null {
    return this.session;
  }

  async getRememberedSession(): Promise<AuthSession | null> {
    if (this.session) return this.session;
    const user = await this.readRememberedUser();
    return user ? toSession(user) : null;
  }

  async listAccounts(): Promise<LocalAccountSummary[]> {
    const rememberedUser = await this.readRememberedUser();
    return this.database.listUsers().map((user) => ({
      userId: user.id,
      username: user.username,
      createdAt: user.createdAt,
      remembered: user.id === rememberedUser?.id
    }));
  }

  async resumeRememberedSession(): Promise<AuthSession | null> {
    const user = await this.readRememberedUser();
    if (!user) return null;
    this.session = toSession(user);
    return this.session;
  }

  async signUp(credentials: AuthCredentials): Promise<AuthSession> {
    const username = normalizeUsername(credentials.username);
    assertPassword(credentials.password);
    if (this.database.getUserByUsername(username)) {
      throw new Error("\u8be5\u8d26\u53f7\u5df2\u5b58\u5728\u3002");
    }

    const salt = randomBytes(16).toString("hex");
    const now = new Date().toISOString();
    const user: StoredUser = {
      id: randomUUID(),
      username,
      passwordHash: hashPassword(credentials.password, salt),
      salt,
      createdAt: now
    };
    await this.database.createUser(user);
    this.session = toSession(user);
    await this.rememberUser(user.id);
    return this.session;
  }

  async login(credentials: AuthCredentials): Promise<AuthSession> {
    const username = normalizeUsername(credentials.username);
    const user = this.database.getUserByUsername(username);
    if (!user || !verifyPassword(credentials.password, user.salt, user.passwordHash)) {
      throw new Error("\u8d26\u53f7\u6216\u5bc6\u7801\u4e0d\u6b63\u786e\u3002");
    }
    this.session = toSession(user);
    await this.rememberUser(user.id);
    return this.session;
  }

  async logout(): Promise<void> {
    this.session = null;
    await fs.rm(this.rememberedPath, { force: true });
  }

  async deleteAccount(userId: string): Promise<void> {
    if (this.session?.userId === userId) {
      this.session = null;
    }
    const rememberedUser = await this.readRememberedUser();
    if (rememberedUser?.id === userId) {
      await fs.rm(this.rememberedPath, { force: true });
    }
    await this.database.deleteUser(userId);
  }

  requireSession(): AuthSession {
    if (!this.session) {
      throw new Error("\u8bf7\u5148\u767b\u5f55\u672c\u5730\u8d26\u53f7\u3002");
    }
    return this.session;
  }

  private async rememberUser(userId: string): Promise<void> {
    await fs.mkdir(path.dirname(this.rememberedPath), { recursive: true });
    await fs.writeFile(this.rememberedPath, JSON.stringify({ userId }), "utf8");
  }

  private async readRememberedUser(): Promise<StoredUser | null> {
    try {
      const raw = await fs.readFile(this.rememberedPath, "utf8");
      const parsed = JSON.parse(raw) as { userId?: string };
      if (!parsed.userId) return null;
      return this.database.getUserById(parsed.userId);
    } catch {
      return null;
    }
  }
}

function normalizeUsername(value: string): string {
  const username = value.trim().toLowerCase();
  if (!/^[a-z0-9_@.-]{3,48}$/.test(username)) {
    throw new Error(
      "\u8d26\u53f7\u9700\u8981 3-48 \u4f4d\uff0c\u53ef\u4f7f\u7528\u5b57\u6bcd\u3001\u6570\u5b57\u3001\u4e0b\u5212\u7ebf\u3001\u70b9\u3001\u6a2a\u7ebf\u6216 @\u3002"
    );
  }
  return username;
}

function assertPassword(password: string): void {
  if (password.length < 6 || password.length > 128) {
    throw new Error("\u5bc6\u7801\u9700\u8981 6-128 \u4f4d\u3002");
  }
}

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString("hex");
}

function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashPassword(password, salt), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function toSession(user: StoredUser): AuthSession {
  return {
    userId: user.id,
    username: user.username,
    createdAt: user.createdAt
  };
}
