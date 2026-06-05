import fs from "node:fs/promises";
import path from "node:path";
import { nativeImage, type NativeImage } from "electron";
import type { ImportedImage } from "../../shared/types";
import { getMimeType } from "../providers/util";

const supportedExtensions = new Set([".png", ".jpg", ".jpeg", ".webp"]);

export class ImageService {
  private readonly sourceDir: string;

  constructor(userDataPath: string) {
    this.sourceDir = path.join(userDataPath, "source-images");
  }

  async importImage(originalPath: string): Promise<ImportedImage> {
    const ext = path.extname(originalPath).toLowerCase();
    if (!supportedExtensions.has(ext)) {
      throw new Error("Only PNG, JPG, JPEG, and WebP product images are supported.");
    }

    await fs.mkdir(this.sourceDir, { recursive: true });
    const bytes = await fs.readFile(originalPath);
    const baseName = `${new Date().toISOString().replace(/[:.]/g, "-")}-${path.basename(originalPath)}`;
    const copiedPath = path.join(this.sourceDir, baseName);
    await fs.writeFile(copiedPath, bytes);

    const image = nativeImage.createFromPath(copiedPath);
    const dimensions = image.isEmpty() ? { width: 0, height: 0 } : image.getSize();
    const previewDataUrl = image.isEmpty()
      ? `data:${getMimeType(copiedPath)};base64,${bytes.toString("base64")}`
      : image.resize({ width: 720 }).toDataURL();

    const preparedPath = await this.prepareForProvider(copiedPath, image);
    const stats = await fs.stat(preparedPath);

    return {
      sourceImagePath: preparedPath,
      originalPath,
      previewDataUrl,
      mimeType: getMimeType(preparedPath),
      sizeBytes: stats.size,
      dimensions
    };
  }

  private async prepareForProvider(filePath: string, image: NativeImage): Promise<string> {
    if (image.isEmpty()) {
      return filePath;
    }
    const size = image.getSize();
    const maxDimension = Math.max(size.width, size.height);
    if (maxDimension <= 2048) {
      return filePath;
    }

    const scale = 2048 / maxDimension;
    const resized = image.resize({
      width: Math.round(size.width * scale),
      height: Math.round(size.height * scale),
      quality: "best"
    });
    const preparedPath = filePath.replace(path.extname(filePath), "-prepared.jpg");
    await fs.writeFile(preparedPath, resized.toJPEG(92));
    return preparedPath;
  }
}
