import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AliyunProviderAdapter, TencentProviderAdapter, VolcanoProviderAdapter } from "./china";
import type { ProductShotRequest, ProviderGenerateContext, ProviderId } from "../../shared/types";

const imageBytes = Buffer.from("generated-image-bytes");

afterEach(() => {
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
