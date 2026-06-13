import { describe, expect, it } from "vitest";
import {
  getAllowedVideoAspectRatio,
  getAllowedVideoDuration,
  getAllowedVideoResolution,
  getDefaultVideoModelId,
  getVideoModelMeta,
  getVideoModelsForProvider
} from "./videoModels";

describe("video model catalog", () => {
  it("includes domestic video-capable providers", () => {
    expect(getVideoModelsForProvider("aliyun").map((model) => model.modelId)).toContain("wanx2.1-i2v-turbo");
    expect(getVideoModelsForProvider("volcano").map((model) => model.modelId)).toContain("doubao-seedance-2-0-260128");
    expect(getVideoModelsForProvider("tencent").map((model) => model.modelId)).toContain("tencent-vod-hunyuan-1.5");
  });

  it("keeps Tencent VOD metadata on Tencent video models", () => {
    const model = getVideoModelMeta("tencent", "tencent-vod-kling-3.0");

    expect(model?.tencentVod).toEqual({
      modelName: "Kling",
      modelVersion: "3.0",
      fileUsage: "FirstFrame"
    });
  });

  it("clamps video options to the selected model capability", () => {
    const modelId = getDefaultVideoModelId("tencent");

    expect(getAllowedVideoAspectRatio("tencent", modelId, "3:2")).toBe("16:9");
    expect(getAllowedVideoDuration("tencent", modelId, 30)).toBe(5);
    expect(getAllowedVideoResolution("tencent", "tencent-vod-vidu-2.0", "1080p")).toBe("720p");
  });
});
