import fs from "node:fs/promises";
import path from "node:path";
import { dialog } from "electron";
import type { CanvasExportRequest, CanvasExportResponse, ExportFormat } from "../../shared/types";

const imagePayloadPattern = /^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i;

export class CanvasAssetService {
  private readonly renderDir: string;
  private readonly thumbnailDir: string;

  constructor(userDataPath: string) {
    this.renderDir = path.join(userDataPath, "canvas-renders");
    this.thumbnailDir = path.join(userDataPath, "canvas-thumbnails");
  }

  async saveThumbnail(projectId: string, dataUrl?: string): Promise<string | undefined> {
    if (!dataUrl) return undefined;
    await fs.mkdir(this.thumbnailDir, { recursive: true });
    return this.writeDataUrl(dataUrl, this.thumbnailDir, `${projectId}-thumbnail.png`, "png");
  }

  async saveRenderForGallery(title: string, dataUrl: string, format: ExportFormat): Promise<string> {
    await fs.mkdir(this.renderDir, { recursive: true });
    return this.writeDataUrl(
      dataUrl,
      this.renderDir,
      `${safeFileName(title || "free-canvas")}-${timestampSegment()}.${format}`,
      format
    );
  }

  async exportImage(request: CanvasExportRequest): Promise<CanvasExportResponse> {
    const targetDir = request.targetDir?.trim() || await selectExportFolder();
    if (!targetDir) {
      throw new Error("Export canceled.");
    }
    await fs.mkdir(targetDir, { recursive: true });
    const imagePath = await this.writeDataUrl(
      request.dataUrl,
      targetDir,
      `${safeFileName(request.title || "free-canvas")}-${timestampSegment()}.${request.format}`,
      request.format
    );
    return { imagePath };
  }

  private async writeDataUrl(
    dataUrl: string,
    targetDir: string,
    fileName: string,
    expectedFormat: ExportFormat
  ): Promise<string> {
    const match = dataUrl.match(imagePayloadPattern);
    if (!match) {
      throw new Error("Unsupported canvas image payload.");
    }
    const payloadFormat = normalizeFormat(match[1]);
    const extension = expectedFormat || payloadFormat;
    const resolvedName = safeFileName(fileName.replace(/\.[a-z0-9]+$/i, ""));
    const imagePath = path.join(targetDir, `${resolvedName}.${extension}`);
    await fs.writeFile(imagePath, Buffer.from(match[2], "base64"));
    return imagePath;
  }
}

async function selectExportFolder(): Promise<string> {
  const result = await dialog.showOpenDialog({
    title: "选择自由画布导出文件夹",
    properties: ["openDirectory", "createDirectory"]
  });
  if (result.canceled || result.filePaths.length === 0) {
    return "";
  }
  return result.filePaths[0];
}

function normalizeFormat(format: string): ExportFormat {
  return format.toLowerCase() === "jpeg" ? "jpg" : (format.toLowerCase() as ExportFormat);
}

function safeFileName(value: string): string {
  return value.trim().replace(/[<>:"/\\|?*]+/g, "-").replace(/\s+/g, "-") || "free-canvas";
}

function timestampSegment(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}
