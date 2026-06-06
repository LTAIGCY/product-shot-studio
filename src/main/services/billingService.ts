import {
  estimateRequestCostCents,
  estimateVideoRequestCostCents,
  formatCredits
} from "../../shared/billing";
import type {
  ProductShotJob,
  ProductShotRequest,
  RechargeReceipt,
  RechargeRequest,
  VideoGenerationJob,
  VideoGenerationRequest,
  WalletSummary,
  WalletTransaction
} from "../../shared/types";
import type { BackendClient, UsageReservationReceipt } from "./backendClient";

export class BillingService {
  constructor(private readonly backendClient: BackendClient) {}

  getWalletSummary(): Promise<WalletSummary> {
    this.backendClient.requireSession();
    return this.backendClient.getWallet();
  }

  listWalletTransactions(limit = 100): Promise<WalletTransaction[]> {
    this.backendClient.requireSession();
    return this.backendClient.listWalletTransactions(limit);
  }

  recharge(request: RechargeRequest): Promise<RechargeReceipt> {
    this.backendClient.requireSession();
    return this.backendClient.recharge(request);
  }

  reserveProductRequest(request: ProductShotRequest): Promise<UsageReservationReceipt> {
    this.backendClient.requireSession();
    return this.backendClient.reserveUsage({
      estimatedPoints: estimateRequestCostCents(request),
      mediaType: "image",
      providerId: request.providerId,
      modelId: request.modelId,
      note: "Product image generation reserve."
    });
  }

  reserveVideoRequest(request: VideoGenerationRequest): Promise<UsageReservationReceipt> {
    this.backendClient.requireSession();
    return this.backendClient.reserveUsage({
      estimatedPoints: estimateVideoRequestCostCents(request),
      mediaType: "video",
      providerId: request.providerId,
      modelId: request.modelId,
      note: "Product video generation reserve."
    });
  }

  commitProductUsage(reservationId: string, job: ProductShotJob): Promise<WalletSummary> {
    const estimatedFullCost = estimateRequestCostCents(job.request);
    const requestedImages = Math.max(1, job.request.presetIds.length * Math.max(1, job.request.outputCount));
    const successfulImages = Math.max(0, job.results.length);
    const chargedPoints = Math.ceil((estimatedFullCost * successfulImages) / requestedImages);
    return this.backendClient.commitUsage({
      reservationId,
      jobId: job.id,
      mediaType: "image",
      providerId: job.request.providerId,
      modelId: job.request.modelId,
      status: job.status,
      chargedPoints,
      resultCount: successfulImages,
      errorMessage: summarizeJobErrors(job)
    });
  }

  commitVideoUsage(reservationId: string, job: VideoGenerationJob): Promise<WalletSummary> {
    const chargedPoints = job.results.length > 0 ? estimateVideoRequestCostCents(job.request) : 0;
    return this.backendClient.commitUsage({
      reservationId,
      jobId: job.id,
      mediaType: "video",
      providerId: job.request.providerId,
      modelId: job.request.modelId,
      status: job.status,
      chargedPoints,
      resultCount: job.results.length,
      errorMessage: summarizeJobErrors(job)
    });
  }

  cancelUsage(reservationId: string, errorMessage?: string, jobId?: string): Promise<WalletSummary> {
    return this.backendClient.cancelUsage({ reservationId, errorMessage, jobId });
  }

  async assertEnoughCreditsForProductRequest(request: ProductShotRequest): Promise<void> {
    await this.assertEnoughCredits(estimateRequestCostCents(request));
  }

  async assertEnoughCreditsForVideoRequest(request: VideoGenerationRequest): Promise<void> {
    await this.assertEnoughCredits(estimateVideoRequestCostCents(request));
  }

  private async assertEnoughCredits(requiredCredits: number): Promise<void> {
    this.backendClient.requireSession();
    const wallet = await this.backendClient.getWallet();
    const availableCredits = wallet.balanceCents - (wallet.reservedCents ?? 0);
    if (availableCredits < requiredCredits) {
      throw new Error(
        `积分余额不足：需要 ${formatCredits(requiredCredits)}，当前可用余额 ${formatCredits(availableCredits)}。请先充值或降低生成数量/质量。`
      );
    }
  }
}

function summarizeJobErrors(job: Pick<ProductShotJob | VideoGenerationJob, "errors">): string | undefined {
  if (job.errors.length === 0) return undefined;
  return job.errors.map((error) => error.message).join("；");
}
