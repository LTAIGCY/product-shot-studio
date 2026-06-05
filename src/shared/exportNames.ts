import type { ExportFormat } from "./types";

export function buildExportFileName(input: {
  index: number;
  presetId: string;
  providerId: string;
  format: ExportFormat;
}): string {
  const extension = input.format === "jpg" ? "jpg" : input.format;
  const indexText = String(input.index + 1).padStart(2, "0");
  return `${indexText}-${input.providerId}-${input.presetId}.${extension}`;
}
