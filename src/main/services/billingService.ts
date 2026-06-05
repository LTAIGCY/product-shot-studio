import { randomUUID } from "node:crypto";
import { estimateRequestCostCents, estimateVideoRequestCostCents, formatCredits } from "../../shared/billing";
import type {
  ProductShotJob,
  RechargeReceipt,
  RechargeRequest,
  VideoGenerationJob,
  VideoGenerationRequest,
  WalletSummary,
  WalletTransaction
} from "../../shared/types";
import type { AccountService } from "./accountService";
import type { AppDatabase } from "./database";

export class BillingService {
  constructor(
    private readonly database: AppDatabase,
    private readonly accountService: AccountService
  ) {}

  getWalletSummary(): WalletSummary {
    const session = this.accountService.requireSession();
    return this.database.getWalletSummary(session.userId);
  }

  listWalletTransactions(limit = 100): WalletTransaction[] {
    const session = this.accountService.requireSession();
    return this.database.listWalletTransactions(session.userId, limit);
  }

  assertEnoughCreditsForProductRequest(request: ProductShotJob["request"]): void {
    this.assertEnoughCredits(estimateRequestCostCents(request));
  }

  assertEnoughCreditsForVideoRequest(request: VideoGenerationRequest): void {
    this.assertEnoughCredits(estimateVideoRequestCostCents(request));
  }

  async recharge(request: RechargeRequest): Promise<RechargeReceipt> {
    const session = this.accountService.requireSession();
    const amountCents = normalizeRechargeAmount(request.amountCents);
    const transaction: WalletTransaction = {
      id: randomUUID(),
      userId: session.userId,
      type: "recharge",
      amountCents,
      providerId: request.providerId,
      modelId: request.modelId,
      note: "WeChat QR recharge recorded locally.",
      createdAt: new Date().toISOString()
    };
    await this.database.addWalletTransaction(transaction);
    return {
      transaction,
      wallet: this.database.getWalletSummary(session.userId)
    };
  }

  async recordJobUsage(job: ProductShotJob): Promise<WalletSummary | null> {
    const session = this.accountService.getSession();
    if (!session || job.results.length === 0) return null;
    const estimatedFullCost = estimateRequestCostCents(job.request);
    const requestedImages = Math.max(1, job.request.presetIds.length * Math.max(1, job.request.outputCount));
    const successfulImages = Math.max(0, job.results.length);
    const amountCents = -Math.ceil((estimatedFullCost * successfulImages) / requestedImages);
    if (amountCents === 0) return this.database.getWalletSummary(session.userId);

    await this.database.addWalletTransaction({
      id: randomUUID(),
      userId: session.userId,
      type: "usage",
      amountCents,
      providerId: job.request.providerId,
      modelId: job.request.modelId,
      jobId: job.id,
      note: `Generated ${successfulImages} image(s).`,
      createdAt: new Date().toISOString()
    });
    return this.database.getWalletSummary(session.userId);
  }

  async recordVideoUsage(job: VideoGenerationJob): Promise<WalletSummary | null> {
    const session = this.accountService.getSession();
    if (!session || job.results.length === 0) return null;
    const amountCents = -estimateVideoRequestCostCents(job.request);
    if (amountCents === 0) return this.database.getWalletSummary(session.userId);

    await this.database.addWalletTransaction({
      id: randomUUID(),
      userId: session.userId,
      type: "usage",
      amountCents,
      providerId: job.request.providerId,
      modelId: job.request.modelId,
      jobId: job.id,
      note: `Generated ${job.request.durationSeconds}s video.`,
      createdAt: new Date().toISOString()
    });
    return this.database.getWalletSummary(session.userId);
  }

  private assertEnoughCredits(requiredCredits: number): void {
    const session = this.accountService.requireSession();
    const wallet = this.database.getWalletSummary(session.userId);
    if (wallet.balanceCents < requiredCredits) {
      throw new Error(`积分不足：需要 ${formatCredits(requiredCredits)}，当前余额 ${formatCredits(wallet.balanceCents)}。`);
    }
  }
}

function normalizeRechargeAmount(value: number): number {
  const amount = Math.floor(Number(value) || 0);
  if (amount < 100 || amount > 1000000) {
    throw new Error("\u5145\u503c\u79ef\u5206\u9700\u8981\u5728 100 \u5230 1000000 \u4e4b\u95f4\u3002");
  }
  return amount;
}
