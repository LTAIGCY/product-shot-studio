import { describe, expect, it, vi } from "vitest";
import os from "node:os";
import path from "node:path";
import { ProductShotService } from "./productShotService";
import type {
  ProductShotRequest,
  ProductShotResult,
  ProviderAdapter,
  ProviderGenerateContext
} from "../../shared/types";

vi.mock("electron", () => ({
  nativeImage: {
    createFromPath: () => ({
      isEmpty: () => false,
      getSize: () => ({ width: 1024, height: 1024 })
    })
  }
}));

function buildRequest(): ProductShotRequest {
  return {
    sourceImagePath: path.join(os.tmpdir(), "source-product.png"),
    providerId: "aliyun",
    modelId: "qwen-image-edit",
    presetIds: ["white-main", "marketing-banner"],
    fidelity: "strict",
    productBrief: "matte black coffee tumbler for office commuters",
    styleGuide: "warm kitchen counter with clean premium props",
    outputCount: 1,
    aspectRatio: "1:1",
    exportFormat: "png"
  };
}

function buildService(adapter: ProviderAdapter) {
  const upsertJob = vi.fn().mockResolvedValue(undefined);
  const service = new ProductShotService(
    os.tmpdir(),
    { get: vi.fn().mockResolvedValue("sk-test") } as never,
    { upsertJob } as never,
    { aliyun: adapter }
  );
  return { service, upsertJob };
}

describe("ProductShotService", () => {
  it("generates all selected presets through a provider adapter", async () => {
    const adapter = createMockAdapter(async (context) => [buildResult(context)]);
    const { service, upsertJob } = buildService(adapter);
    const progress = vi.fn();

    const job = await service.generate(buildRequest(), progress);

    expect(job.status).toBe("completed");
    expect(job.results).toHaveLength(2);
    expect(job.errors).toHaveLength(0);
    expect(adapter.generateProductShot).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        prompt: expect.stringContaining("matte black coffee tumbler")
      })
    );
    expect(adapter.generateProductShot).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        prompt: expect.stringContaining("warm kitchen counter")
      })
    );
    expect(progress).toHaveBeenCalledWith(expect.objectContaining({ presetId: "white-main", status: "completed" }));
    expect(progress).toHaveBeenCalledWith(expect.objectContaining({ presetId: "marketing-banner", status: "completed" }));
    expect(upsertJob).toHaveBeenCalled();
  });

  it("keeps successful results when one preset fails", async () => {
    const adapter = createMockAdapter(async (context) => {
      if (context.presetId === "marketing-banner") {
        throw new Error("HTTP 429 rate limit for sk-test");
      }
      return [buildResult(context)];
    });
    const { service } = buildService(adapter);

    const job = await service.generate(buildRequest(), vi.fn());

    expect(job.status).toBe("partial");
    expect(job.results).toHaveLength(1);
    expect(job.errors).toHaveLength(1);
    expect(job.errors[0].retryable).toBe(true);
    expect(job.errors[0].message).not.toContain("sk-test");
  });

  it("clamps requested output count before calling a provider", async () => {
    const adapter = createMockAdapter(async (context) => [buildResult(context)]);
    const { service } = buildService(adapter);

    await service.generate({ ...buildRequest(), outputCount: 12 }, vi.fn());

    expect(adapter.generateProductShot).toHaveBeenCalledWith(
      expect.objectContaining({ outputCount: 4 }),
      expect.anything()
    );
  });

  it("marks active jobs canceled and ignores late provider results", async () => {
    let resolveProvider: (() => void) | undefined;
    const adapter = createMockAdapter(
      async (context) =>
        new Promise<ProductShotResult[]>((resolve) => {
          resolveProvider = () => resolve([buildResult(context)]);
        })
    );
    const { service } = buildService(adapter);
    const progress = vi.fn();
    const generatePromise = service.generate({ ...buildRequest(), presetIds: ["white-main"] }, progress);

    await waitForCondition(() =>
      progress.mock.calls.some(([item]) => item.presetId === "white-main" && item.status === "running")
    );
    const jobId = progress.mock.calls.find(([item]) => item.status === "running")?.[0].jobId;
    expect(jobId).toBeTruthy();

    await service.cancel(String(jobId));
    resolveProvider?.();
    const job = await generatePromise;

    expect(job.status).toBe("canceled");
    expect(job.results).toHaveLength(0);
    expect(adapter.cancelJob).toHaveBeenCalledWith(jobId);
    expect(progress).toHaveBeenCalledWith(expect.objectContaining({ presetId: "white-main", status: "canceled" }));
  });
});

function createMockAdapter(
  generateProductShot: (
    context: ProviderGenerateContext
  ) => Promise<ProductShotResult[]>
): ProviderAdapter {
  return {
    id: "aliyun",
    validateKey: vi.fn().mockResolvedValue(true),
    getCapabilities: vi.fn(),
    generateProductShot: vi.fn(async (_request, context) => generateProductShot(context)),
    cancelJob: vi.fn().mockResolvedValue(undefined)
  };
}

function buildResult(context: ProviderGenerateContext): ProductShotResult {
  const imagePath = path.join(context.outputDir, `${context.presetId}.png`);
  return {
    presetId: context.presetId,
    providerId: "aliyun",
    modelId: "qwen-image-edit",
    imagePath,
    promptUsed: context.prompt,
    dimensions: { width: 0, height: 0 },
    warnings: [],
    createdAt: new Date().toISOString()
  };
}

async function waitForCondition(check: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error("Timed out waiting for condition.");
}
