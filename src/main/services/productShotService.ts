import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { nativeImage } from "electron";
import type {
  GenerateProgress,
  ProductShotJob,
  ProductShotRequest,
  ProductShotResult,
  ProviderAdapter
} from "../../shared/types";
import { buildProductShotPrompt } from "../../shared/presets";
import { normalizeProviderError } from "../providers/util";
import type { SecretStore } from "./secretStore";
import type { AppDatabase } from "./database";

type ProgressCallback = (progress: GenerateProgress) => void;

export class ProductShotService {
  private readonly generatedDir: string;
  private readonly activeJobs = new Map<string, ProductShotJob>();

  constructor(
    userDataPath: string,
    private readonly secretStore: SecretStore,
    private readonly database: AppDatabase,
    private readonly adapters: Record<string, ProviderAdapter>
  ) {
    this.generatedDir = path.join(userDataPath, "generated-images");
  }

  async generate(input: ProductShotRequest, onProgress: ProgressCallback, userId?: string): Promise<ProductShotJob> {
    const request = this.normalizeRequest(input);
    const adapter = this.adapters[request.providerId];
    if (!adapter) {
      throw new Error(`Unsupported provider: ${request.providerId}`);
    }

    const apiKey = await this.secretStore.get(request.providerId);
    if (!apiKey) {
      throw new Error(`Please configure an API key for ${request.providerId}.`);
    }

    const now = new Date().toISOString();
    const job: ProductShotJob = {
      id: randomUUID(),
      userId,
      request,
      sourceImagePath: request.sourceImagePath,
      status: "running",
      results: [],
      errors: [],
      createdAt: now,
      updatedAt: now
    };

    this.activeJobs.set(job.id, job);
    await this.database.upsertJob(job);

    const outputDir = path.join(this.generatedDir, job.id);
    await fs.mkdir(outputDir, { recursive: true });

    const tasks = request.presetIds.map(async (presetId) => {
      if (this.isCanceled(job)) {
        onProgress({ jobId: job.id, presetId, status: "canceled", message: "Canceled" });
        return;
      }

      onProgress({ jobId: job.id, presetId, status: "running", message: "Generating" });
      const prompt = buildProductShotPrompt({
        presetId,
        fidelity: request.fidelity,
        quality: request.quality,
        productBrief: request.productBrief,
        styleGuide: request.styleGuide,
        posterCopy: request.posterCopy,
        aspectRatio: request.aspectRatio,
        outputFormat: request.exportFormat
      });

      try {
        const results = await adapter.generateProductShot(request, {
          jobId: job.id,
          apiKey,
          presetId,
          prompt,
          outputDir,
          sourceMimeType: this.getSourceMimeType(request.sourceImagePath)
        });
        if (this.isCanceled(job)) {
          onProgress({ jobId: job.id, presetId, status: "canceled", message: "Canceled" });
          return;
        }
        const normalizedResults = await Promise.all(results.map((result) => this.withDimensions(result)));
        job.results.push(...normalizedResults);
        onProgress({ jobId: job.id, presetId, status: "completed", message: "Completed" });
      } catch (error) {
        if (this.isCanceled(job) || isAbortError(error)) {
          job.status = "canceled";
          onProgress({ jobId: job.id, presetId, status: "canceled", message: "Canceled" });
          return;
        }
        const normalized = normalizeProviderError({
          providerId: request.providerId,
          presetId,
          error
        });
        job.errors.push(normalized);
        onProgress({ jobId: job.id, presetId, status: "failed", message: normalized.message });
      } finally {
        job.updatedAt = new Date().toISOString();
        await this.database.upsertJob(this.resolveJobStatus(job));
      }
    });

    await Promise.all(tasks);
    this.activeJobs.delete(job.id);
    job.updatedAt = new Date().toISOString();
    await this.database.upsertJob(this.resolveJobStatus(job));
    return job;
  }

  async cancel(jobId: string, userId?: string): Promise<void> {
    const job = this.activeJobs.get(jobId);
    if (!job) return;
    if (userId && job.userId && job.userId !== userId) return;
    const adapter = this.adapters[job.request.providerId];
    job.status = "canceled";
    job.updatedAt = new Date().toISOString();
    await this.database.upsertJob(job);
    await adapter?.cancelJob(jobId);
  }

  private resolveJobStatus(job: ProductShotJob): ProductShotJob {
    if (job.status === "canceled") {
      return job;
    }
    if (job.results.length > 0 && job.errors.length === 0) {
      job.status = "completed";
    } else if (job.results.length > 0 && job.errors.length > 0) {
      job.status = "partial";
    } else if (job.errors.length >= job.request.presetIds.length) {
      job.status = "failed";
    } else {
      job.status = "running";
    }
    return job;
  }

  private normalizeRequest(request: ProductShotRequest): ProductShotRequest {
    const outputCount = Math.min(4, Math.max(1, Math.floor(Number(request.outputCount) || 1)));
    return {
      ...request,
      outputCount
    };
  }

  private isCanceled(job: ProductShotJob): boolean {
    return job.status === "canceled";
  }

  private async withDimensions(result: ProductShotResult): Promise<ProductShotResult> {
    const image = nativeImage.createFromPath(result.imagePath);
    if (image.isEmpty()) {
      return result;
    }
    return {
      ...result,
      dimensions: image.getSize()
    };
  }

  private getSourceMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".png") return "image/png";
    if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
    if (ext === ".webp") return "image/webp";
    return "application/octet-stream";
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && (error.name === "AbortError" || error.message.toLowerCase().includes("abort"));
}
