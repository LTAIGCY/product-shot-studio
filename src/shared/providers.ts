import type { ProviderConfig, ProviderId } from "./types";

export const providerConfigs: Record<ProviderId, ProviderConfig> = {
  aliyun: {
    id: "aliyun",
    displayName: "\u963f\u91cc\u767e\u70bc",
    defaultModel: "qwen-image-edit",
    models: ["qwen-image-edit", "qwen-image"],
    apiKeyUrl: "https://bailian.console.aliyun.com/?tab=model#/api-key",
    termsUrl: "https://help.aliyun.com/zh/model-studio/"
  },
  volcano: {
    id: "volcano",
    displayName: "\u706b\u5c71\u65b9\u821f",
    defaultModel: "doubao-seedream-5-0-260128",
    models: [
      "doubao-seedream-5-0-260128",
      "doubao-seedream-4-0-250828",
      "doubao-seedream-3-0-t2i-250415"
    ],
    apiKeyUrl: "https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey",
    termsUrl: "https://www.volcengine.com/docs/82379"
  },
  tencent: {
    id: "tencent",
    displayName: "\u817e\u8baf\u6df7\u5143",
    defaultModel: "hunyuan-image-rapid",
    models: ["hunyuan-image-rapid", "hunyuan-image"],
    apiKeyUrl: "https://console.cloud.tencent.com/cam/capi",
    termsUrl: "https://cloud.tencent.com/document/product/1729"
  }
};

export const providerOrder: ProviderId[] = ["aliyun", "volcano", "tencent"];
