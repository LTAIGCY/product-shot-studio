import { describe, expect, it } from "vitest";
import { estimateRequestCostCents, estimateVideoRequestCostCents, formatUsdCents, getUnitPriceCents } from "./billing";
import type { ProductShotRequest } from "./types";

describe("billing estimates", () => {
  it("calculates per-image and request-level image generation cost", () => {
    const unit = getUnitPriceCents({
      providerId: "volcano",
      modelId: "doubao-seedream-5-0-260128",
      quality: "ultra"
    });

    expect(unit).toBe(42);
    expect(estimateRequestCostCents(buildRequest())).toBe(126);
  });

  it("formats wallet values as credits", () => {
    expect(formatUsdCents(7200)).toBe("7,200\u79ef\u5206");
  });

  it("calculates video generation credits by duration and resolution", () => {
    expect(estimateVideoRequestCostCents({ durationSeconds: 5, resolution: "720p" })).toBe(500);
    expect(estimateVideoRequestCostCents({ durationSeconds: 5, resolution: "1080p" })).toBe(800);
  });
});

function buildRequest(): ProductShotRequest {
  return {
    sourceImagePath: "product.png",
    providerId: "volcano",
    modelId: "doubao-seedream-5-0-260128",
    presetIds: ["white-main", "lifestyle-scene", "marketing-banner"],
    fidelity: "strict",
    quality: "ultra",
    outputCount: 1,
    aspectRatio: "1:1",
    exportFormat: "png"
  };
}
