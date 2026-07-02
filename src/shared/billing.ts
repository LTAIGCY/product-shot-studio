import type { ImageQuality, ProductShotRequest, ProviderId, VideoGenerationRequest } from "./types";

export interface ModelPrice {
  providerId: ProviderId;
  modelId: string;
  displayName: string;
  sourceUrl: string;
  pointsPerImage: number;
  note: string;
}

export interface VideoModelPrice {
  providerId: ProviderId;
  modelId: string;
  displayName: string;
  sourceUrl: string;
  pointsPerSecond: number;
  note: string;
}

export interface RechargePackage {
  id: string;
  label: string;
  yuanAmount: number;
  points: number;
}

export interface MonthlyCardPlan extends RechargePackage {
  monthly: true;
  validDays: number;
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
    sourceUrl: "https://help.aliyun.com/zh/model-studio/model-pricing",
    pointsPerImage: 4,
    note: "\u79ef\u5206\u6309\u963f\u91cc\u767e\u70bc\u516c\u5f00\u56fe\u50cf\u6a21\u578b\u4ef7\u683c\u7ea6 1.5 \u500d\u5e76\u5411\u4e0a\u53d6\u5076\u6570\u4f30\u7b97\u3002"
  },
  {
    providerId: "aliyun",
    modelId: "qwen-image",
    displayName: "Qwen-Image",
    sourceUrl: "https://help.aliyun.com/zh/model-studio/model-pricing",
    pointsPerImage: 2,
    note: "\u79ef\u5206\u6309\u963f\u91cc\u767e\u70bc\u516c\u5f00\u56fe\u50cf\u6a21\u578b\u4ef7\u683c\u7ea6 1.5 \u500d\u5e76\u5411\u4e0a\u53d6\u5076\u6570\u4f30\u7b97\u3002"
  },
  {
    providerId: "volcano",
    modelId: "doubao-seedream-5-0-260128",
    displayName: "Doubao Seedream 5.0",
    sourceUrl: "https://www.volcengine.com/docs/82379/1544106",
    pointsPerImage: 4,
    note: "\u79ef\u5206\u6309\u706b\u5c71\u65b9\u821f Seedream \u516c\u5f00\u4ef7\u683c\u7ea6 1.5 \u500d\u5e76\u5411\u4e0a\u53d6\u5076\u6570\u4f30\u7b97\u3002"
  },
  {
    providerId: "volcano",
    modelId: "doubao-seedream-4-0-250828",
    displayName: "Doubao Seedream 4.0",
    sourceUrl: "https://www.volcengine.com/docs/82379/1544106",
    pointsPerImage: 4,
    note: "\u79ef\u5206\u6309\u706b\u5c71\u65b9\u821f Seedream \u516c\u5f00\u4ef7\u683c\u7ea6 1.5 \u500d\u5e76\u5411\u4e0a\u53d6\u5076\u6570\u4f30\u7b97\u3002"
  },
  {
    providerId: "volcano",
    modelId: "doubao-seedream-3-0-t2i-250415",
    displayName: "Doubao Seedream 3.0",
    sourceUrl: "https://www.volcengine.com/docs/82379/1544106",
    pointsPerImage: 4,
    note: "\u79ef\u5206\u6309\u706b\u5c71\u65b9\u821f Seedream \u516c\u5f00\u4ef7\u683c\u7ea6 1.5 \u500d\u5e76\u5411\u4e0a\u53d6\u5076\u6570\u4f30\u7b97\u3002"
  },
  {
    providerId: "tencent",
    modelId: "hunyuan-image-rapid",
    displayName: "Hunyuan Image Rapid",
    sourceUrl: "https://cloud.tencent.com/document/product/1729/105925",
    pointsPerImage: 2,
    note: "\u79ef\u5206\u6309\u817e\u8baf\u6df7\u5143\u516c\u5f00\u751f\u56fe\u4ef7\u683c\u7ea6 1.5 \u500d\u5e76\u5411\u4e0a\u53d6\u5076\u6570\u4f30\u7b97\u3002"
  },
  {
    providerId: "tencent",
    modelId: "hunyuan-image",
    displayName: "Hunyuan Image",
    sourceUrl: "https://cloud.tencent.com/document/product/1729/105925",
    pointsPerImage: 8,
    note: "\u79ef\u5206\u6309\u817e\u8baf\u6df7\u5143\u516c\u5f00\u751f\u56fe\u4ef7\u683c\u7ea6 1.5 \u500d\u5e76\u5411\u4e0a\u53d6\u5076\u6570\u4f30\u7b97\u3002"
  }
];

export const videoModelPrices: VideoModelPrice[] = [
  {
    providerId: "aliyun",
    modelId: "wanx2.1-i2v-turbo",
    displayName: "Wanx 2.1 I2V Turbo",
    sourceUrl: "https://help.aliyun.com/zh/model-studio/model-pricing",
    pointsPerSecond: 4,
    note: "\u9ed8\u8ba4\u6309 5 \u79d2\u89c6\u9891\u5c55\u793a\uff0c\u751f\u6210\u65f6\u6309\u5b9e\u9645\u79d2\u6570\u6263\u8d39\u3002"
  },
  {
    providerId: "aliyun",
    modelId: "wanx2.1-i2v-plus",
    displayName: "Wanx 2.1 I2V Plus",
    sourceUrl: "https://help.aliyun.com/zh/model-studio/model-pricing",
    pointsPerSecond: 16,
    note: "\u9ed8\u8ba4\u6309 5 \u79d2\u89c6\u9891\u5c55\u793a\uff0c\u751f\u6210\u65f6\u6309\u5b9e\u9645\u79d2\u6570\u6263\u8d39\u3002"
  },
  {
    providerId: "aliyun",
    modelId: "wan2.2-i2v-plus",
    displayName: "Wan 2.2 I2V Plus",
    sourceUrl: "https://help.aliyun.com/zh/model-studio/model-pricing",
    pointsPerSecond: 30,
    note: "\u9ed8\u8ba4\u6309 5 \u79d2\u89c6\u9891\u5c55\u793a\uff0c\u751f\u6210\u65f6\u6309\u5b9e\u9645\u79d2\u6570\u6263\u8d39\u3002"
  },
  {
    providerId: "aliyun",
    modelId: "wan2.2-i2v-flash",
    displayName: "Wan 2.2 I2V Flash",
    sourceUrl: "https://help.aliyun.com/zh/model-studio/model-pricing",
    pointsPerSecond: 4,
    note: "\u9ed8\u8ba4\u6309 5 \u79d2\u89c6\u9891\u5c55\u793a\uff0c\u751f\u6210\u65f6\u6309\u5b9e\u9645\u79d2\u6570\u6263\u8d39\u3002"
  },
  {
    providerId: "volcano",
    modelId: "doubao-seedance-2-0-260128",
    displayName: "Doubao Seedance 2.0",
    sourceUrl: "https://www.volcengine.com/docs/82379/1544106",
    pointsPerSecond: 16,
    note: "\u9ed8\u8ba4\u6309 5 \u79d2\u89c6\u9891\u5c55\u793a\uff0c\u751f\u6210\u65f6\u6309\u5b9e\u9645\u79d2\u6570\u6263\u8d39\u3002"
  },
  {
    providerId: "volcano",
    modelId: "doubao-seedance-2-0-fast-260128",
    displayName: "Doubao Seedance 2.0 Fast",
    sourceUrl: "https://www.volcengine.com/docs/82379/1544106",
    pointsPerSecond: 12,
    note: "\u9ed8\u8ba4\u6309 5 \u79d2\u89c6\u9891\u5c55\u793a\uff0c\u751f\u6210\u65f6\u6309\u5b9e\u9645\u79d2\u6570\u6263\u8d39\u3002"
  },
  {
    providerId: "volcano",
    modelId: "doubao-seedance-1-0-pro-250528",
    displayName: "Doubao Seedance 1.0 Pro",
    sourceUrl: "https://www.volcengine.com/docs/82379/1544106",
    pointsPerSecond: 12,
    note: "\u9ed8\u8ba4\u6309 5 \u79d2\u89c6\u9891\u5c55\u793a\uff0c\u751f\u6210\u65f6\u6309\u5b9e\u9645\u79d2\u6570\u6263\u8d39\u3002"
  },
  {
    providerId: "volcano",
    modelId: "doubao-seedance-1-0-pro-fast-251015",
    displayName: "Doubao Seedance 1.0 Pro Fast",
    sourceUrl: "https://www.volcengine.com/docs/82379/1544106",
    pointsPerSecond: 4,
    note: "\u9ed8\u8ba4\u6309 5 \u79d2\u89c6\u9891\u5c55\u793a\uff0c\u751f\u6210\u65f6\u6309\u5b9e\u9645\u79d2\u6570\u6263\u8d39\u3002"
  },
  {
    providerId: "volcano",
    modelId: "doubao-seedance-1-0-lite-i2v-250428",
    displayName: "Doubao Seedance 1.0 Lite I2V",
    sourceUrl: "https://www.volcengine.com/docs/82379/1544106",
    pointsPerSecond: 4,
    note: "\u9ed8\u8ba4\u6309 5 \u79d2\u89c6\u9891\u5c55\u793a\uff0c\u751f\u6210\u65f6\u6309\u5b9e\u9645\u79d2\u6570\u6263\u8d39\u3002"
  },
  {
    providerId: "volcano",
    modelId: "doubao-seedance-1-5-pro-251215",
    displayName: "Doubao Seedance 1.5 Pro",
    sourceUrl: "https://www.volcengine.com/docs/82379/1544106",
    pointsPerSecond: 6,
    note: "\u9ed8\u8ba4\u6309 5 \u79d2\u89c6\u9891\u5c55\u793a\uff0c\u751f\u6210\u65f6\u6309\u5b9e\u9645\u79d2\u6570\u6263\u8d39\u3002"
  },
  {
    providerId: "tencent",
    modelId: "tencent-vod-hunyuan-1.5",
    displayName: "Tencent VOD Hunyuan 1.5",
    sourceUrl: "https://cloud.tencent.com/document/product/266/14666",
    pointsPerSecond: 6,
    note: "\u9ed8\u8ba4\u6309 5 \u79d2\u89c6\u9891\u5c55\u793a\uff0c\u751f\u6210\u65f6\u6309\u5b9e\u9645\u79d2\u6570\u6263\u8d39\u3002"
  },
  {
    providerId: "tencent",
    modelId: "tencent-vod-kling-3.0",
    displayName: "Tencent VOD Kling 3.0",
    sourceUrl: "https://cloud.tencent.com/document/product/266/14666",
    pointsPerSecond: 10,
    note: "\u9ed8\u8ba4\u6309 5 \u79d2\u89c6\u9891\u5c55\u793a\uff0c\u751f\u6210\u65f6\u6309\u5b9e\u9645\u79d2\u6570\u6263\u8d39\u3002"
  },
  {
    providerId: "tencent",
    modelId: "tencent-vod-vidu-2.0",
    displayName: "Tencent VOD Vidu 2.0",
    sourceUrl: "https://cloud.tencent.com/document/product/266/14666",
    pointsPerSecond: 6,
    note: "\u9ed8\u8ba4\u6309 5 \u79d2\u89c6\u9891\u5c55\u793a\uff0c\u751f\u6210\u65f6\u6309\u5b9e\u9645\u79d2\u6570\u6263\u8d39\u3002"
  },
  {
    providerId: "tencent",
    modelId: "tencent-vod-hailuo-2.3",
    displayName: "Tencent VOD Hailuo 2.3",
    sourceUrl: "https://cloud.tencent.com/document/product/266/14666",
    pointsPerSecond: 6,
    note: "\u9ed8\u8ba4\u6309 5 \u79d2\u89c6\u9891\u5c55\u793a\uff0c\u751f\u6210\u65f6\u6309\u5b9e\u9645\u79d2\u6570\u6263\u8d39\u3002"
  },
  {
    providerId: "tencent",
    modelId: "tencent-vod-mingmou-1.5",
    displayName: "Tencent VOD Mingmou 1.5",
    sourceUrl: "https://cloud.tencent.com/document/product/266/14666",
    pointsPerSecond: 6,
    note: "\u9ed8\u8ba4\u6309 5 \u79d2\u89c6\u9891\u5c55\u793a\uff0c\u751f\u6210\u65f6\u6309\u5b9e\u9645\u79d2\u6570\u6263\u8d39\u3002"
  },
  {
    providerId: "tencent",
    modelId: "tencent-vod-pixverse-4.5",
    displayName: "Tencent VOD PixVerse 4.5",
    sourceUrl: "https://cloud.tencent.com/document/product/266/14666",
    pointsPerSecond: 4,
    note: "\u9ed8\u8ba4\u6309 5 \u79d2\u89c6\u9891\u5c55\u793a\uff0c\u751f\u6210\u65f6\u6309\u5b9e\u9645\u79d2\u6570\u6263\u8d39\u3002"
  }
];

export const creditRatePerYuan = 10;

export const rechargePackages: RechargePackage[] = [
  { id: "recharge-30", label: "30 元", yuanAmount: 30, points: 300 },
  { id: "recharge-50", label: "50 元", yuanAmount: 50, points: 500 },
  { id: "recharge-100", label: "100 元", yuanAmount: 100, points: 1000 },
  { id: "recharge-300", label: "300 元", yuanAmount: 300, points: 3000 }
];

export const monthlyCardPlans: MonthlyCardPlan[] = [
  { id: "monthly-49", label: "轻量月卡", yuanAmount: 49, points: 550, monthly: true, validDays: 30 },
  { id: "monthly-99", label: "标准月卡", yuanAmount: 99, points: 1200, monthly: true, validDays: 30 },
  { id: "monthly-199", label: "专业月卡", yuanAmount: 199, points: 2600, monthly: true, validDays: 30 }
];

export const rechargeAmounts = rechargePackages.map((item) => item.points);

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
  const price = getModelPrice(input.providerId, input.modelId);
  return price.pointsPerImage;
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

export function getVideoModelPrice(providerId: ProviderId, modelId: string): VideoModelPrice {
  return (
    videoModelPrices.find((item) => item.providerId === providerId && item.modelId === modelId) ??
    videoModelPrices.find((item) => item.providerId === providerId) ??
    videoModelPrices[0]
  );
}

export function getVideoUnitPriceCents(input: Pick<VideoGenerationRequest, "providerId" | "modelId">): number {
  return getVideoModelPrice(input.providerId, input.modelId).pointsPerSecond;
}

export function estimateVideoRequestCostCents(
  request: Pick<VideoGenerationRequest, "providerId" | "modelId" | "durationSeconds">
): number {
  const durationSeconds = Math.min(15, Math.max(1, Math.ceil(Number(request.durationSeconds) || 1)));
  return durationSeconds * getVideoUnitPriceCents(request);
}

export function formatCredits(credits: number): string {
  return `${Math.max(0, Math.floor(Number(credits) || 0)).toLocaleString("zh-CN")}\u79ef\u5206`;
}

export function formatUsdCents(cents: number): string {
  return formatCredits(cents);
}

export function formatYuan(yuan: number): string {
  return `\u00a5${Math.max(0, Number(yuan) || 0).toLocaleString("zh-CN")}`;
}
