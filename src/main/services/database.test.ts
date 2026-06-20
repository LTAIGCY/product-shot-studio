import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({
  app: {
    isPackaged: false
  }
}));

import { AppDatabase } from "./database";
import type { ProductShotJob, VideoGenerationJob } from "../../shared/types";

describe("AppDatabase personal gallery", () => {
  let tempDir = "";
  let database: AppDatabase;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "product-shot-gallery-"));
    database = new AppDatabase(tempDir);
    await database.init();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("isolates gallery items by user and prevents duplicate image entries", async () => {
    const first = await database.addGalleryItem("user-a", {
      imagePath: "C:\\images\\product-a.png",
      title: "白底主图",
      providerId: "volcano",
      modelId: "doubao-seedream-5-0",
      jobId: "job-a",
      presetId: "white-main"
    });
    const duplicate = await database.addGalleryItem("user-a", {
      imagePath: "C:\\images\\product-a.png",
      title: "重复收藏"
    });
    await database.addGalleryItem("user-b", {
      imagePath: "C:\\images\\product-b.png",
      title: "生活场景图"
    });

    expect(duplicate.id).toBe(first.id);
    expect(database.listGalleryItems("user-a")).toHaveLength(1);
    expect(database.listGalleryItems("user-b")).toHaveLength(1);
    expect(database.listGalleryItems("user-a")[0].title).toBe("白底主图");
  });

  it("persists the user-defined order and compacts it after removal", async () => {
    const first = await database.addGalleryItem("user-a", {
      imagePath: "C:\\images\\first.png",
      title: "第一张"
    });
    const second = await database.addGalleryItem("user-a", {
      imagePath: "C:\\images\\second.png",
      title: "第二张"
    });
    const third = await database.addGalleryItem("user-a", {
      imagePath: "C:\\images\\third.png",
      title: "第三张"
    });

    const reordered = await database.reorderGalleryItems("user-a", [third.id, first.id, second.id]);
    expect(reordered.map((item) => item.id)).toEqual([third.id, first.id, second.id]);
    expect(reordered.map((item) => item.sortOrder)).toEqual([0, 1, 2]);

    await database.removeGalleryItem("user-a", first.id);
    const remaining = database.listGalleryItems("user-a");
    expect(remaining.map((item) => item.id)).toEqual([third.id, second.id]);
    expect(remaining.map((item) => item.sortOrder)).toEqual([0, 1]);
  });

  it("stores video gallery items with media type", async () => {
    const item = await database.addGalleryItem("user-a", {
      imagePath: "C:\\videos\\result.mp4",
      mediaType: "video",
      title: "视频结果",
      providerId: "volcano",
      modelId: "doubao-seedance-1-0-pro-fast-251015",
      jobId: "video-job"
    });

    expect(item.mediaType).toBe("video");
    expect(database.listGalleryItems("user-a")[0].mediaType).toBe("video");
  });

  it("removes one history result and moves an empty job to trash", async () => {
    const job: ProductShotJob = {
      id: "job-delete-result",
      userId: "user-a",
      mediaType: "image",
      request: {
        sourceImagePath: "C:\\images\\source.png",
        providerId: "volcano",
        modelId: "doubao-seedream-5-0",
        presetIds: ["white-main"],
        fidelity: "strict",
        outputCount: 2,
        aspectRatio: "1:1",
        exportFormat: "png"
      },
      sourceImagePath: "C:\\images\\source.png",
      status: "completed",
      results: [
        {
          presetId: "white-main",
          providerId: "volcano",
          modelId: "doubao-seedream-5-0",
          imagePath: "C:\\images\\one.png",
          promptUsed: "one",
          dimensions: { width: 1024, height: 1024 },
          warnings: [],
          createdAt: "2026-06-17T00:00:00.000Z"
        },
        {
          presetId: "white-main",
          providerId: "volcano",
          modelId: "doubao-seedream-5-0",
          imagePath: "C:\\images\\two.png",
          promptUsed: "two",
          dimensions: { width: 1024, height: 1024 },
          warnings: [],
          createdAt: "2026-06-17T00:00:01.000Z"
        }
      ],
      errors: [],
      createdAt: "2026-06-17T00:00:00.000Z",
      updatedAt: "2026-06-17T00:00:01.000Z"
    };

    await database.upsertJob(job);

    const firstDelete = await database.deleteJobResult("user-a", {
      jobId: job.id,
      mediaType: "image",
      resultPath: "C:\\images\\one.png"
    });
    expect(firstDelete.removed).toBe(true);
    expect(firstDelete.movedToTrash).toBe(false);
    expect(database.listJobs("user-a")[0].results).toHaveLength(1);

    const secondDelete = await database.deleteJobResult("user-a", {
      jobId: job.id,
      mediaType: "image",
      resultPath: "C:\\images\\two.png"
    });
    expect(secondDelete.removed).toBe(true);
    expect(secondDelete.movedToTrash).toBe(true);
    expect(database.listJobs("user-a")).toHaveLength(0);
    expect(database.listTrashedJobs("user-a")).toHaveLength(1);
  });

  it("removes video history results by video path", async () => {
    const job: VideoGenerationJob = {
      id: "video-job-delete-result",
      userId: "user-a",
      mediaType: "video",
      request: {
        sourceImagePath: "C:\\images\\source.png",
        providerId: "volcano",
        modelId: "doubao-seedance-1-0-pro-fast-251015",
        prompt: "turn",
        aspectRatio: "16:9",
        durationSeconds: 5,
        resolution: "720p",
        watermark: false,
        enableAudio: false
      },
      sourceImagePath: "C:\\images\\source.png",
      status: "completed",
      results: [
        {
          providerId: "volcano",
          modelId: "doubao-seedance-1-0-pro-fast-251015",
          videoPath: "C:\\videos\\result.mp4",
          promptUsed: "turn",
          aspectRatio: "16:9",
          durationSeconds: 5,
          resolution: "720p",
          warnings: [],
          createdAt: "2026-06-17T00:00:00.000Z"
        }
      ],
      errors: [],
      createdAt: "2026-06-17T00:00:00.000Z",
      updatedAt: "2026-06-17T00:00:00.000Z"
    };

    await database.upsertJob(job);
    const response = await database.deleteJobResult("user-a", {
      jobId: job.id,
      mediaType: "video",
      resultPath: "C:\\videos\\result.mp4"
    });

    expect(response).toMatchObject({ removed: true, movedToTrash: true });
    expect(database.listTrashedJobs("user-a")[0].mediaType).toBe("video");
  });
});
