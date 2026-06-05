import fs from "node:fs/promises";
import path from "node:path";
import { createHash, createHmac } from "node:crypto";
import type {
  ProductShotRequest,
  ProductShotResult,
  ProviderAdapter,
  ProviderCapabilities,
  ProviderGenerateContext,
  ProviderVideoGenerateContext,
  ProviderId,
  VideoGenerationRequest,
  VideoGenerationResult
} from "../../shared/types";
import { providerConfigs } from "../../shared/providers";
import { aspectRatioToSize, outputFormatToExtension, writeBase64Image, writeBinaryImage } from "./util";

interface ImageDataItem {
  b64_json?: string;
  base64?: string;
  url?: string;
  image_url?: string;
  image?: string;
}

interface AliyunImageResponse {
  output?: {
    task_id?: string;
    task_status?: string;
    results?: ImageDataItem[];
  };
  message?: string;
}

interface VolcanoImageResponse {
  data?: ImageDataItem[];
  error?: { message?: string };
}

interface TencentImageResponse {
  Response?: {
    Error?: { Code?: string; Message?: string };
    ResultImage?: string;
    ResultImageUrl?: string;
    ResultImageList?: string[];
  };
}

interface AsyncVideoTaskResponse {
  id?: string;
  task_id?: string;
  status?: string;
  output?: {
    task_id?: string;
    task_status?: string;
    video_url?: string;
    url?: string;
    results?: Array<{ video_url?: string; url?: string }>;
  };
  content?: {
    video_url?: string;
    url?: string;
  };
  data?: {
    id?: string;
    task_id?: string;
    status?: string;
    video_url?: string;
    url?: string;
    content?: {
      video_url?: string;
      url?: string;
    };
  };
  error?: { message?: string };
  message?: string;
}

abstract class ChinaProviderAdapter implements Omit<ProviderAdapter, "generateProductShot" | "generateProductVideo"> {
  abstract id: ProviderId;
  protected readonly abortControllers = new Map<string, AbortController>();

  async validateKey(apiKey: string): Promise<boolean> {
    return Boolean(apiKey.trim());
  }

  getCapabilities(): ProviderCapabilities {
    const config = providerConfigs[this.id];
    const capabilities: ProviderCapabilities = {
      providerId: this.id,
      displayName: config.displayName,
      models: config.models,
      aspectRatios: ["1:1", "4:5", "16:9", "3:2"],
      outputFormats: ["png", "jpg", "webp"],
      supportsImageEdit: true,
      supportsCancel: true
    };
    if (this.id === "aliyun") {
      capabilities.videoModels = ["wanx2.1-i2v-turbo", "wanx2.1-i2v-plus"];
      capabilities.videoAspectRatios = ["1:1", "4:5", "16:9", "9:16"];
      capabilities.videoDurations = [5];
      capabilities.videoResolutions = ["720p", "1080p"];
      capabilities.supportsVideoGeneration = true;
    }
    if (this.id === "volcano") {
      capabilities.videoModels = ["doubao-seedance-2-0-260128"];
      capabilities.videoAspectRatios = ["16:9", "9:16", "1:1", "4:5"];
      capabilities.videoDurations = [5, 10];
      capabilities.videoResolutions = ["720p", "1080p"];
      capabilities.supportsVideoGeneration = true;
    }
    return capabilities;
  }

  async cancelJob(jobId: string): Promise<void> {
    for (const [key, controller] of this.abortControllers.entries()) {
      if (key.startsWith(`${jobId}:`)) {
        controller.abort();
        this.abortControllers.delete(key);
      }
    }
  }

  protected createController(context: ProviderGenerateContext): AbortController {
    const controller = new AbortController();
    this.abortControllers.set(`${context.jobId}:${context.presetId}`, controller);
    return controller;
  }

  protected releaseController(context: ProviderGenerateContext): void {
    this.abortControllers.delete(`${context.jobId}:${context.presetId}`);
  }

  protected createVideoController(context: ProviderVideoGenerateContext): AbortController {
    const controller = new AbortController();
    this.abortControllers.set(`${context.jobId}:video`, controller);
    return controller;
  }

  protected releaseVideoController(context: ProviderVideoGenerateContext): void {
    this.abortControllers.delete(`${context.jobId}:video`);
  }

  protected async sourceDataUrl(request: ProductShotRequest, context: ProviderGenerateContext): Promise<string> {
    const b64 = await fs.readFile(request.sourceImagePath, "base64");
    return `data:${context.sourceMimeType};base64,${b64}`;
  }

  protected async sourceVideoDataUrl(request: VideoGenerationRequest, context: ProviderVideoGenerateContext): Promise<string> {
    const b64 = await fs.readFile(request.sourceImagePath, "base64");
    return `data:${context.sourceMimeType};base64,${b64}`;
  }

  protected async writeImages(input: {
    request: ProductShotRequest;
    context: ProviderGenerateContext;
    items: ImageDataItem[];
  }): Promise<ProductShotResult[]> {
    const extension = outputFormatToExtension(input.request.exportFormat);
    const results: ProductShotResult[] = [];
    for (const [index, item] of input.items.slice(0, input.request.outputCount).entries()) {
      const imagePath = await this.writeOneImage({
        item,
        outputDir: input.context.outputDir,
        fileName: `${input.context.presetId}-${index + 1}.${extension}`
      });
      results.push({
        presetId: input.context.presetId,
        providerId: this.id,
        modelId: input.request.modelId || providerConfigs[this.id].defaultModel,
        imagePath,
        promptUsed: input.context.prompt,
        dimensions: { width: 0, height: 0 },
        warnings: [],
        createdAt: new Date().toISOString()
      });
    }
    if (results.length === 0) {
      throw new Error(`${providerConfigs[this.id].displayName} returned no image data.`);
    }
    return results;
  }

  private async writeOneImage(input: {
    item: ImageDataItem;
    outputDir: string;
    fileName: string;
  }): Promise<string> {
    const b64 = input.item.b64_json ?? input.item.base64 ?? input.item.image;
    if (b64) {
      return writeBase64Image({ b64, outputDir: input.outputDir, fileName: input.fileName });
    }
    const url = input.item.url ?? input.item.image_url;
    if (!url) {
      throw new Error("Provider returned an unsupported image payload.");
    }
    if (url.startsWith("data:image/")) {
      return writeBase64Image({ b64: url, outputDir: input.outputDir, fileName: input.fileName });
    }
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download generated image: HTTP ${response.status}`);
    }
    return writeBinaryImage({
      data: await response.arrayBuffer(),
      outputDir: input.outputDir,
      fileName: input.fileName
    });
  }

  protected async writeVideoFromUrl(input: {
    request: VideoGenerationRequest;
    context: ProviderVideoGenerateContext;
    url: string;
    fileName?: string;
  }): Promise<VideoGenerationResult> {
    const response = await fetch(input.url);
    if (!response.ok) {
      throw new Error(`Failed to download generated video: HTTP ${response.status}`);
    }
    await fs.mkdir(input.context.outputDir, { recursive: true });
    const fileName = sanitizeFileName(input.fileName ?? `${this.id}-${Date.now()}.mp4`);
    const videoPath = path.join(input.context.outputDir, fileName.endsWith(".mp4") ? fileName : `${fileName}.mp4`);
    await fs.writeFile(videoPath, Buffer.from(await response.arrayBuffer()));
    return {
      providerId: this.id,
      modelId: input.request.modelId || getDefaultVideoModel(this.id),
      videoPath,
      promptUsed: input.context.prompt,
      aspectRatio: input.request.aspectRatio,
      durationSeconds: normalizeVideoDuration(input.request.durationSeconds),
      resolution: input.request.resolution,
      warnings: [],
      createdAt: new Date().toISOString()
    };
  }

  protected extractVideoUrl(body: AsyncVideoTaskResponse): string | null {
    return (
      body.output?.video_url ??
      body.output?.url ??
      body.output?.results?.find((item) => item.video_url || item.url)?.video_url ??
      body.output?.results?.find((item) => item.video_url || item.url)?.url ??
      body.content?.video_url ??
      body.content?.url ??
      body.data?.video_url ??
      body.data?.url ??
      body.data?.content?.video_url ??
      body.data?.content?.url ??
      null
    );
  }

  protected extractTaskId(body: AsyncVideoTaskResponse): string | null {
    return body.output?.task_id ?? body.data?.task_id ?? body.data?.id ?? body.task_id ?? body.id ?? null;
  }

  protected isVideoTaskSucceeded(body: AsyncVideoTaskResponse): boolean {
    const status = String(body.output?.task_status ?? body.data?.status ?? body.status ?? "").toLowerCase();
    return ["succeeded", "success", "completed", "done"].includes(status);
  }

  protected isVideoTaskFailed(body: AsyncVideoTaskResponse): boolean {
    const status = String(body.output?.task_status ?? body.data?.status ?? body.status ?? "").toLowerCase();
    return ["failed", "error", "canceled", "cancelled"].includes(status);
  }
}

export class AliyunProviderAdapter extends ChinaProviderAdapter {
  id = "aliyun" as const;

  async validateKey(apiKey: string): Promise<boolean> {
    const response = await fetch("https://dashscope.aliyuncs.com/api/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    return response.ok;
  }

  async generateProductShot(
    request: ProductShotRequest,
    context: ProviderGenerateContext
  ): Promise<ProductShotResult[]> {
    const controller = this.createController(context);
    try {
      const response = await fetch("https://dashscope.aliyuncs.com/api/v1/services/aigc/image2image/image-synthesis", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${context.apiKey}`,
          "Content-Type": "application/json",
          "X-DashScope-Async": "enable"
        },
        body: JSON.stringify({
          model: request.modelId || providerConfigs.aliyun.defaultModel,
          input: {
            prompt: context.prompt,
            image_url: await this.sourceDataUrl(request, context)
          },
          parameters: {
            n: request.outputCount,
            size: aspectRatioToSize(request.aspectRatio)
          }
        }),
        signal: controller.signal
      });
      const body = (await response.json()) as AliyunImageResponse;
      if (!response.ok) {
        throw new Error(body.message ?? `Aliyun request failed with HTTP ${response.status}`);
      }
      const directResults = body.output?.results;
      if (directResults?.length) {
        return this.writeImages({ request, context, items: directResults });
      }
      if (!body.output?.task_id) {
        throw new Error("Aliyun returned no task id or image data.");
      }
      return this.pollTask({ request, context, taskId: body.output.task_id, signal: controller.signal });
    } finally {
      this.releaseController(context);
    }
  }

  async generateProductVideo(
    request: VideoGenerationRequest,
    context: ProviderVideoGenerateContext
  ): Promise<VideoGenerationResult> {
    const controller = this.createVideoController(context);
    try {
      const response = await fetch("https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${context.apiKey}`,
          "Content-Type": "application/json",
          "X-DashScope-Async": "enable"
        },
        body: JSON.stringify({
          model: request.modelId || getDefaultVideoModel(this.id),
          input: {
            prompt: context.prompt,
            img_url: await this.sourceVideoDataUrl(request, context)
          },
          parameters: {
            duration: normalizeVideoDuration(request.durationSeconds),
            resolution: request.resolution,
            size: videoAspectRatioToAliyunSize(request.aspectRatio, request.resolution),
            watermark: request.watermark
          }
        }),
        signal: controller.signal
      });
      const body = (await response.json()) as AsyncVideoTaskResponse;
      if (!response.ok) {
        throw new Error(body.message ?? body.error?.message ?? `Aliyun video request failed with HTTP ${response.status}`);
      }
      const directUrl = this.extractVideoUrl(body);
      if (directUrl) {
        return this.writeVideoFromUrl({ request, context, url: directUrl, fileName: "aliyun-video.mp4" });
      }
      const taskId = this.extractTaskId(body);
      if (!taskId) {
        throw new Error("Aliyun returned no video task id or video url.");
      }
      return this.pollVideoTask({ request, context, taskId, signal: controller.signal });
    } finally {
      this.releaseVideoController(context);
    }
  }

  private async pollTask(input: {
    request: ProductShotRequest;
    context: ProviderGenerateContext;
    taskId: string;
    signal: AbortSignal;
  }): Promise<ProductShotResult[]> {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      await delay(1500, input.signal);
      const response = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${input.taskId}`, {
        headers: { Authorization: `Bearer ${input.context.apiKey}` },
        signal: input.signal
      });
      const body = (await response.json()) as AliyunImageResponse;
      if (!response.ok) {
        throw new Error(body.message ?? `Aliyun task query failed with HTTP ${response.status}`);
      }
      if (body.output?.task_status === "SUCCEEDED" && body.output.results?.length) {
        return this.writeImages({ request: input.request, context: input.context, items: body.output.results });
      }
      if (body.output?.task_status === "FAILED") {
        throw new Error(body.message ?? "Aliyun image generation task failed.");
      }
    }
    throw new Error("Aliyun image generation timed out.");
  }

  private async pollVideoTask(input: {
    request: VideoGenerationRequest;
    context: ProviderVideoGenerateContext;
    taskId: string;
    signal: AbortSignal;
  }): Promise<VideoGenerationResult> {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      await delay(3000, input.signal);
      const response = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${input.taskId}`, {
        headers: { Authorization: `Bearer ${input.context.apiKey}` },
        signal: input.signal
      });
      const body = (await response.json()) as AsyncVideoTaskResponse;
      if (!response.ok) {
        throw new Error(body.message ?? body.error?.message ?? `Aliyun video task query failed with HTTP ${response.status}`);
      }
      const videoUrl = this.extractVideoUrl(body);
      if ((this.isVideoTaskSucceeded(body) || videoUrl) && videoUrl) {
        return this.writeVideoFromUrl({
          request: input.request,
          context: input.context,
          url: videoUrl,
          fileName: `aliyun-${input.taskId}.mp4`
        });
      }
      if (this.isVideoTaskFailed(body)) {
        throw new Error(body.message ?? body.error?.message ?? "Aliyun video generation task failed.");
      }
    }
    throw new Error("Aliyun video generation timed out.");
  }
}

export class VolcanoProviderAdapter extends ChinaProviderAdapter {
  id = "volcano" as const;

  async generateProductShot(
    request: ProductShotRequest,
    context: ProviderGenerateContext
  ): Promise<ProductShotResult[]> {
    const controller = this.createController(context);
    try {
      const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${context.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: request.modelId || providerConfigs.volcano.defaultModel,
          prompt: context.prompt,
          image: await this.sourceDataUrl(request, context),
          response_format: "b64_json",
          size: aspectRatioToVolcanoSize(request.aspectRatio, request.modelId || providerConfigs.volcano.defaultModel),
          n: request.outputCount,
          watermark: false
        }),
        signal: controller.signal
      });
      const body = (await response.json()) as VolcanoImageResponse;
      if (!response.ok) {
        throw new Error(body.error?.message ?? `Volcano request failed with HTTP ${response.status}`);
      }
      return this.writeImages({ request, context, items: body.data ?? [] });
    } finally {
      this.releaseController(context);
    }
  }

  async generateProductVideo(
    request: VideoGenerationRequest,
    context: ProviderVideoGenerateContext
  ): Promise<VideoGenerationResult> {
    const controller = this.createVideoController(context);
    try {
      const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${context.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: request.modelId || getDefaultVideoModel(this.id),
          content: [
            {
              type: "text",
              text: buildVolcanoVideoPrompt(request, context.prompt)
            },
            {
              type: "image_url",
              image_url: {
                url: await this.sourceVideoDataUrl(request, context)
              }
            }
          ],
          parameters: {
            ratio: request.aspectRatio,
            duration: normalizeVideoDuration(request.durationSeconds),
            resolution: request.resolution,
            watermark: request.watermark
          }
        }),
        signal: controller.signal
      });
      const body = (await response.json()) as AsyncVideoTaskResponse;
      if (!response.ok) {
        throw new Error(body.message ?? body.error?.message ?? `Volcano video request failed with HTTP ${response.status}`);
      }
      const directUrl = this.extractVideoUrl(body);
      if (directUrl) {
        return this.writeVideoFromUrl({ request, context, url: directUrl, fileName: "volcano-video.mp4" });
      }
      const taskId = this.extractTaskId(body);
      if (!taskId) {
        throw new Error("Volcano returned no video task id or video url.");
      }
      return this.pollVideoTask({ request, context, taskId, signal: controller.signal });
    } finally {
      this.releaseVideoController(context);
    }
  }

  private async pollVideoTask(input: {
    request: VideoGenerationRequest;
    context: ProviderVideoGenerateContext;
    taskId: string;
    signal: AbortSignal;
  }): Promise<VideoGenerationResult> {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      await delay(3000, input.signal);
      const response = await fetch(`https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/${input.taskId}`, {
        headers: { Authorization: `Bearer ${input.context.apiKey}` },
        signal: input.signal
      });
      const body = (await response.json()) as AsyncVideoTaskResponse;
      if (!response.ok) {
        throw new Error(body.message ?? body.error?.message ?? `Volcano video task query failed with HTTP ${response.status}`);
      }
      const videoUrl = this.extractVideoUrl(body);
      if ((this.isVideoTaskSucceeded(body) || videoUrl) && videoUrl) {
        return this.writeVideoFromUrl({
          request: input.request,
          context: input.context,
          url: videoUrl,
          fileName: `volcano-${input.taskId}.mp4`
        });
      }
      if (this.isVideoTaskFailed(body)) {
        throw new Error(body.message ?? body.error?.message ?? "Volcano video generation task failed.");
      }
    }
    throw new Error("Volcano video generation timed out.");
  }
}

export class TencentProviderAdapter extends ChinaProviderAdapter {
  id = "tencent" as const;

  async generateProductShot(
    request: ProductShotRequest,
    context: ProviderGenerateContext
  ): Promise<ProductShotResult[]> {
    const controller = this.createController(context);
    try {
      const credentials = parseTencentCredentials(context.apiKey);
      const payload = JSON.stringify({
        Prompt: context.prompt,
        ImageBase64: (await this.sourceDataUrl(request, context)).replace(/^data:image\/[a-z0-9.+-]+;base64,/i, ""),
        Resolution: aspectRatioToTencentResolution(request.aspectRatio),
        LogoAdd: 0
      });
      const headers = signTencentRequest({
        secretId: credentials.secretId,
        secretKey: credentials.secretKey,
        action: request.modelId === "hunyuan-image" ? "TextToImage" : "TextToImageRapid",
        payload
      });
      const response = await fetch("https://hunyuan.tencentcloudapi.com", {
        method: "POST",
        headers,
        body: payload,
        signal: controller.signal
      });
      const body = (await response.json()) as TencentImageResponse;
      const error = body.Response?.Error;
      if (!response.ok || error) {
        throw new Error(error?.Message ?? `Tencent request failed with HTTP ${response.status}`);
      }
      const items: ImageDataItem[] = [
        ...(body.Response?.ResultImageList ?? []).map((image) => ({ image })),
        ...(body.Response?.ResultImage ? [{ image: body.Response.ResultImage }] : []),
        ...(body.Response?.ResultImageUrl ? [{ url: body.Response.ResultImageUrl }] : [])
      ];
      return this.writeImages({ request: { ...request, outputCount: Math.min(request.outputCount, 1) }, context, items });
    } finally {
      this.releaseController(context);
    }
  }
}

function parseTencentCredentials(value: string): { secretId: string; secretKey: string } {
  const [secretId, secretKey] = value.split(":");
  if (!secretId || !secretKey) {
    throw new Error("Tencent Hunyuan requires credentials in SecretId:SecretKey format.");
  }
  return { secretId, secretKey };
}

function signTencentRequest(input: {
  secretId: string;
  secretKey: string;
  action: string;
  payload: string;
}): Record<string, string> {
  const service = "hunyuan";
  const host = "hunyuan.tencentcloudapi.com";
  const version = "2023-09-01";
  const algorithm = "TC3-HMAC-SHA256";
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
  const canonicalHeaders = `content-type:application/json\nhost:${host}\nx-tc-action:${input.action.toLowerCase()}\n`;
  const signedHeaders = "content-type;host;x-tc-action";
  const hashedRequestPayload = sha256(input.payload);
  const canonicalRequest = [
    "POST",
    "/",
    "",
    canonicalHeaders,
    signedHeaders,
    hashedRequestPayload
  ].join("\n");
  const credentialScope = `${date}/${service}/tc3_request`;
  const stringToSign = [
    algorithm,
    String(timestamp),
    credentialScope,
    sha256(canonicalRequest)
  ].join("\n");
  const secretDate = hmac(`TC3${input.secretKey}`, date);
  const secretService = hmac(secretDate, service);
  const secretSigning = hmac(secretService, "tc3_request");
  const signature = hmac(secretSigning, stringToSign, "hex");
  const authorization = `${algorithm} Credential=${input.secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return {
    Authorization: authorization,
    "Content-Type": "application/json",
    Host: host,
    "X-TC-Action": input.action,
    "X-TC-Version": version,
    "X-TC-Timestamp": String(timestamp),
    "X-TC-Region": "ap-guangzhou"
  };
}

function aspectRatioToTencentResolution(aspectRatio: ProductShotRequest["aspectRatio"]): string {
  switch (aspectRatio) {
    case "4:5":
      return "768:1024";
    case "16:9":
      return "1024:576";
    case "3:2":
      return "1024:768";
    default:
      return "1024:1024";
  }
}

function aspectRatioToVolcanoSize(aspectRatio: ProductShotRequest["aspectRatio"], modelId: string): string {
  if (!/doubao-seedream-[45]-0/i.test(modelId)) {
    return aspectRatioToSize(aspectRatio);
  }

  switch (aspectRatio) {
    case "4:5":
      return "1856x2304";
    case "16:9":
      return "2624x1472";
    case "3:2":
      return "2432x1600";
    default:
      return "2048x2048";
  }
}

function getDefaultVideoModel(providerId: ProviderId): string {
  if (providerId === "aliyun") {
    return "wanx2.1-i2v-turbo";
  }
  if (providerId === "volcano") {
    return "doubao-seedance-2-0-260128";
  }
  return providerConfigs[providerId].defaultModel;
}

function normalizeVideoDuration(value: number): number {
  return Math.min(30, Math.max(1, Math.ceil(Number(value) || 5)));
}

function videoAspectRatioToAliyunSize(aspectRatio: string, resolution: VideoGenerationRequest["resolution"]): string {
  const longSide = resolution === "1080p" ? 1920 : 1280;
  const shortSide = resolution === "1080p" ? 1080 : 720;
  switch (aspectRatio.trim()) {
    case "1:1":
      return resolution === "1080p" ? "1080*1080" : "720*720";
    case "4:5":
      return resolution === "1080p" ? "864*1080" : "576*720";
    case "9:16":
      return `${shortSide}*${longSide}`;
    case "16:9":
    default:
      return `${longSide}*${shortSide}`;
  }
}

function buildVolcanoVideoPrompt(request: VideoGenerationRequest, prompt: string): string {
  return [
    prompt,
    `--ratio ${request.aspectRatio}`,
    `--duration ${normalizeVideoDuration(request.durationSeconds)}`,
    `--resolution ${request.resolution}`,
    request.watermark ? "--watermark true" : "--watermark false"
  ]
    .filter(Boolean)
    .join(" ");
}

function sanitizeFileName(value: string): string {
  return value.replace(/[<>:"/\\|?*]+/g, "-");
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function hmac(key: string | Buffer, value: string, encoding?: "hex"): Buffer | string {
  const result = createHmac("sha256", key).update(value, "utf8").digest();
  return encoding ? result.toString(encoding) : result;
}

async function delay(ms: number, signal: AbortSignal): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timeout);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true }
    );
  });
}
