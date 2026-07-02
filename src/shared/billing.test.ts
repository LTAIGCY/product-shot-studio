import { describe, expect, it } from "vitest";
import {
  creditRatePerYuan,
  estimateRequestCostCents,
  estimateVideoRequestCostCents,
  formatUsdCents,
  getUnitPriceCents,
  getVideoUnitPriceCents,
  modelPrices,
  monthlyCardPlans,
  rechargePackages,
  videoModelPrices
} from "./billing";
import { providerConfigs, providerOrder } from "./providers";
import { videoModelCatalog } from "./videoModels";
import type { ProductShotRequest, VideoGenerationRequest } from "./types";

describe("billing estimates", () => {
  it("uses 10 credits per yuan for point packages and monthly cards", () => {
    expect(creditRatePerYuan).toBe(10);
    expect(rechargePackages.map((item) => [item.yuanAmount, item.points])).toEqual([
      [30, 300],
      [50, 500],
      [100, 1000],
      [300, 3000]
    ]);
    expect(monthlyCardPlans.map((item) => [item.yuanAmount, item.points, item.validDays])).toEqual([
      [49, 550, 30],
      [99, 1200, 30],
      [199, 2600, 30]
    ]);
  });

  it("calculates per-image and request-level image generation cost by model", () => {
    const unit = getUnitPriceCents({
      providerId: "volcano",
      modelId: "doubao-seedream-5-0-260128",
      quality: "ultra"
    });

    expect(unit).toBe(4);
    expect(estimateRequestCostCents(buildRequest())).toBe(12);
  });

  it("formats wallet values as credits", () => {
    expect(formatUsdCents(7200)).toBe("7,200\u79ef\u5206");
  });

  it("calculates video generation credits by model and duration", () => {
    expect(estimateVideoRequestCostCents(buildVideoRequest("wanx2.1-i2v-turbo", 5))).toBe(20);
    expect(estimateVideoRequestCostCents(buildVideoRequest("wanx2.1-i2v-plus", 5))).toBe(80);
    expect(estimateVideoRequestCostCents(buildVideoRequest("wan2.2-i2v-plus", 30))).toBe(450);
  });

  it("has prices for all configured image and video models", () => {
    const imagePriceKeys = new Set(modelPrices.map((item) => `${item.providerId}:${item.modelId}`));
    for (const providerId of providerOrder) {
      for (const modelId of providerConfigs[providerId].models) {
        expect(imagePriceKeys.has(`${providerId}:${modelId}`), `${providerId}:${modelId}`).toBe(true);
      }
    }

    const videoPriceKeys = new Set(videoModelPrices.map((item) => `${item.providerId}:${item.modelId}`));
    for (const model of videoModelCatalog) {
      expect(videoPriceKeys.has(`${model.providerId}:${model.modelId}`), `${model.providerId}:${model.modelId}`).toBe(true);
      expect(getVideoUnitPriceCents({ providerId: model.providerId, modelId: model.modelId })).toBeGreaterThan(0);
    }
  });
});

function buildRequest(): ProductShotRequest {
  return {
    sourceImagePath: "product.png",
    providerId: "volcano",
    modelId: "doubao-seedream-5-0-260128",
    presetIds: ["white-main", "scene", "promotion-poster"],
    fidelity: "strict",
    quality: "ultra",
    outputCount: 1,
    aspectRatio: "1:1",
    exportFormat: "png"
  };
}

function buildVideoRequest(modelId: string, durationSeconds: number): Pick<VideoGenerationRequest, "providerId" | "modelId" | "durationSeconds"> {
  return {
    providerId: "aliyun",
    modelId,
    durationSeconds
  };
}
