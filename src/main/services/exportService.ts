import fs from "node:fs/promises";
import path from "node:path";
import { dialog } from "electron";
import type {
  ExportRequest,
  ExportResponse,
  ExportVideosRequest,
  SaveEditedImageRequest,
  SaveEditedImageResponse
} from "../../shared/types";
import { buildExportFileName } from "../../shared/exportNames";

export class ExportService {
  async exportImages(request: ExportRequest): Promise<ExportResponse> {
    const targetDir = request.targetDir?.trim() || await selectExportFolder();
    if (!targetDir) return { exportedPaths: [], warnings: ["Export canceled."] };

    await fs.mkdir(targetDir, { recursive: true });
    const exportedPaths: string[] = [];
    const warnings: string[] = [];

    for (const [index, imagePath] of request.imagePaths.entries()) {
      const sourceName = path.basename(imagePath, path.extname(imagePath));
      const segments = sourceName.split("-");
      const presetId = segments.slice(0, -1).join("-") || "product-shot";
      const fileName = buildExportFileName({
        index,
        presetId,
        providerId: "studio",
        format: request.format
      });
      const targetPath = path.join(targetDir, fileName);
      await fs.copyFile(imagePath, targetPath);
      exportedPaths.push(targetPath);
    }

    if (request.format === "webp") {
      warnings.push("WebP export keeps the provider output bytes; use a WebP-capable provider output for exact format conversion.");
    }

    return { exportedPaths, warnings };
  }

  async saveEditedImage(request: SaveEditedImageRequest): Promise<SaveEditedImageResponse> {
    const targetDir = request.targetDir?.trim() || await selectExportFolder();
    if (!targetDir) {
      throw new Error("Export canceled.");
    }
    const match = request.dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i);
    if (!match) {
      throw new Error("Unsupported edited image payload.");
    }
    const extension = match[1].toLowerCase() === "jpeg" ? "jpg" : match[1].toLowerCase();
    const safeName = (request.fileName || `edited-${new Date().toISOString().replace(/[:.]/g, "-")}.${extension}`)
      .replace(/[<>:"/\\|?*]+/g, "-");
    const fileName = /\.[a-z0-9]+$/i.test(safeName) ? safeName : `${safeName}.${extension}`;
    await fs.mkdir(targetDir, { recursive: true });
    const imagePath = path.join(targetDir, fileName);
    await fs.writeFile(imagePath, Buffer.from(match[2], "base64"));
    return { imagePath };
  }

  async exportVideos(request: ExportVideosRequest): Promise<ExportResponse> {
    const targetDir = request.targetDir?.trim() || await selectExportFolder();
    if (!targetDir) return { exportedPaths: [], warnings: ["Export canceled."] };

    await fs.mkdir(targetDir, { recursive: true });
    const exportedPaths: string[] = [];

    for (const [index, videoPath] of request.videoPaths.entries()) {
      const sourceName = path.basename(videoPath, path.extname(videoPath));
      const safeName = `${String(index + 1).padStart(2, "0")}-${sourceName}`.replace(/[<>:"/\\|?*]+/g, "-");
      const targetPath = path.join(targetDir, `${safeName}.mp4`);
      await fs.copyFile(videoPath, targetPath);
      exportedPaths.push(targetPath);
    }

    return { exportedPaths, warnings: [] };
  }
}

async function selectExportFolder(): Promise<string> {
  const dialogResult = await dialog.showOpenDialog({
    title: "\u9009\u62e9\u5bfc\u51fa\u6587\u4ef6\u5939",
    properties: ["openDirectory", "createDirectory"]
  });

  if (dialogResult.canceled || dialogResult.filePaths.length === 0) {
    return "";
  }
  return dialogResult.filePaths[0];
}
