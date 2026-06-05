import type { ImageQuality, ProductShotRequest, ProviderId, VideoGenerationRequest, VideoResolution } from "./types";

export interface ModelPrice {
  providerId: ProviderId;
  modelId: string;
  displayName: string;
  sourceUrl: string;
  qualityPrices: Partial<Record<ImageQuality, number>>;
  note: string;
}

export const imageQualities: Array<{ id: ImageQuality; label: string }> = [
  { id: "standard", label: "\u6807\u51c6" },
  { id: "high", label: "\u9ad8\u6e05" },
  { id: "ultra", label: "\u8d85\u6e05" }
];

export const modelPrices: ModelPrice[] = [
  {
    providerId: "aliyun",
    modelId: "qwen-image-edit",
    displayName: "Qwen-Image-Edit",
    sourceUrl: "https://help.aliyun.com/zh/model-studio/qwen-image-edit",
    qualityPrices: {
      standard: 12,
      high: 24,
      ultra: 40
    },
    note: "\u4f30\u7b97\u503c\uff1a\u963f\u91cc\u767e\u70bc\u56fe\u50cf\u6a21\u578b\u7684\u5b9e\u9645\u8d26\u5355\u4ee5\u767e\u70bc\u63a7\u5236\u53f0\u4e3a\u51c6\u3002"
  },
  {
    providerId: "volcano",
    modelId: "doubao-seedream-5-0-260128",
    displayName: "Doubao Seedream 5.0",
    sourceUrl: "https://www.volcengine.com/docs/82379",
    qualityPrices: {
      standard: 12,
      high: 26,
      ultra: 42
    },
    note: "\u4f30\u7b97\u503c\uff1a\u706b\u5c71\u65b9\u821f Seedream \u8d39\u7528\u4f1a\u968f\u6a21\u578b\u3001\u5c3a\u5bf8\u548c\u8f93\u51fa\u5f20\u6570\u53d8\u5316\u3002"
  },
  {
    providerId: "volcano",
    modelId: "doubao-seedream-4-0-250828",
    displayName: "Doubao Seedream 4.0",
    sourceUrl: "https://www.volcengine.com/docs/82379",
    qualityPrices: {
      standard: 10,
      high: 22,
      ultra: 38
    },
    note: "\u4f30\u7b97\u503c\uff1a\u706b\u5c71\u65b9\u821f Seedream \u8d39\u7528\u4f1a\u968f\u6a21\u578b\u3001\u5c3a\u5bf8\u548c\u8f93\u51fa\u5f20\u6570\u53d8\u5316\u3002"
  },
  {
    providerId: "volcano",
    modelId: "doubao-seedream-3-0-t2i-250415",
    displayName: "Doubao Seedream 3.0",
    sourceUrl: "https://www.volcengine.com/docs/82379",
    qualityPrices: {
      standard: 8,
      high: 18,
      ultra: 32
    },
    note: "\u4f30\u7b97\u503c\uff1a\u706b\u5c71\u65b9\u821f Seedream \u8d39\u7528\u4f1a\u968f\u6a21\u578b\u3001\u5c3a\u5bf8\u548c\u8f93\u51fa\u5f20\u6570\u53d8\u5316\u3002"
  },
  {
    providerId: "tencent",
    modelId: "hunyuan-image-rapid",
    displayName: "Hunyuan Image Rapid",
    sourceUrl: "https://cloud.tencent.com/document/api/1729",
    qualityPrices: {
      standard: 8,
      high: 18,
      ultra: 32
    },
    note: "\u4f30\u7b97\u503c\uff1a\u817e\u8baf\u4e91\u6df7\u5143\u751f\u56fe\u4ef7\u683c\u4ee5\u817e\u8baf\u4e91\u8d26\u5355\u4e3a\u51c6\u3002"
  }
];

export const rechargeAmounts = [1000, 5000, 10000, 30000];

export const creditRatePerYuan = 100;

export const videoResolutionPrices: Record<VideoResolution, number> = {
  "720p": 100,
  "1080p": 160
};

export function getModelPrice(providerId: ProviderId, modelId: string): ModelPrice {
  return (
    modelPrices.find((item) => item.providerId === providerId && item.modelId === modelId) ??
    modelPrices.find((item) => item.providerId === providerId) ??
    modelPrices[0]
  );
}

export function getUnitPriceCents(input: {
  providerId: ProviderId;
  modelId: string;
  quality?: ImageQuality;
}): number {
  const quality = input.quality ?? "standard";
  const price = getModelPrice(input.providerId, input.modelId);
  return price.qualityPrices[quality] ?? price.qualityPrices.standard ?? 0;
}

export function estimateRequestCostCents(request: ProductShotRequest): number {
  const unit = getUnitPriceCents({
    providerId: request.providerId,
    modelId: request.modelId,
    quality: request.quality
  });
  const presetCount = Math.max(0, request.presetIds.length);
  const outputCount = Math.min(4, Math.max(1, Math.floor(Number(request.outputCount) || 1)));
  return unit * presetCount * outputCount;
}

export function estimateVideoRequestCostCents(request: Pick<VideoGenerationRequest, "durationSeconds" | "resolution">): number {
  const durationSeconds = Math.min(30, Math.max(1, Math.ceil(Number(request.durationSeconds) || 1)));
  return durationSeconds * (videoResolutionPrices[request.resolution] ?? videoResolutionPrices["720p"]);
}

export function formatCredits(credits: number): string {
  return `${Math.max(0, Math.floor(Number(credits) || 0)).toLocaleString("zh-CN")}\u79ef\u5206`;
}

export function formatUsdCents(cents: number): string {
  return formatCredits(cents);
}
