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

  it("adds Seedance image-to-video models without changing the Volcano default", () => {
    const volcanoModelIds = getVideoModelsForProvider("volcano").map((model) => model.modelId);

    expect(getDefaultVideoModelId("volcano")).toBe("doubao-seedance-2-0-260128");
    expect(volcanoModelIds).not.toContain("doubao-seedance-1-0-pro-fast-250610");
    expect(volcanoModelIds).toEqual(
      expect.arrayContaining([
        "doubao-seedance-1-0-pro-250528",
        "doubao-seedance-1-0-pro-fast-251015",
        "doubao-seedance-1-0-lite-i2v-250428",
        "doubao-seedance-1-5-pro-251215"
      ])
    );
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
    expect(getAllowedVideoDuration("tencent", modelId, 30)).toBe(15);
    expect(getAllowedVideoResolution("tencent", "tencent-vod-vidu-2.0", "1080p")).toBe("720p");
  });

  it("keeps Seedance 1.0 duration editable within the shared 1-15 second range", () => {
    const proFastModelId = "doubao-seedance-1-0-pro-fast-251015";
    const liteModelId = "doubao-seedance-1-0-lite-i2v-250428";

    expect(getAllowedVideoDuration("volcano", proFastModelId, 1)).toBe(1);
    expect(getAllowedVideoDuration("volcano", proFastModelId, 15)).toBe(15);
    expect(getAllowedVideoDuration("volcano", proFastModelId, 30)).toBe(15);
    expect(getAllowedVideoResolution("volcano", proFastModelId, "720p")).toBe("1080p");
    expect(getAllowedVideoResolution("volcano", liteModelId, "1080p")).toBe("720p");
  });
});
