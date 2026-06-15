import fs from "node:fs/promises";
import path from "node:path";
import type {
  AuthCredentials,
  AuthSession,
  JobStatus,
  LocalAccountSummary,
  MediaType,
  ProviderId,
  RechargeReceipt,
  RechargeRequest,
  WalletSummary,
  WalletTransaction
} from "../../shared/types";

interface AuthResponse {
  token: string;
  session: AuthSession;
}

interface StoredSession {
  token: string;
  session: AuthSession;
}

interface CachedAccount extends LocalAccountSummary {
  lastUsedAt: string;
}

interface BackendWallet {
  userId: string;
  balancePoints: number;
  reservedPoints?: number;
  totalRechargedPoints: number;
  totalUsedPoints: number;
  updatedAt: string;
}

interface BackendTransaction {
  id: string;
  userId: string;
  type: WalletTransaction["type"];
  amountPoints: number;
  balanceAfterPoints: number;
  providerId?: ProviderId;
  modelId?: string;
  jobId?: string;
  note: string;
  createdAt: string;
}

export interface UsageReservationReceipt {
  reservationId: string;
  estimatedPoints: number;
  wallet: WalletSummary;
}

export interface CommitUsageInput {
  reservationId: string;
  jobId: string;
  mediaType: MediaType;
  providerId: ProviderId;
  modelId: string;
  status: JobStatus;
  chargedPoints: number;
  resultCount: number;
  errorMessage?: string;
}

export interface ReserveUsageInput {
  estimatedPoints: number;
  mediaType: MediaType;
  providerId: ProviderId;
  modelId: string;
  note?: string;
}

export class BackendClient {
  private currentSession: StoredSession | null = null;
  private readonly baseUrl: string;
  private readonly sessionPath: string;
  private readonly accountsPath: string;

  constructor(userDataPath: string, baseUrl = getDefaultBackendUrl()) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.sessionPath = path.join(userDataPath, "backend-session.json");
    this.accountsPath = path.join(userDataPath, "backend-accounts.json");
  }

  getBackendUrl(): string {
    return this.baseUrl;
  }

  getSession(): AuthSession | null {
    return this.currentSession?.session ?? null;
  }

  async getRememberedSession(): Promise<AuthSession | null> {
    if (this.currentSession) return this.currentSession.session;
    const stored = await this.readStoredSession();
    return stored?.session ?? null;
  }

  async resumeRememberedSession(): Promise<AuthSession | null> {
    const stored = await this.readStoredSession();
    if (!stored) return null;
    this.currentSession = stored;
    const response = await this.request<{ session: AuthSession }>("/api/me", { method: "GET" });
    this.currentSession = { token: stored.token, session: response.session };
    await this.writeStoredSession(this.currentSession);
    await this.rememberAccount(response.session);
    await this.heartbeat().catch(() => undefined);
    return response.session;
  }

  async listAccounts(): Promise<LocalAccountSummary[]> {
    const accounts = await this.readCachedAccounts();
    const remembered = await this.getRememberedSession();
    return accounts.map((account) => ({
      userId: account.userId,
      accountId: account.accountId ?? account.username,
      username: account.username,
      createdAt: account.createdAt,
      remembered: account.userId === remembered?.userId
    }));
  }

  async deleteAccount(userId: string): Promise<void> {
    const accounts = await this.readCachedAccounts();
    await this.writeCachedAccounts(accounts.filter((account) => account.userId !== userId));
    if (this.currentSession?.session.userId === userId) {
      this.currentSession = null;
    }
    const stored = await this.readStoredSession();
    if (stored?.session.userId === userId) {
      await fs.rm(this.sessionPath, { force: true });
    }
  }

  async signUp(credentials: AuthCredentials): Promise<AuthSession> {
    const response = await this.request<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: credentials,
      skipAuth: true
    });
    await this.setAuthenticatedSession(response);
    return response.session;
  }

  async login(credentials: AuthCredentials): Promise<AuthSession> {
    const response = await this.request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: credentials,
      skipAuth: true
    });
    await this.setAuthenticatedSession(response);
    return response.session;
  }

  async logout(): Promise<void> {
    await this.markOffline().catch(() => undefined);
    this.currentSession = null;
    await fs.rm(this.sessionPath, { force: true });
  }

  async heartbeat(): Promise<void> {
    await this.request<{ ok: boolean }>("/api/presence/heartbeat", { method: "POST" });
  }

  async markOffline(): Promise<void> {
    await this.request<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
  }

  requireSession(): AuthSession {
    const session = this.getSession();
    if (!session) {
      throw new Error("请先登录账号。");
    }
    return session;
  }

  async getWallet(): Promise<WalletSummary> {
    const response = await this.request<{ wallet: BackendWallet }>("/api/wallet", { method: "GET" });
    return mapWallet(response.wallet);
  }

  async listWalletTransactions(limit = 100): Promise<WalletTransaction[]> {
    const response = await this.request<{ items: BackendTransaction[] }>(
      `/api/wallet/transactions?limit=${encodeURIComponent(String(limit))}`,
      { method: "GET" }
    );
    return response.items.map(mapTransaction);
  }

  async recharge(request: RechargeRequest): Promise<RechargeReceipt> {
    const response = await this.request<{ wallet: BackendWallet; transaction: BackendTransaction }>(
      "/api/recharge/simulate",
      {
        method: "POST",
        body: {
          providerId: request.providerId,
          modelId: request.modelId,
          amountPoints: request.amountCents
        }
      }
    );
    return {
      wallet: mapWallet(response.wallet),
      transaction: mapTransaction(response.transaction)
    };
  }

  async reserveUsage(input: ReserveUsageInput): Promise<UsageReservationReceipt> {
    const response = await this.request<{ reservationId: string; estimatedPoints: number; wallet: BackendWallet }>(
      "/api/usage/reserve",
      {
        method: "POST",
        body: input
      }
    );
    return {
      reservationId: response.reservationId,
      estimatedPoints: response.estimatedPoints,
      wallet: mapWallet(response.wallet)
    };
  }

  async commitUsage(input: CommitUsageInput): Promise<WalletSummary> {
    const response = await this.request<{ wallet: BackendWallet }>("/api/usage/commit", {
      method: "POST",
      body: input
    });
    return mapWallet(response.wallet);
  }

  async cancelUsage(input: { reservationId: string; jobId?: string; errorMessage?: string }): Promise<WalletSummary> {
    const response = await this.request<{ wallet: BackendWallet }>("/api/usage/cancel", {
      method: "POST",
      body: input
    });
    return mapWallet(response.wallet);
  }

  private async setAuthenticatedSession(response: AuthResponse): Promise<void> {
    this.currentSession = response;
    await this.writeStoredSession(response);
    await this.rememberAccount(response.session);
    await this.heartbeat().catch(() => undefined);
  }

  private async request<T>(
    endpoint: string,
    options: { method: "GET" | "POST"; body?: unknown; skipAuth?: boolean }
  ): Promise<T> {
    const headers: Record<string, string> = {};
    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    if (!options.skipAuth) {
      const stored = this.currentSession ?? (await this.readStoredSession());
      if (!stored?.token) {
        throw new Error("请先登录账号。");
      }
      this.currentSession = stored;
      headers.Authorization = `Bearer ${stored.token}`;
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: options.method,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body)
      });
    } catch {
      throw new Error("后端服务未连接，请先启动本地账本服务。");
    }

    const text = await response.text();
    const payload = text ? safeParseJson(text) : {};
    if (!response.ok) {
      const message =
        typeof payload === "object" && payload && "message" in payload
          ? String((payload as { message?: string }).message)
          : "后端请求失败。";
      throw new Error(translateBackendError(message));
    }
    return payload as T;
  }

  private async readStoredSession(): Promise<StoredSession | null> {
    if (this.currentSession) return this.currentSession;
    try {
      const raw = await fs.readFile(this.sessionPath, "utf8");
      const parsed = JSON.parse(raw) as StoredSession;
      if (!parsed.token || !parsed.session?.userId) return null;
      parsed.session.accountId = parsed.session.accountId ?? parsed.session.username;
      return parsed;
    } catch {
      return null;
    }
  }

  private async writeStoredSession(session: StoredSession): Promise<void> {
    await fs.mkdir(path.dirname(this.sessionPath), { recursive: true });
    await fs.writeFile(this.sessionPath, JSON.stringify(session, null, 2), "utf8");
  }

  private async rememberAccount(session: AuthSession): Promise<void> {
    const accounts = await this.readCachedAccounts();
    const next: CachedAccount = {
      userId: session.userId,
      accountId: session.accountId,
      username: session.username,
      createdAt: session.createdAt,
      remembered: true,
      lastUsedAt: new Date().toISOString()
    };
    await this.writeCachedAccounts([next, ...accounts.filter((account) => account.userId !== session.userId)]);
  }

  private async readCachedAccounts(): Promise<CachedAccount[]> {
    try {
      const raw = await fs.readFile(this.accountsPath, "utf8");
      const parsed = JSON.parse(raw) as CachedAccount[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private async writeCachedAccounts(accounts: CachedAccount[]): Promise<void> {
    await fs.mkdir(path.dirname(this.accountsPath), { recursive: true });
    await fs.writeFile(this.accountsPath, JSON.stringify(accounts, null, 2), "utf8");
  }
}

function getDefaultBackendUrl(): string {
  return process.env.PRODUCT_STUDIO_BACKEND_URL ?? process.env.PRODUCT_SHOT_BACKEND_URL ?? "http://127.0.0.1:4317";
}

function mapWallet(wallet: BackendWallet): WalletSummary {
  return {
    userId: wallet.userId,
    balanceCents: wallet.balancePoints,
    reservedCents: wallet.reservedPoints ?? 0,
    usedCents: wallet.totalUsedPoints,
    totalRechargedCents: wallet.totalRechargedPoints,
    currency: "CNY",
    updatedAt: wallet.updatedAt
  };
}

function mapTransaction(transaction: BackendTransaction): WalletTransaction {
  return {
    id: transaction.id,
    userId: transaction.userId,
    type: transaction.type,
    amountCents: transaction.amountPoints,
    balanceAfterCents: transaction.balanceAfterPoints,
    providerId: transaction.providerId,
    modelId: transaction.modelId,
    jobId: transaction.jobId,
    note: transaction.note,
    createdAt: transaction.createdAt
  };
}

function safeParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function translateBackendError(message: string): string {
  if (/ECONNREFUSED|fetch failed|network/i.test(message)) {
    return "后端服务未连接，请先启动本地账本服务。";
  }
  if (/not enough|insufficient|balance/i.test(message)) {
    return "积分余额不足，请先充值或降低生成数量/质量。";
  }
  return message;
}
