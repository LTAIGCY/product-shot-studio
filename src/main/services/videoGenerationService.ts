import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { normalizeProviderError } from "../providers/util";
import type {
  JobStatus,
  ProviderAdapter,
  ProviderId,
  VideoGenerationJob,
  VideoGenerationRequest,
  VideoProgress
} from "../../shared/types";
import type { AppDatabase } from "./database";
import type { SecretStore } from "./secretStore";
import {
  getAllowedVideoAspectRatio,
  getAllowedVideoDuration,
  getAllowedVideoResolution,
  getDefaultVideoModelId,
  getVideoModelMeta
} from "../../shared/videoModels";

export class VideoGenerationService {
  private readonly generatedDir: string;
  private readonly activeJobs = new Map<string, VideoGenerationJob>();

  constructor(
    userDataPath: string,
    private readonly secretStore: SecretStore,
    private readonly database: AppDatabase,
    private readonly adapters: Record<string, ProviderAdapter>
  ) {
    this.generatedDir = path.join(userDataPath, "generated-videos");
  }

  async generate(
    input: VideoGenerationRequest,
    onProgress: (progress: VideoProgress) => void,
    userId?: string
  ): Promise<VideoGenerationJob> {
    const request = this.normalizeRequest(input);
    const adapter = this.adapters[request.providerId];
    if (!adapter?.generateProductVideo) {
      throw new Error(`${request.providerId} does not support product video generation yet.`);
    }
    const apiKey = await this.secretStore.get(request.providerId);
    if (!apiKey) {
      throw new Error(`Please configure an API key for ${request.providerId}.`);
    }

    const now = new Date().toISOString();
    const job: VideoGenerationJob = {
      id: randomUUID(),
      userId,
      mediaType: "video",
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

    try {
      onProgress({ jobId: job.id, status: "running", message: "Generating video" });
      const result = await adapter.generateProductVideo(request, {
        jobId: job.id,
        apiKey,
        prompt: this.buildVideoPrompt(request),
        outputDir,
        sourceMimeType: this.getSourceMimeType(request.sourceImagePath)
      });
      if (this.isCanceled(job)) {
        onProgress({ jobId: job.id, status: "canceled", message: "Canceled" });
      } else {
        job.results.push(result);
        onProgress({ jobId: job.id, status: "completed", message: "Completed" });
      }
    } catch (error) {
      if (this.isCanceled(job) || isAbortError(error)) {
        job.status = "canceled";
        onProgress({ jobId: job.id, status: "canceled", message: "Canceled" });
      } else {
        const normalized = normalizeProviderError({
          providerId: request.providerId,
          error,
          fallbackCode: "video_generation_failed"
        });
        job.errors.push(normalized);
        onProgress({ jobId: job.id, status: "failed", message: normalized.message });
      }
    } finally {
      this.activeJobs.delete(job.id);
      job.updatedAt = new Date().toISOString();
      await this.database.upsertJob(this.resolveJobStatus(job));
    }

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

  private normalizeRequest(request: VideoGenerationRequest): VideoGenerationRequest {
    const modelId = getVideoModelMeta(request.providerId, request.modelId)
      ? request.modelId
      : getDefaultVideoModelId(request.providerId);
    if (!modelId) {
      throw new Error(`${request.providerId} does not support product video generation yet.`);
    }
    return {
      ...request,
      modelId,
      aspectRatio: getAllowedVideoAspectRatio(request.providerId, modelId, normalizeAspectRatio(request.aspectRatio)),
      durationSeconds: getAllowedVideoDuration(request.providerId, modelId, request.durationSeconds),
      resolution: getAllowedVideoResolution(request.providerId, modelId, request.resolution === "1080p" ? "1080p" : "720p"),
      watermark: Boolean(request.watermark),
      enableAudio: Boolean(request.enableAudio)
    };
  }

  private resolveJobStatus(job: VideoGenerationJob): VideoGenerationJob {
    if (job.status === "canceled") {
      return job;
    }
    if (job.results.length > 0) {
      job.status = "completed";
    } else if (job.errors.length > 0) {
      job.status = "failed";
    } else {
      job.status = "running";
    }
    return job;
  }

  private buildVideoPrompt(request: VideoGenerationRequest): string {
    return [
      request.prompt.replace(/\s+/g, " ").trim() || "Create a premium commercial product showcase video.",
      "Keep the source product identity, shape, color, logo placement, packaging details, and material consistent.",
      "Use professional ecommerce lighting, smooth camera motion, clean staging, and no fake certification marks.",
      `Aspect ratio: ${request.aspectRatio}. Duration: ${request.durationSeconds}s. Resolution: ${request.resolution}.`,
      request.enableAudio ? "Add subtle commercial ambient audio if the provider supports it." : "No audio is required."
    ].join(" ");
  }

  private isCanceled(job: VideoGenerationJob): boolean {
    return job.status === "canceled";
  }

  private getSourceMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".png") return "image/png";
    if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
    if (ext === ".webp") return "image/webp";
    return "application/octet-stream";
  }
}

function normalizeAspectRatio(value: string): string {
  const normalized = String(value || "16:9").replace(/\s+/g, "");
  return /^\d+:\d+$/.test(normalized) ? normalized : "16:9";
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && (error.name === "AbortError" || error.message.toLowerCase().includes("abort"));
}
