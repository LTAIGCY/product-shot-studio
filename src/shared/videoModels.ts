import type { ProviderId, VideoModelMetadata, VideoResolution } from "./types";

const standardVideoRatios = ["16:9", "9:16", "1:1", "4:5"] as const;
const standardVideoResolutions: VideoResolution[] = ["720p", "1080p"];
const standardVideoDurations = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
const seedanceSourceUrl = "https://www.volcengine.com/docs/82379/1330310";

export const videoModelCatalog: VideoModelMetadata[] = [
  {
    providerId: "aliyun",
    modelId: "wanx2.1-i2v-turbo",
    displayName: "Wanx 2.1 I2V Turbo",
    aspectRatios: [...standardVideoRatios],
    durations: [...standardVideoDurations],
    resolutions: standardVideoResolutions,
    supportsImageToVideo: true,
    sourceUrl: "https://help.aliyun.com/zh/model-studio/wanx-video-generation"
  },
  {
    providerId: "aliyun",
    modelId: "wanx2.1-i2v-plus",
    displayName: "Wanx 2.1 I2V Plus",
    aspectRatios: [...standardVideoRatios],
    durations: [...standardVideoDurations],
    resolutions: standardVideoResolutions,
    supportsImageToVideo: true,
    sourceUrl: "https://help.aliyun.com/zh/model-studio/wanx-video-generation"
  },
  {
    providerId: "aliyun",
    modelId: "wan2.2-i2v-plus",
    displayName: "Wan 2.2 I2V Plus",
    aspectRatios: [...standardVideoRatios],
    durations: [...standardVideoDurations],
    resolutions: standardVideoResolutions,
    supportsImageToVideo: true,
    sourceUrl: "https://help.aliyun.com/zh/model-studio/wanx-video-generation"
  },
  {
    providerId: "aliyun",
    modelId: "wan2.2-i2v-flash",
    displayName: "Wan 2.2 I2V Flash",
    aspectRatios: [...standardVideoRatios],
    durations: [...standardVideoDurations],
    resolutions: ["720p"],
    supportsImageToVideo: true,
    sourceUrl: "https://help.aliyun.com/zh/model-studio/wanx-video-generation"
  },
  {
    providerId: "volcano",
    modelId: "doubao-seedance-2-0-260128",
    displayName: "Doubao Seedance 2.0",
    aspectRatios: [...standardVideoRatios],
    durations: [...standardVideoDurations],
    resolutions: standardVideoResolutions,
    supportsImageToVideo: true,
    sourceUrl: "https://www.volcengine.com/docs/82379/2298881"
  },
  {
    providerId: "volcano",
    modelId: "doubao-seedance-2-0-fast-260128",
    displayName: "Doubao Seedance 2.0 Fast",
    aspectRatios: [...standardVideoRatios],
    durations: [...standardVideoDurations],
    resolutions: standardVideoResolutions,
    supportsImageToVideo: true,
    sourceUrl: "https://www.volcengine.com/docs/82379/2298881"
  },
  {
    providerId: "volcano",
    modelId: "doubao-seedance-1-0-pro-250528",
    displayName: "Doubao Seedance 1.0 Pro",
    aspectRatios: [...standardVideoRatios],
    durations: [...standardVideoDurations],
    resolutions: ["1080p"],
    supportsImageToVideo: true,
    sourceUrl: seedanceSourceUrl
  },
  {
    providerId: "volcano",
    modelId: "doubao-seedance-1-0-pro-fast-251015",
    displayName: "Doubao Seedance 1.0 Pro Fast",
    aspectRatios: [...standardVideoRatios],
    durations: [...standardVideoDurations],
    resolutions: ["1080p"],
    supportsImageToVideo: true,
    sourceUrl: seedanceSourceUrl
  },
  {
    providerId: "volcano",
    modelId: "doubao-seedance-1-0-lite-i2v-250428",
    displayName: "Doubao Seedance 1.0 Lite I2V",
    aspectRatios: [...standardVideoRatios],
    durations: [...standardVideoDurations],
    resolutions: ["720p"],
    supportsImageToVideo: true,
    sourceUrl: seedanceSourceUrl
  },
  {
    providerId: "volcano",
    modelId: "doubao-seedance-1-5-pro-251215",
    displayName: "Doubao Seedance 1.5 Pro",
    aspectRatios: [...standardVideoRatios],
    durations: [...standardVideoDurations],
    resolutions: ["1080p"],
    supportsImageToVideo: true,
    sourceUrl: seedanceSourceUrl
  },
  {
    providerId: "tencent",
    modelId: "tencent-vod-hunyuan-1.5",
    displayName: "Tencent VOD Hunyuan 1.5",
    aspectRatios: [...standardVideoRatios],
    durations: [...standardVideoDurations],
    resolutions: standardVideoResolutions,
    supportsImageToVideo: true,
    supportsAudio: true,
    sourceUrl: "https://cloud.tencent.com/document/product/266/126239",
    tencentVod: { modelName: "Hunyuan", modelVersion: "1.5", fileUsage: "FirstFrame" }
  },
  {
    providerId: "tencent",
    modelId: "tencent-vod-kling-3.0",
    displayName: "Tencent VOD Kling 3.0",
    aspectRatios: [...standardVideoRatios],
    durations: [...standardVideoDurations],
    resolutions: standardVideoResolutions,
    supportsImageToVideo: true,
    sourceUrl: "https://cloud.tencent.com/document/product/266/126239",
    tencentVod: { modelName: "Kling", modelVersion: "3.0", fileUsage: "FirstFrame" }
  },
  {
    providerId: "tencent",
    modelId: "tencent-vod-vidu-2.0",
    displayName: "Tencent VOD Vidu 2.0",
    aspectRatios: [...standardVideoRatios],
    durations: [...standardVideoDurations],
    resolutions: ["720p"],
    supportsImageToVideo: true,
    sourceUrl: "https://cloud.tencent.com/document/product/266/126239",
    tencentVod: { modelName: "Vidu", modelVersion: "2.0", fileUsage: "FirstFrame" }
  },
  {
    providerId: "tencent",
    modelId: "tencent-vod-hailuo-2.3",
    displayName: "Tencent VOD Hailuo 2.3",
    aspectRatios: [...standardVideoRatios],
    durations: [...standardVideoDurations],
    resolutions: ["720p"],
    supportsImageToVideo: true,
    sourceUrl: "https://cloud.tencent.com/document/product/266/126239",
    tencentVod: { modelName: "Hailuo", modelVersion: "2.3", fileUsage: "Reference" }
  },
  {
    providerId: "tencent",
    modelId: "tencent-vod-mingmou-1.5",
    displayName: "Tencent VOD Mingmou 1.5",
    aspectRatios: [...standardVideoRatios],
    durations: [...standardVideoDurations],
    resolutions: ["720p"],
    supportsImageToVideo: true,
    sourceUrl: "https://cloud.tencent.com/document/product/266/126239",
    tencentVod: { modelName: "Mingmou", modelVersion: "1.5", fileUsage: "Reference" }
  },
  {
    providerId: "tencent",
    modelId: "tencent-vod-pixverse-4.5",
    displayName: "Tencent VOD PixVerse 4.5",
    aspectRatios: [...standardVideoRatios],
    durations: [...standardVideoDurations],
    resolutions: ["720p", "1080p"],
    supportsImageToVideo: true,
    sourceUrl: "https://cloud.tencent.com/document/product/266/126239",
    tencentVod: { modelName: "PixVerse", modelVersion: "4.5", fileUsage: "FirstFrame" }
  }
];

export function getVideoModelsForProvider(providerId: ProviderId): VideoModelMetadata[] {
  return videoModelCatalog.filter((model) => model.providerId === providerId && model.supportsImageToVideo);
}

export function getVideoModelMeta(providerId: ProviderId, modelId: string): VideoModelMetadata | undefined {
  return videoModelCatalog.find((model) => model.providerId === providerId && model.modelId === modelId);
}

export function getDefaultVideoModelId(providerId: ProviderId): string {
  return getVideoModelsForProvider(providerId)[0]?.modelId ?? "";
}

export function getAllowedVideoAspectRatio(providerId: ProviderId, modelId: string, value: string): string {
  const model = getVideoModelMeta(providerId, modelId) ?? getVideoModelsForProvider(providerId)[0];
  const normalized = String(value || "").replace(/\s+/g, "");
  return model?.aspectRatios.includes(normalized) ? normalized : model?.aspectRatios[0] ?? "16:9";
}

export function getAllowedVideoDuration(_providerId: ProviderId, _modelId: string, value: number): number {
  return Math.min(15, Math.max(1, Math.ceil(Number(value) || 5)));
}

export function getAllowedVideoResolution(
  providerId: ProviderId,
  modelId: string,
  value: VideoResolution
): VideoResolution {
  const model = getVideoModelMeta(providerId, modelId) ?? getVideoModelsForProvider(providerId)[0];
  return model?.resolutions.includes(value) ? value : model?.resolutions[0] ?? "720p";
}
