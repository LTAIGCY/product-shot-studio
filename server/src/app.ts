import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import { Prisma, type PrismaClient, type User, type Wallet, type WalletTransaction } from "@prisma/client";
import { renderAdminHtml } from "./adminHtml";
import {
  assertPassword,
  createAccountId,
  createAdminToken,
  createPasswordRecord,
  createUserToken,
  getBearerToken,
  httpError,
  normalizeUsername,
  verifyPassword,
  verifyToken,
  type AdminTokenPayload,
  type UserTokenPayload
} from "./auth";
import type {
  AdminAdjustBody,
  AdminResetPasswordBody,
  AuthBody,
  CancelBody,
  CommitBody,
  RechargeBody,
  ReserveBody
} from "./types";

export interface CreateAppOptions {
  prisma: PrismaClient;
  adminPassword?: string;
  tokenSecret?: string;
}

interface UserContext {
  userId: string;
  accountId: string;
  username: string;
  createdAt: string;
}

const ONLINE_WINDOW_MS = 90_000;

export function createApp(options: CreateAppOptions): FastifyInstance {
  const prisma = options.prisma;
  const tokenSecret = options.tokenSecret ?? process.env.TOKEN_SECRET ?? "dev-product-shot-studio-token-secret";
  const adminPassword = options.adminPassword ?? process.env.ADMIN_PASSWORD ?? "admin123456";
  const app = Fastify({ logger: false });

  app.setErrorHandler((error, _request, reply) => {
    const typedError = error as Error & { statusCode?: number };
    const statusCode = Number(typedError.statusCode) || 500;
    const message = statusCode >= 500 ? "后端服务内部错误，请查看控制台日志。" : typedError.message;
    if (statusCode >= 500) {
      app.log.error(error);
    }
    void reply.status(statusCode).send({
      error: message,
      message,
      statusCode
    });
  });

  app.get("/health", async () => ({ ok: true, service: "product-shot-studio-server" }));

  app.post("/api/auth/register", async (request) => {
    const body = request.body as AuthBody;
    const username = normalizeUsername(body.username ?? "");
    assertPassword(body.password ?? "");
    const passwordRecord = createPasswordRecord(body.password ?? "");
    const now = new Date();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const accountId = createAccountId();
        const user = await prisma.user.create({
          data: {
            accountId,
            username,
            ...passwordRecord,
            passwordUpdatedAt: now,
            lastLoginAt: now,
            lastSeenAt: now,
            wallet: {
              create: {}
            },
            auditEvents: {
              create: {
                action: "user.register",
                ip: request.ip,
                metadataJson: JSON.stringify({ accountId })
              }
            }
          }
        });
        return {
          token: createUserToken({
            userId: user.id,
            accountId: user.accountId,
            username: user.username,
            createdAt: user.createdAt,
            secret: tokenSecret
          }),
          session: toSession(user)
        };
      } catch (error) {
        if (isUniqueViolation(error) && attempt < 4) continue;
        throw error;
      }
    }
    throw httpError(500, "账号 ID 生成失败，请稍后重试。");
  });

  app.post("/api/auth/login", async (request) => {
    const body = request.body as AuthBody;
    const locator = String(body.accountId ?? body.username ?? "").trim();
    if (!locator) throw httpError(400, "请输入账号 ID 或账号名。");
    const normalizedLocator = locator.toLowerCase();
    let user = await prisma.user.findUnique({ where: { accountId: normalizedLocator } });
    if (!user) {
      const username = normalizeUsername(locator);
      const matches = await prisma.user.findMany({
        where: { username },
        orderBy: { createdAt: "asc" },
        take: 2
      });
      if (matches.length > 1) {
        throw httpError(409, "该账号名对应多个账号，请使用唯一账号 ID 登录。");
      }
      user = matches[0] ?? null;
    }
    if (!user || user.status !== "active" || !verifyPassword(body.password ?? "", user.passwordSalt, user.passwordHash)) {
      await writeAudit(prisma, {
        userId: user?.id,
        action: "auth.login_failed",
        ip: request.ip,
        metadata: { locator }
      });
      throw httpError(401, "账号或密码不正确。");
    }
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastSeenAt: new Date(),
        lastLogoutAt: null,
        auditEvents: {
          create: {
            action: "auth.login",
            ip: request.ip
          }
        }
      }
    });
    return {
      token: createUserToken({
        userId: updatedUser.id,
        accountId: updatedUser.accountId,
        username: updatedUser.username,
        createdAt: updatedUser.createdAt,
        secret: tokenSecret
      }),
      session: toSession(updatedUser)
    };
  });

  app.get("/api/me", async (request) => {
    const user = await requireUser(prisma, request, tokenSecret);
    return {
      session: {
        userId: user.userId,
        accountId: user.accountId,
        username: user.username,
        createdAt: user.createdAt
      }
    };
  });

  app.post("/api/presence/heartbeat", async (request) => {
    const user = await requireUser(prisma, request, tokenSecret);
    const updatedUser = await prisma.user.update({
      where: { id: user.userId },
      data: {
        lastSeenAt: new Date(),
        lastLogoutAt: null
      }
    });
    return { ok: true, presence: mapPresence(updatedUser) };
  });

  app.post("/api/auth/logout", async (request) => {
    const user = await requireUser(prisma, request, tokenSecret);
    await prisma.user.update({
      where: { id: user.userId },
      data: {
        lastLogoutAt: new Date()
      }
    });
    await writeAudit(prisma, { userId: user.userId, action: "auth.logout", ip: request.ip });
    return { ok: true };
  });

  app.get("/api/wallet", async (request) => {
    const user = await requireUser(prisma, request, tokenSecret);
    const wallet = await getOrCreateWallet(prisma, user.userId);
    return { wallet: mapWallet(wallet) };
  });

  app.get("/api/wallet/transactions", async (request) => {
    const user = await requireUser(prisma, request, tokenSecret);
    const limit = clampLimit((request.query as { limit?: string | number }).limit, 100);
    const items = await prisma.walletTransaction.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: "desc" },
      take: limit
    });
    return { items: items.map(mapTransaction) };
  });

  app.post("/api/recharge/simulate", async (request) => {
    const user = await requireUser(prisma, request, tokenSecret);
    const body = request.body as RechargeBody;
    const amountPoints = normalizePositiveInt(body.amountPoints ?? body.amountCents, "充值积分需要大于 0。");
    if (amountPoints < 100 || amountPoints > 1000000) {
      throw httpError(400, "充值积分需要在 100 到 1000000 之间。");
    }
    const result = await prisma.$transaction(async (tx) => {
      const wallet = await ensureWallet(tx, user.userId);
      const updatedWallet = await tx.wallet.update({
        where: { userId: user.userId },
        data: {
          balancePoints: { increment: amountPoints },
          totalRechargedPoints: { increment: amountPoints }
        }
      });
      const transaction = await tx.walletTransaction.create({
        data: {
          userId: user.userId,
          type: "recharge",
          amountPoints,
          balanceAfterPoints: wallet.balancePoints + amountPoints,
          providerId: body.providerId,
          modelId: body.modelId,
          note: "本地模拟充值入账。"
        }
      });
      await tx.auditEvent.create({
        data: {
          userId: user.userId,
          action: "wallet.recharge_simulated",
          ip: request.ip,
          metadataJson: JSON.stringify({ amountPoints, providerId: body.providerId, modelId: body.modelId })
        }
      });
      return { wallet: updatedWallet, transaction };
    });
    return {
      wallet: mapWallet(result.wallet),
      transaction: mapTransaction(result.transaction)
    };
  });

  app.post("/api/usage/reserve", async (request) => {
    const user = await requireUser(prisma, request, tokenSecret);
    const body = request.body as ReserveBody;
    const estimatedPoints = normalizePositiveInt(body.estimatedPoints ?? body.estimatedCents, "预扣积分需要大于 0。");
    const result = await prisma.$transaction(async (tx) => {
      const wallet = await ensureWallet(tx, user.userId);
      const availablePoints = wallet.balancePoints - wallet.reservedPoints;
      if (availablePoints < estimatedPoints) {
        throw httpError(
          402,
          `积分余额不足：本次预计需要 ${estimatedPoints.toLocaleString("zh-CN")} 积分，当前可用余额 ${availablePoints.toLocaleString("zh-CN")} 积分。请先充值或降低生成数量/质量。`
        );
      }
      const reservation = await tx.usageReservation.create({
        data: {
          userId: user.userId,
          estimatedPoints,
          providerId: body.providerId,
          modelId: body.modelId,
          mediaType: body.mediaType ?? "image"
        }
      });
      const updatedWallet = await tx.wallet.update({
        where: { userId: user.userId },
        data: {
          reservedPoints: { increment: estimatedPoints }
        }
      });
      await tx.auditEvent.create({
        data: {
          userId: user.userId,
          action: "usage.reserve",
          ip: request.ip,
          metadataJson: JSON.stringify({ reservationId: reservation.id, estimatedPoints, note: body.note })
        }
      });
      return { reservation, wallet: updatedWallet };
    });
    return {
      reservationId: result.reservation.id,
      estimatedPoints: result.reservation.estimatedPoints,
      wallet: mapWallet(result.wallet)
    };
  });

  app.post("/api/usage/commit", async (request) => {
    const user = await requireUser(prisma, request, tokenSecret);
    const body = request.body as CommitBody;
    const reservationId = String(body.reservationId ?? "");
    if (!reservationId) throw httpError(400, "缺少预扣记录。");
    const result = await prisma.$transaction(async (tx) => {
      const reservation = await tx.usageReservation.findFirst({
        where: { id: reservationId, userId: user.userId, status: "reserved" }
      });
      if (!reservation) {
        throw httpError(404, "预扣记录不存在或已经处理。");
      }
      const requestedCharge = Math.max(0, Math.floor(Number(body.chargedPoints ?? body.chargedCents ?? 0)));
      const chargedPoints = Math.min(requestedCharge, reservation.estimatedPoints);
      const wallet = await ensureWallet(tx, user.userId);
      const balanceAfterPoints = wallet.balancePoints - chargedPoints;
      const updatedWallet = await tx.wallet.update({
        where: { userId: user.userId },
        data: {
          balancePoints: { decrement: chargedPoints },
          reservedPoints: { decrement: reservation.estimatedPoints },
          totalUsedPoints: { increment: chargedPoints }
        }
      });
      const job = await tx.generationJob.create({
        data: {
          userId: user.userId,
          reservationId,
          mediaType: body.mediaType ?? reservation.mediaType ?? "image",
          providerId: body.providerId ?? reservation.providerId,
          modelId: body.modelId ?? reservation.modelId,
          status: normalizeJobStatus(body.status),
          estimatedPoints: reservation.estimatedPoints,
          chargedPoints,
          resultCount: Math.max(0, Math.floor(Number(body.resultCount) || 0)),
          errorMessage: body.errorMessage,
          completedAt: new Date()
        }
      });
      await tx.usageReservation.update({
        where: { id: reservationId },
        data: {
          status: "committed",
          committedAt: new Date(),
          jobId: body.jobId ?? job.id
        }
      });
      const transaction =
        chargedPoints > 0
          ? await tx.walletTransaction.create({
              data: {
                userId: user.userId,
                type: "usage",
                amountPoints: -chargedPoints,
                balanceAfterPoints,
                providerId: body.providerId ?? reservation.providerId,
                modelId: body.modelId ?? reservation.modelId,
                jobId: body.jobId ?? job.id,
                note: `生成成功扣费：${Math.max(0, Math.floor(Number(body.resultCount) || 0))} 个结果。`
              }
            })
          : null;
      await tx.auditEvent.create({
        data: {
          userId: user.userId,
          action: "usage.commit",
          ip: request.ip,
          metadataJson: JSON.stringify({ reservationId, jobId: body.jobId ?? job.id, chargedPoints })
        }
      });
      return { wallet: updatedWallet, transaction, job };
    });
    return {
      wallet: mapWallet(result.wallet),
      transaction: result.transaction ? mapTransaction(result.transaction) : null,
      job: mapJob(result.job)
    };
  });

  app.post("/api/usage/cancel", async (request) => {
    const user = await requireUser(prisma, request, tokenSecret);
    const body = request.body as CancelBody;
    const reservationId = String(body.reservationId ?? "");
    if (!reservationId) throw httpError(400, "缺少预扣记录。");
    const result = await prisma.$transaction(async (tx) => {
      const reservation = await tx.usageReservation.findFirst({
        where: { id: reservationId, userId: user.userId, status: "reserved" }
      });
      if (!reservation) {
        throw httpError(404, "预扣记录不存在或已经处理。");
      }
      const wallet = await ensureWallet(tx, user.userId);
      const updatedWallet = await tx.wallet.update({
        where: { userId: user.userId },
        data: {
          reservedPoints: { decrement: Math.min(wallet.reservedPoints, reservation.estimatedPoints) }
        }
      });
      const job =
        body.jobId || body.errorMessage
          ? await tx.generationJob.create({
              data: {
                userId: user.userId,
                reservationId,
                mediaType: reservation.mediaType ?? "image",
                providerId: reservation.providerId,
                modelId: reservation.modelId,
                status: "canceled",
                estimatedPoints: reservation.estimatedPoints,
                chargedPoints: 0,
                resultCount: 0,
                errorMessage: body.errorMessage,
                completedAt: new Date()
              }
            })
          : null;
      await tx.usageReservation.update({
        where: { id: reservationId },
        data: {
          status: "canceled",
          canceledAt: new Date(),
          jobId: body.jobId ?? job?.id
        }
      });
      await tx.auditEvent.create({
        data: {
          userId: user.userId,
          action: "usage.cancel",
          ip: request.ip,
          metadataJson: JSON.stringify({ reservationId, jobId: body.jobId ?? job?.id, errorMessage: body.errorMessage })
        }
      });
      return { wallet: updatedWallet, job };
    });
    return {
      wallet: mapWallet(result.wallet),
      job: result.job ? mapJob(result.job) : null
    };
  });

  app.get("/admin", async (_request, reply) => {
    return reply.type("text/html; charset=utf-8").send(renderAdminHtml());
  });

  app.post("/admin/login", async (request) => {
    const body = request.body as { password?: string };
    if (body.password !== adminPassword) {
      await writeAudit(prisma, { action: "admin.login_failed", ip: request.ip });
      throw httpError(401, "管理员密码不正确。");
    }
    await writeAudit(prisma, { action: "admin.login", ip: request.ip });
    return { token: createAdminToken(tokenSecret) };
  });

  app.get("/admin/overview", async (request) => {
    requireAdmin(request, tokenSecret);
    const [totalUsers, usersForPresence, walletSums, recentRecharge, recentUsage, failedJobs] = await Promise.all([
      prisma.user.count(),
      prisma.user.findMany({
        select: {
          status: true,
          accountId: true,
          lastSeenAt: true,
          lastLogoutAt: true
        }
      }),
      prisma.wallet.aggregate({
        _sum: {
          balancePoints: true,
          reservedPoints: true,
          totalRechargedPoints: true,
          totalUsedPoints: true
        }
      }),
      prisma.walletTransaction.findMany({
        where: { type: "recharge" },
        include: { user: { select: { username: true } } },
        orderBy: { createdAt: "desc" },
        take: 10
      }),
      prisma.walletTransaction.findMany({
        where: { type: "usage" },
        include: { user: { select: { username: true } } },
        orderBy: { createdAt: "desc" },
        take: 10
      }),
      prisma.generationJob.findMany({
        where: { status: "failed" },
        include: { user: { select: { username: true } } },
        orderBy: { createdAt: "desc" },
        take: 10
      })
    ]);
    const onlineUsers = usersForPresence.filter((user) => mapPresence(user).presenceStatus === "online").length;
    return {
      totalUsers,
      onlineUsers,
      totalBalancePoints: walletSums._sum.balancePoints ?? 0,
      totalReservedPoints: walletSums._sum.reservedPoints ?? 0,
      totalRechargedPoints: walletSums._sum.totalRechargedPoints ?? 0,
      totalUsedPoints: walletSums._sum.totalUsedPoints ?? 0,
      recentRecharge: recentRecharge.map(mapTransactionWithUser),
      recentUsage: recentUsage.map(mapTransactionWithUser),
      failedJobs: failedJobs.map(mapJobWithUser)
    };
  });

  app.get("/admin/users", async (request) => {
    requireAdmin(request, tokenSecret);
    const requestedLimit = (request.query as { limit?: string | number }).limit;
    const items = await prisma.user.findMany({
      include: { wallet: true },
      orderBy: { createdAt: "desc" },
      take: requestedLimit === undefined ? undefined : clampLimit(requestedLimit, 100)
    });
    return {
      items: items.map((user) => ({
        id: user.id,
        accountId: user.accountId,
        username: user.username,
        status: user.status,
        password: mapPasswordStatus(user),
        ...mapPresence(user),
        createdAt: user.createdAt.toISOString(),
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        wallet: mapWallet(user.wallet ?? emptyWallet(user.id))
      }))
    };
  });

  app.get<{ Params: { id: string } }>("/admin/users/:id", async (request) => {
    requireAdmin(request, tokenSecret);
    const user = await prisma.user.findUnique({
      where: { id: request.params.id },
      include: { wallet: true }
    });
    if (!user) throw httpError(404, "用户不存在。");
    return {
      id: user.id,
      accountId: user.accountId,
      username: user.username,
      status: user.status,
      password: mapPasswordStatus(user),
      ...mapPresence(user),
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      wallet: mapWallet(user.wallet ?? emptyWallet(user.id))
    };
  });

  app.get<{ Params: { id: string } }>("/admin/users/:id/transactions", async (request) => {
    requireAdmin(request, tokenSecret);
    const limit = clampLimit((request.query as { limit?: string | number }).limit, 100);
    const items = await prisma.walletTransaction.findMany({
      where: { userId: request.params.id },
      orderBy: { createdAt: "desc" },
      take: limit
    });
    return { items: items.map(mapTransaction) };
  });

  app.get("/admin/jobs", async (request) => {
    requireAdmin(request, tokenSecret);
    const query = request.query as { status?: string; limit?: string | number };
    const limit = clampLimit(query.limit, 100);
    const items = await prisma.generationJob.findMany({
      where: query.status ? { status: String(query.status) } : undefined,
      include: { user: { select: { username: true } } },
      orderBy: { createdAt: "desc" },
      take: limit
    });
    return { items: items.map(mapJobWithUser) };
  });

  app.get("/admin/recharges", async (request) => {
    requireAdmin(request, tokenSecret);
    const limit = clampLimit((request.query as { limit?: string | number }).limit, 100);
    const items = await prisma.walletTransaction.findMany({
      where: { type: "recharge" },
      include: { user: { select: { username: true } } },
      orderBy: { createdAt: "desc" },
      take: limit
    });
    return { items: items.map(mapTransactionWithUser) };
  });

  app.get("/admin/audit-events", async (request) => {
    requireAdmin(request, tokenSecret);
    const limit = clampLimit((request.query as { limit?: string | number }).limit, 100);
    const items = await prisma.auditEvent.findMany({
      include: { user: { select: { username: true } } },
      orderBy: { createdAt: "desc" },
      take: limit
    });
    return { items: items.map(mapAuditEventWithUser) };
  });

  app.post<{ Params: { id: string } }>("/admin/users/:id/adjust-points", async (request) => {
    requireAdmin(request, tokenSecret);
    const body = request.body as AdminAdjustBody;
    const amountPoints = Math.floor(Number(body.amountPoints) || 0);
    if (amountPoints === 0) throw httpError(400, "调整积分不能为 0。");
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: request.params.id } });
      if (!user) throw httpError(404, "用户不存在。");
      const wallet = await ensureWallet(tx, user.id);
      if (wallet.balancePoints + amountPoints < 0) {
        throw httpError(400, "调整后余额不能小于 0。");
      }
      const updatedWallet = await tx.wallet.update({
        where: { userId: user.id },
        data: {
          balancePoints: { increment: amountPoints }
        }
      });
      const transaction = await tx.walletTransaction.create({
        data: {
          userId: user.id,
          type: "adjustment",
          amountPoints,
          balanceAfterPoints: wallet.balancePoints + amountPoints,
          note: body.note || "管理员手动调整积分。"
        }
      });
      await tx.auditEvent.create({
        data: {
          userId: user.id,
          action: "admin.adjust_points",
          ip: request.ip,
          metadataJson: JSON.stringify({ amountPoints, note: body.note })
        }
      });
      return { wallet: updatedWallet, transaction };
    });
    return {
      wallet: mapWallet(result.wallet),
      transaction: mapTransaction(result.transaction)
    };
  });

  app.post<{ Params: { id: string } }>("/admin/users/:id/reset-password", async (request) => {
    requireAdmin(request, tokenSecret);
    const body = request.body as AdminResetPasswordBody;
    const password = String(body.password ?? "");
    assertPassword(password);
    const passwordRecord = createPasswordRecord(password);
    const user = await prisma.user.findUnique({ where: { id: request.params.id } });
    if (!user) throw httpError(404, "用户不存在。");
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...passwordRecord,
        passwordUpdatedAt: new Date(),
        auditEvents: {
          create: {
            action: "admin.reset_password",
            ip: request.ip,
            metadataJson: JSON.stringify({ accountId: user.accountId })
          }
        }
      }
    });
    return {
      ok: true,
      accountId: updatedUser.accountId,
      password: mapPasswordStatus(updatedUser)
    };
  });

  return app;
}

async function requireUser(prisma: PrismaClient, request: FastifyRequest, secret: string): Promise<UserContext> {
  const payload = verifyToken<UserTokenPayload>(getBearerToken(request.headers.authorization), secret);
  if (payload.kind !== "user") throw httpError(401, "请先登录。");
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user || user.status !== "active") throw httpError(401, "账号不可用，请重新登录。");
  return {
    userId: user.id,
    accountId: user.accountId,
    username: user.username,
    createdAt: user.createdAt.toISOString()
  };
}

function requireAdmin(request: FastifyRequest, secret: string): void {
  const payload = verifyToken<AdminTokenPayload>(getBearerToken(request.headers.authorization), secret);
  if (payload.kind !== "admin") throw httpError(403, "没有后台权限。");
}

async function getOrCreateWallet(prisma: PrismaClient, userId: string): Promise<Wallet> {
  return prisma.wallet.upsert({
    where: { userId },
    update: {},
    create: { userId }
  });
}

async function ensureWallet(tx: Prisma.TransactionClient, userId: string): Promise<Wallet> {
  return tx.wallet.upsert({
    where: { userId },
    update: {},
    create: { userId }
  });
}

async function writeAudit(
  prisma: PrismaClient,
  input: { userId?: string; action: string; ip?: string; metadata?: unknown }
): Promise<void> {
  await prisma.auditEvent.create({
    data: {
      userId: input.userId,
      action: input.action,
      ip: input.ip,
      metadataJson: input.metadata ? JSON.stringify(input.metadata) : undefined
    }
  });
}

function toSession(user: User): { userId: string; accountId: string; username: string; createdAt: string } {
  return {
    userId: user.id,
    accountId: user.accountId,
    username: user.username,
    createdAt: user.createdAt.toISOString()
  };
}

function mapPasswordStatus(user: {
  passwordHash: string;
  passwordSalt: string;
  passwordAlgo: string;
  passwordUpdatedAt: Date;
}) {
  return {
    configured: Boolean(user.passwordHash && user.passwordSalt),
    masked: "••••••••",
    algorithm: user.passwordAlgo,
    updatedAt: user.passwordUpdatedAt.toISOString()
  };
}

function mapPresence(user: {
  status?: string;
  lastSeenAt: Date | null;
  lastLogoutAt: Date | null;
}): {
  presenceStatus: "online" | "offline";
  presenceLabel: string;
  lastSeenAt: string | null;
  lastLogoutAt: string | null;
} {
  const isActive = user.status === undefined || user.status === "active";
  const lastSeenAt = user.lastSeenAt;
  const lastLogoutAt = user.lastLogoutAt;
  const loggedOutAfterSeen = Boolean(lastSeenAt && lastLogoutAt && lastLogoutAt.getTime() >= lastSeenAt.getTime());
  const recentlySeen = Boolean(lastSeenAt && Date.now() - lastSeenAt.getTime() <= ONLINE_WINDOW_MS);
  const online = isActive && recentlySeen && !loggedOutAfterSeen;
  return {
    presenceStatus: online ? "online" : "offline",
    presenceLabel: online ? "在线" : "离线",
    lastSeenAt: lastSeenAt?.toISOString() ?? null,
    lastLogoutAt: lastLogoutAt?.toISOString() ?? null
  };
}

function mapWallet(wallet: Wallet): {
  userId: string;
  balancePoints: number;
  reservedPoints: number;
  totalRechargedPoints: number;
  totalUsedPoints: number;
  updatedAt: string;
} {
  return {
    userId: wallet.userId,
    balancePoints: wallet.balancePoints,
    reservedPoints: wallet.reservedPoints,
    totalRechargedPoints: wallet.totalRechargedPoints,
    totalUsedPoints: wallet.totalUsedPoints,
    updatedAt: wallet.updatedAt.toISOString()
  };
}

function mapTransaction(transaction: WalletTransaction): {
  id: string;
  userId: string;
  type: string;
  amountPoints: number;
  balanceAfterPoints: number;
  providerId?: string;
  modelId?: string;
  jobId?: string;
  note: string;
  createdAt: string;
} {
  return {
    id: transaction.id,
    userId: transaction.userId,
    type: transaction.type,
    amountPoints: transaction.amountPoints,
    balanceAfterPoints: transaction.balanceAfterPoints,
    providerId: transaction.providerId ?? undefined,
    modelId: transaction.modelId ?? undefined,
    jobId: transaction.jobId ?? undefined,
    note: transaction.note,
    createdAt: transaction.createdAt.toISOString()
  };
}

function mapTransactionWithUser(transaction: WalletTransaction & { user?: { username: string } | null }) {
  return {
    ...mapTransaction(transaction),
    username: transaction.user?.username
  };
}

function mapJob(job: {
  id: string;
  userId: string;
  reservationId: string | null;
  mediaType: string;
  providerId: string | null;
  modelId: string | null;
  status: string;
  estimatedPoints: number;
  chargedPoints: number;
  resultCount: number;
  errorMessage: string | null;
  createdAt: Date;
  completedAt: Date | null;
}) {
  return {
    id: job.id,
    userId: job.userId,
    reservationId: job.reservationId,
    mediaType: job.mediaType,
    providerId: job.providerId,
    modelId: job.modelId,
    status: job.status,
    estimatedPoints: job.estimatedPoints,
    chargedPoints: job.chargedPoints,
    resultCount: job.resultCount,
    errorMessage: job.errorMessage,
    createdAt: job.createdAt.toISOString(),
    completedAt: job.completedAt?.toISOString() ?? null
  };
}

function mapJobWithUser(job: Parameters<typeof mapJob>[0] & { user?: { username: string } | null }) {
  return {
    ...mapJob(job),
    username: job.user?.username
  };
}

function mapAuditEventWithUser(event: {
  id: string;
  userId: string | null;
  action: string;
  ip: string | null;
  metadataJson: string | null;
  createdAt: Date;
  user?: { username: string } | null;
}) {
  return {
    id: event.id,
    userId: event.userId,
    username: event.user?.username,
    action: event.action,
    ip: event.ip,
    metadata: safeParseMetadata(event.metadataJson),
    createdAt: event.createdAt.toISOString()
  };
}

function safeParseMetadata(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function emptyWallet(userId: string): Wallet {
  return {
    userId,
    balancePoints: 0,
    reservedPoints: 0,
    totalRechargedPoints: 0,
    totalUsedPoints: 0,
    updatedAt: new Date()
  };
}

function normalizePositiveInt(value: unknown, message: string): number {
  const amount = Math.floor(Number(value) || 0);
  if (amount <= 0) throw httpError(400, message);
  return amount;
}

function normalizeJobStatus(status: unknown): string {
  const normalized = String(status ?? "completed").trim().toLowerCase();
  if (["queued", "running", "completed", "partial", "failed", "canceled"].includes(normalized)) {
    return normalized;
  }
  return "completed";
}

function clampLimit(value: unknown, fallback: number): number {
  return Math.min(500, Math.max(1, Math.floor(Number(value) || fallback)));
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
