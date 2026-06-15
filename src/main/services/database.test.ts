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
});
