import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AliyunProviderAdapter, TencentProviderAdapter, VolcanoProviderAdapter } from "./china";
import type {
  ProductShotRequest,
  ProviderGenerateContext,
  ProviderId,
  ProviderVideoGenerateContext,
  VideoGenerationRequest
} from "../../shared/types";

const imageBytes = Buffer.from("generated-image-bytes");
const videoBytes = Buffer.from("generated-video-bytes");

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("domestic provider adapters", () => {
  it("maps Aliyun product-shot edits to DashScope image synthesis", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        output: { results: [{ base64: imageBytes.toString("base64") }] }
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    const fixture = await createFixture("aliyun", "qwen-image-edit");

    const results = await new AliyunProviderAdapter().generateProductShot(fixture.request, fixture.context);

    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://dashscope.aliyuncs.com/api/v1/services/aigc/image2image/image-synthesis"
    );
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.headers).toEqual({
      Authorization: "Bearer test-key",
      "Content-Type": "application/json",
      "X-DashScope-Async": "enable"
    });
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe("qwen-image-edit");
    expect(body.input.prompt).toContain("Strictly preserve");
    expect(body.input.image_url).toContain("data:image/png;base64,");
    expect(body.parameters.size).toBe("1024x1024");
    expect(await fs.readFile(results[0].imagePath, "utf8")).toBe("generated-image-bytes");
  });

  it("requests Aliyun repeatedly until the requested output count is collected", async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        Response.json({
          output: { results: [{ base64: imageBytes.toString("base64") }] }
        })
      )
    );
    vi.stubGlobal("fetch", fetchMock);
    const fixture = await createFixture("aliyun", "qwen-image-edit");
    fixture.request.outputCount = 4;

    const results = await new AliyunProviderAdapter().generateProductShot(fixture.request, fixture.context);

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(results).toHaveLength(4);
    expect(path.basename(results[0].imagePath)).toBe("white-main-1.png");
    expect(path.basename(results[3].imagePath)).toBe("white-main-4.png");
  });

  it("maps Volcano Seedream image edits to Ark images API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        data: [{ b64_json: imageBytes.toString("base64") }]
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    const fixture = await createFixture("volcano", "doubao-seedream-5-0-260128");

    const results = await new VolcanoProviderAdapter().generateProductShot(fixture.request, fixture.context);

    expect(fetchMock.mock.calls[0][0]).toBe("https://ark.cn-beijing.volces.com/api/v3/images/generations");
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.headers).toEqual({
      Authorization: "Bearer test-key",
      "Content-Type": "application/json"
    });
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe("doubao-seedream-5-0-260128");
    expect(body.prompt).toContain("Strictly preserve");
    expect(body.image).toContain("data:image/png;base64,");
    expect(body.response_format).toBe("b64_json");
    expect(body.size).toBe("2048x2048");
    expect(await fs.readFile(results[0].imagePath, "utf8")).toBe("generated-image-bytes");
  });

  it("maps Tencent Hunyuan image edits to signed Tencent Cloud requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        Response: { ResultImage: imageBytes.toString("base64") }
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    const fixture = await createFixture("tencent", "hunyuan-image-rapid", "secret-id:secret-key");

    const results = await new TencentProviderAdapter().generateProductShot(fixture.request, fixture.context);

    expect(fetchMock.mock.calls[0][0]).toBe("https://hunyuan.tencentcloudapi.com");
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["X-TC-Action"]).toBe("TextToImageRapid");
    expect(headers["X-TC-Version"]).toBe("2023-09-01");
    expect(headers.Authorization).toContain("TC3-HMAC-SHA256 Credential=secret-id/");
    const body = JSON.parse(String(init.body));
    expect(body.Prompt).toContain("Strictly preserve");
    expect(body.ImageBase64).not.toContain("data:image");
    expect(await fs.readFile(results[0].imagePath, "utf8")).toBe("generated-image-bytes");
  });

  it("requests Volcano repeatedly until the requested output count is collected", async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        Response.json({
          data: [{ b64_json: imageBytes.toString("base64") }]
        })
      )
    );
    vi.stubGlobal("fetch", fetchMock);
    const fixture = await createFixture("volcano", "doubao-seedream-5-0-260128");
    fixture.request.outputCount = 4;

    const results = await new VolcanoProviderAdapter().generateProductShot(fixture.request, fixture.context);

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(results).toHaveLength(4);
    expect(path.basename(results[0].imagePath)).toBe("white-main-1.png");
    expect(path.basename(results[3].imagePath)).toBe("white-main-4.png");
  });

  it("requests Tencent Hunyuan repeatedly when multiple output images are requested", async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        Response.json({
          Response: { ResultImage: imageBytes.toString("base64") }
        })
      )
    );
    vi.stubGlobal("fetch", fetchMock);
    const fixture = await createFixture("tencent", "hunyuan-image-rapid", "secret-id:secret-key");
    fixture.request.outputCount = 4;

    const results = await new TencentProviderAdapter().generateProductShot(fixture.request, fixture.context);

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(results).toHaveLength(4);
    expect(path.basename(results[0].imagePath)).toBe("white-main-1.png");
    expect(path.basename(results[3].imagePath)).toBe("white-main-4.png");
  });

  it("maps Aliyun product videos to DashScope video synthesis", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({
        output: { video_url: "https://video.example/aliyun.mp4" }
      }))
      .mockResolvedValueOnce(new Response(new Uint8Array(videoBytes)));
    vi.stubGlobal("fetch", fetchMock);
    const fixture = await createVideoFixture("aliyun", "wanx2.1-i2v-turbo");

    const result = await new AliyunProviderAdapter().generateProductVideo(fixture.request, fixture.context);

    expect(fetchMock.mock.calls[0][0]).toBe("https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis");
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe("wanx2.1-i2v-turbo");
    expect(body.input.img_url).toContain("data:image/png;base64,");
    expect(body.parameters.duration).toBe(5);
    expect(await fs.readFile(result.videoPath, "utf8")).toBe("generated-video-bytes");
  });

  it("maps Volcano product videos to Ark content generation tasks", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({
        output: { video_url: "https://video.example/volcano.mp4" }
      }))
      .mockResolvedValueOnce(new Response(new Uint8Array(videoBytes)));
    vi.stubGlobal("fetch", fetchMock);
    const fixture = await createVideoFixture("volcano", "doubao-seedance-2-0-260128");

    const result = await new VolcanoProviderAdapter().generateProductVideo(fixture.request, fixture.context);

    expect(fetchMock.mock.calls[0][0]).toBe("https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks");
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe("doubao-seedance-2-0-260128");
    expect(body.content[1].image_url.url).toContain("data:image/png;base64,");
    expect(body.parameters.duration).toBe(5);
    expect(await fs.readFile(result.videoPath, "utf8")).toBe("generated-video-bytes");
  });

  it("creates and polls Tencent VOD AIGC video tasks", async () => {
    vi.spyOn(globalThis, "setTimeout").mockImplementation((handler: TimerHandler) => {
      if (typeof handler === "function") {
        handler();
      }
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({
        Response: { TaskId: "vod-task-id" }
      }))
      .mockResolvedValueOnce(Response.json({
        Response: {
          Status: "FINISH",
          AigcVideoTask: {
            Status: "FINISH",
            Output: {
              FileInfos: [{ FileUrl: "https://video.example/tencent.mp4" }]
            }
          }
        }
      }))
      .mockResolvedValueOnce(new Response(new Uint8Array(videoBytes)));
    vi.stubGlobal("fetch", fetchMock);
    const fixture = await createVideoFixture("tencent", "tencent-vod-hunyuan-1.5", "secret-id:secret-key");
    fixture.request.tencentVodSubAppId = "1500000000";

    const result = await new TencentProviderAdapter().generateProductVideo(fixture.request, fixture.context);

    expect(fetchMock.mock.calls[0][0]).toBe("https://vod.tencentcloudapi.com");
    const createInit = fetchMock.mock.calls[0][1] as RequestInit;
    const createHeaders = createInit.headers as Record<string, string>;
    const createBody = JSON.parse(String(createInit.body));
    expect(createHeaders["X-TC-Action"]).toBe("CreateAigcVideoTask");
    expect(createHeaders["X-TC-Version"]).toBe("2018-07-17");
    expect(createBody.SubAppId).toBe(1500000000);
    expect(createBody.ModelName).toBe("Hunyuan");
    expect(createBody.ModelVersion).toBe("1.5");
    expect(createBody.FileInfos[0].Base64).toBe(Buffer.from("source-image-bytes").toString("base64"));
    expect(fetchMock.mock.calls[1][0]).toBe("https://vod.tencentcloudapi.com");
    expect(await fs.readFile(result.videoPath, "utf8")).toBe("generated-video-bytes");
  });
});

async function createFixture(providerId: ProviderId, modelId: string, apiKey = "test-key") {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), `product-shot-${providerId}-`));
  const sourceImagePath = path.join(dir, "source.png");
  await fs.writeFile(sourceImagePath, Buffer.from("source-image-bytes"));
  const outputDir = path.join(dir, "output");
  await fs.mkdir(outputDir);

  const request: ProductShotRequest = {
    sourceImagePath,
    providerId,
    modelId,
    presetIds: ["white-main"],
    fidelity: "strict",
    outputCount: 1,
    aspectRatio: "1:1",
    exportFormat: "png"
  };

  const context: ProviderGenerateContext = {
    jobId: `test-${providerId}`,
    apiKey,
    presetId: "white-main",
    prompt:
      "Create a premium product image. Strictly preserve the source product identity, color, logo, shape, and material.",
    outputDir,
    sourceMimeType: "image/png"
  };

  return { request, context };
}

async function createVideoFixture(providerId: ProviderId, modelId: string, apiKey = "test-key") {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), `product-video-${providerId}-`));
  const sourceImagePath = path.join(dir, "source.png");
  await fs.writeFile(sourceImagePath, Buffer.from("source-image-bytes"));
  const outputDir = path.join(dir, "output");
  await fs.mkdir(outputDir);

  const request: VideoGenerationRequest = {
    sourceImagePath,
    providerId,
    modelId,
    prompt: "Create a premium ecommerce product video.",
    aspectRatio: "16:9",
    durationSeconds: 5,
    resolution: "720p",
    watermark: false,
    enableAudio: false
  };

  const context: ProviderVideoGenerateContext = {
    jobId: `test-${providerId}`,
    apiKey,
    prompt: "Create a premium ecommerce product video.",
    outputDir,
    sourceMimeType: "image/png"
  };

  return { request, context };
}
