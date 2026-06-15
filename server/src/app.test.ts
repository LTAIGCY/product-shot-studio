import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "./app";
import { createPrismaClient } from "./db";

process.env.DATABASE_URL = process.env.DATABASE_URL || "file:../data/product-shot-studio-test.db";

const prisma = createPrismaClient();
let app: FastifyInstance;

beforeAll(async () => {
  app = createApp({
    prisma,
    adminPassword: "admin-test",
    tokenSecret: "test-token-secret"
  });
  await app.ready();
});

beforeEach(async () => {
  await prisma.auditEvent.deleteMany();
  await prisma.generationJob.deleteMany();
  await prisma.usageReservation.deleteMany();
  await prisma.walletTransaction.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

describe("Product Shot Studio ledger backend", () => {
  it("creates unique account IDs while allowing duplicate account names", async () => {
    const first = await register("Alice", "secret123");
    expect(first.statusCode).toBe(200);
    expect(first.json().session.username).toBe("alice");
    expect(first.json().session.accountId).toMatch(/^ps_[a-f0-9]{12}$/);

    const duplicate = await register(" alice ", "secret123");
    expect(duplicate.statusCode).toBe(200);
    expect(duplicate.json().session.username).toBe("alice");
    expect(duplicate.json().session.accountId).not.toBe(first.json().session.accountId);

    const ambiguous = await login("alice", "secret123");
    expect(ambiguous.statusCode).toBe(409);
    expect(ambiguous.json().message).toContain("唯一账号 ID");

    const byAccountId = await login(first.json().session.accountId, "secret123");
    expect(byAccountId.statusCode).toBe(200);
  });

  it("hashes passwords and validates login", async () => {
    const registered = await register("bob", "secret123");
    const accountId = registered.json().session.accountId;
    const stored = await prisma.user.findUnique({ where: { accountId } });
    expect(stored?.passwordHash).not.toBe("secret123");
    expect(stored?.passwordSalt).toBeTruthy();

    const failed = await login(accountId, "wrong-password");
    expect(failed.statusCode).toBe(401);

    const success = await login(accountId, "secret123");
    expect(success.statusCode).toBe(200);
    expect(success.json().token).toBeTruthy();
  });

  it("exposes safe password metadata and lets an administrator reset a password", async () => {
    const registered = await register("reset-user", "secret123");
    const accountId = registered.json().session.accountId;
    const user = await prisma.user.findUniqueOrThrow({ where: { accountId } });
    const adminAuthToken = await adminToken();

    const users = await app.inject({
      method: "GET",
      url: "/admin/users",
      headers: { authorization: `Bearer ${adminAuthToken}` }
    });
    const item = users.json().items[0];
    expect(item.accountId).toBe(accountId);
    expect(item.password.masked).toBe("••••••••");
    expect(item.password.algorithm).toBe("scrypt");
    expect(item.password.passwordHash).toBeUndefined();

    const reset = await app.inject({
      method: "POST",
      url: `/admin/users/${user.id}/reset-password`,
      headers: { authorization: `Bearer ${adminAuthToken}` },
      payload: { password: "new-secret-456" }
    });
    expect(reset.statusCode).toBe(200);

    expect((await login(accountId, "secret123")).statusCode).toBe(401);
    expect((await login(accountId, "new-secret-456")).statusCode).toBe(200);
  });

  it("recharges, reserves, commits usage and exposes admin overview", async () => {
    const auth = await registerAndToken("carol", "secret123");
    const emptyWallet = await api("GET", "/api/wallet", auth);
    expect(emptyWallet.json().wallet.balancePoints).toBe(0);

    const recharge = await api("POST", "/api/recharge/simulate", auth, {
      providerId: "volcano",
      modelId: "doubao-seedream-4-0-250828",
      amountPoints: 1000
    });
    expect(recharge.statusCode).toBe(200);
    expect(recharge.json().wallet.balancePoints).toBe(1000);

    const reserve = await api("POST", "/api/usage/reserve", auth, {
      providerId: "volcano",
      modelId: "doubao-seedream-4-0-250828",
      mediaType: "image",
      estimatedPoints: 300
    });
    expect(reserve.statusCode).toBe(200);
    expect(reserve.json().wallet.reservedPoints).toBe(300);

    const commit = await api("POST", "/api/usage/commit", auth, {
      reservationId: reserve.json().reservationId,
      jobId: "job-1",
      mediaType: "image",
      providerId: "volcano",
      modelId: "doubao-seedream-4-0-250828",
      status: "completed",
      chargedPoints: 200,
      resultCount: 2
    });
    expect(commit.statusCode).toBe(200);
    expect(commit.json().wallet.balancePoints).toBe(800);
    expect(commit.json().wallet.reservedPoints).toBe(0);

    const adminAuthToken = await adminToken();
    const overview = await app.inject({
      method: "GET",
      url: "/admin/overview",
      headers: { authorization: `Bearer ${adminAuthToken}` }
    });
    expect(overview.statusCode).toBe(200);
    expect(overview.json().totalUsers).toBe(1);
    expect(overview.json().totalRechargedPoints).toBe(1000);
    expect(overview.json().totalUsedPoints).toBe(200);
  });

  it("exposes recent audit events to the admin dashboard", async () => {
    const auth = await registerAndToken("monitor", "secret123");
    await api("POST", "/api/recharge/simulate", auth, {
      providerId: "volcano",
      modelId: "doubao-seedream-5-0-260128",
      amountPoints: 600
    });

    const adminAuthToken = await adminToken();
    const auditEvents = await app.inject({
      method: "GET",
      url: "/admin/audit-events?limit=10",
      headers: { authorization: `Bearer ${adminAuthToken}` }
    });

    expect(auditEvents.statusCode).toBe(200);
    const actions = auditEvents.json().items.map((event: { action: string }) => event.action);
    expect(actions).toContain("user.register");
    expect(actions).toContain("wallet.recharge_simulated");
    expect(auditEvents.json().items[0].createdAt).toBeTruthy();
  });

  it("tracks online and offline user presence", async () => {
    const auth = await registerAndToken("presence-user", "secret123");
    await api("POST", "/api/presence/heartbeat", auth);

    const adminAuthToken = await adminToken();
    const onlineUsers = await app.inject({
      method: "GET",
      url: "/admin/users",
      headers: { authorization: `Bearer ${adminAuthToken}` }
    });
    expect(onlineUsers.statusCode).toBe(200);
    expect(onlineUsers.json().items[0].presenceStatus).toBe("online");

    const overview = await app.inject({
      method: "GET",
      url: "/admin/overview",
      headers: { authorization: `Bearer ${adminAuthToken}` }
    });
    expect(overview.json().onlineUsers).toBe(1);

    const logout = await api("POST", "/api/auth/logout", auth);
    expect(logout.statusCode).toBe(200);

    const offlineUsers = await app.inject({
      method: "GET",
      url: "/admin/users",
      headers: { authorization: `Bearer ${adminAuthToken}` }
    });
    expect(offlineUsers.json().items[0].presenceStatus).toBe("offline");
  });

  it("rejects reserve when available points are insufficient", async () => {
    const auth = await registerAndToken("dave", "secret123");
    const reserve = await api("POST", "/api/usage/reserve", auth, {
      providerId: "aliyun",
      modelId: "qwen-image-edit",
      mediaType: "image",
      estimatedPoints: 100
    });
    expect(reserve.statusCode).toBe(402);
    expect(reserve.json().message).toContain("积分余额不足");
  });

  it("cancels a reservation without charging points", async () => {
    const auth = await registerAndToken("eve", "secret123");
    await api("POST", "/api/recharge/simulate", auth, { amountPoints: 500 });
    const reserve = await api("POST", "/api/usage/reserve", auth, { estimatedPoints: 300, mediaType: "image" });
    const cancel = await api("POST", "/api/usage/cancel", auth, {
      reservationId: reserve.json().reservationId,
      errorMessage: "模型调用失败"
    });
    expect(cancel.statusCode).toBe(200);
    expect(cancel.json().wallet.balancePoints).toBe(500);
    expect(cancel.json().wallet.reservedPoints).toBe(0);
  });

  it("keeps wallet transactions isolated per user", async () => {
    const alice = await registerAndToken("alice", "secret123");
    const bob = await registerAndToken("bob", "secret123");
    await api("POST", "/api/recharge/simulate", alice, { amountPoints: 300 });
    await api("POST", "/api/recharge/simulate", bob, { amountPoints: 700 });

    const aliceTransactions = await api("GET", "/api/wallet/transactions", alice);
    const bobTransactions = await api("GET", "/api/wallet/transactions", bob);

    expect(aliceTransactions.json().items).toHaveLength(1);
    expect(aliceTransactions.json().items[0].amountPoints).toBe(300);
    expect(bobTransactions.json().items).toHaveLength(1);
    expect(bobTransactions.json().items[0].amountPoints).toBe(700);
  });
});

async function register(username: string, password: string) {
  return app.inject({
    method: "POST",
    url: "/api/auth/register",
    payload: { username, password }
  });
}

async function login(username: string, password: string) {
  return app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { username, password }
  });
}

async function registerAndToken(username: string, password: string): Promise<string> {
  const response = await register(username, password);
  expect(response.statusCode).toBe(200);
  return response.json().token;
}

async function api(method: "GET" | "POST", url: string, token: string, payload?: unknown) {
  return app.inject({
    method,
    url,
    headers: { authorization: `Bearer ${token}` },
    payload
  });
}

async function adminToken(): Promise<string> {
  const loginResponse = await app.inject({
    method: "POST",
    url: "/admin/login",
    payload: { password: "admin-test" }
  });
  expect(loginResponse.statusCode).toBe(200);
  return loginResponse.json().token;
}
