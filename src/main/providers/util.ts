import fs from "node:fs/promises";
import path from "node:path";
import type { AspectRatio, ExportFormat, PresetId, ProviderError, ProviderId } from "../../shared/types";

const secretPatterns = [
  /sk-[A-Za-z0-9_-]+/g,
  /AIza[A-Za-z0-9_-]{8,}/g,
  /key=[A-Za-z0-9_-]+/gi,
  /bearer\s+[A-Za-z0-9._-]+/gi,
  /authorization:\s*[A-Za-z0-9._\s-]+/gi
];

export function redactSecrets(value: unknown): string {
  let text = typeof value === "string" ? value : JSON.stringify(value);
  if (!text) {
    return "";
  }
  for (const pattern of secretPatterns) {
    text = text.replace(pattern, "[redacted]");
  }
  return text;
}

export function normalizeProviderError(input: {
  providerId: ProviderId;
  presetId?: PresetId;
  error: unknown;
  fallbackCode?: string;
}): ProviderError {
  const rawMessage =
    input.error instanceof Error
      ? input.error.message
      : typeof input.error === "string"
        ? input.error
        : JSON.stringify(input.error);

  const redactedMessage = redactSecrets(rawMessage || "Provider request failed.");
  const message = localizeProviderMessage(input.providerId, redactedMessage);
  const lower = `${redactedMessage} ${message}`.toLowerCase();
  const retryable =
    !isNonRetryableProviderError(lower) &&
    (lower.includes("timeout") ||
      lower.includes("network") ||
      lower.includes("rate") ||
      lower.includes("429") ||
      lower.includes("500") ||
      lower.includes("502") ||
      lower.includes("503") ||
      lower.includes("504"));

  return {
    providerId: input.providerId,
    presetId: input.presetId,
    code: input.fallbackCode ?? inferErrorCode(lower),
    message,
    retryable
  };
}

function inferErrorCode(lowerMessage: string): string {
  if (
    lowerMessage.includes("has not activated the model") ||
    lowerMessage.includes("not activated the model") ||
    lowerMessage.includes("does not exist or you do not have access") ||
    lowerMessage.includes("\u672a\u5f00\u901a\u6a21\u578b")
  ) {
    return "model_not_enabled";
  }
  if (lowerMessage.includes("parameter") && lowerMessage.includes("size") && lowerMessage.includes("not valid")) {
    return "invalid_size";
  }
  if (lowerMessage.includes("401") || lowerMessage.includes("403") || lowerMessage.includes("auth")) {
    return "auth_failed";
  }
  if (isQuotaOrLimitError(lowerMessage)) {
    return "quota_or_limit_reached";
  }
  if (lowerMessage.includes("safety") || lowerMessage.includes("policy") || lowerMessage.includes("moderation")) {
    return "safety_rejected";
  }
  if (lowerMessage.includes("timeout")) {
    return "timeout";
  }
  return "provider_error";
}

function isNonRetryableProviderError(lowerMessage: string): boolean {
  return (
    lowerMessage.includes("401") ||
    lowerMessage.includes("403") ||
    lowerMessage.includes("has not activated the model") ||
    lowerMessage.includes("not activated the model") ||
    lowerMessage.includes("does not exist or you do not have access") ||
    lowerMessage.includes("\u672a\u5f00\u901a\u6a21\u578b") ||
    isQuotaOrLimitError(lowerMessage)
  );
}

function localizeProviderMessage(providerId: ProviderId, message: string): string {
  const cleaned = message
    .replace(/%!\w+\(MISSING\)/g, "\u5f53\u524d\u8d26\u53f7")
    .replace(/%!\w+\(int64=(\d+)\)/g, "\u8d26\u53f7 $1");

  const quotaMessage = localizeQuotaOrLimitMessage(providerId, cleaned);
  if (quotaMessage) {
    return quotaMessage;
  }

  if (providerId !== "volcano") {
    return cleaned;
  }

  const unavailableModel = cleaned.match(/model or endpoint\s+([A-Za-z0-9._:-]+)\s+does not exist or you do not have access/i)?.[1];
  if (unavailableModel) {
    const requestId = cleaned.match(/Request id:\s*([A-Za-z0-9-]+)/i)?.[1];
    return [
      `\u706b\u5c71\u65b9\u821f\u6682\u65f6\u65e0\u6cd5\u8bbf\u95ee\u6a21\u578b ${unavailableModel}\uff1a\u6a21\u578b ID \u53ef\u80fd\u5df2\u66f4\u65b0\uff0c\u6216\u5f53\u524d\u8d26\u53f7\u5c1a\u672a\u5f00\u901a\u8be5\u6a21\u578b/\u63a5\u5165\u70b9\u6743\u9650\u3002`,
      "\u8bf7\u5148\u4f7f\u7528\u8f6f\u4ef6\u5185\u6700\u65b0\u6a21\u578b ID \u91cd\u8bd5\uff1b\u5982\u679c\u4ecd\u7136\u62a5\u9519\uff0c\u8bf7\u5230\u706b\u5c71\u65b9\u821f\u63a7\u5236\u53f0\u786e\u8ba4\u8be5\u6a21\u578b\u5df2\u5f00\u901a\u3002",
      requestId ? `\u8bf7\u6c42 ID\uff1a${requestId}` : ""
    ]
      .filter(Boolean)
      .join("");
  }

  const model = cleaned.match(/has not activated the model\s+([A-Za-z0-9._:-]+)/i)?.[1];
  if (model) {
    const requestId = cleaned.match(/Request id:\s*([A-Za-z0-9-]+)/i)?.[1];
    return [
      `\u5f53\u524d\u706b\u5c71\u65b9\u821f\u8d26\u53f7\u5c1a\u672a\u5f00\u901a\u6a21\u578b ${model}\u3002`,
      "\u8bf7\u5728\u706b\u5c71\u65b9\u821f\u63a7\u5236\u53f0\u5f00\u901a\u8be5\u6a21\u578b\uff0c\u6216\u5728\u5de6\u4fa7\u6a21\u578b\u8f93\u5165\u6846\u586b\u5199\u4f60\u5df2\u5f00\u901a\u7684\u6a21\u578b/\u63a5\u5165\u70b9 ID\u3002",
      requestId ? `\u8bf7\u6c42 ID\uff1a${requestId}` : ""
    ]
      .filter(Boolean)
      .join("");
  }

  const requestId = cleaned.match(/Request id:\s*([A-Za-z0-9-]+)/i)?.[1];
  if (/parameter\s+`?size`?\s+specified in the request is not valid/i.test(cleaned)) {
    return [
      "\u706b\u5c71\u65b9\u821f\u62d2\u7edd\u4e86\u5f53\u524d\u8f93\u51fa\u5c3a\u5bf8\u3002Seedream 4.0/5.0 \u9700\u8981 2K \u7ea7\u522b\u7684\u8f93\u51fa\u5c3a\u5bf8\uff0c\u8bf7\u4f7f\u7528\u66f4\u65b0\u540e\u7684\u8f6f\u4ef6\u91cd\u8bd5\u3002",
      requestId ? `\u8bf7\u6c42 ID\uff1a${requestId}` : ""
    ]
      .filter(Boolean)
      .join("");
  }

  return cleaned;
}

function isQuotaOrLimitError(lowerMessage: string): boolean {
  return (
    lowerMessage.includes("has reached the set inference limit") ||
    lowerMessage.includes("inference limit") ||
    lowerMessage.includes("safe experience mode") ||
    lowerMessage.includes("model service has been paused") ||
    lowerMessage.includes("quota") ||
    lowerMessage.includes("out of quota") ||
    lowerMessage.includes("insufficient balance") ||
    lowerMessage.includes("insufficient credit") ||
    lowerMessage.includes("no credit") ||
    lowerMessage.includes("arrears") ||
    lowerMessage.includes("\u4f59\u989d\u4e0d\u8db3") ||
    lowerMessage.includes("\u989d\u5ea6\u4e0d\u8db3") ||
    lowerMessage.includes("\u989d\u5ea6\u7528\u5b8c") ||
    lowerMessage.includes("\u8c03\u7528\u9650\u989d") ||
    lowerMessage.includes("\u63a8\u7406\u9650\u989d") ||
    lowerMessage.includes("\u514d\u8d39\u989d\u5ea6") ||
    lowerMessage.includes("\u6b20\u8d39")
  );
}

function localizeQuotaOrLimitMessage(providerId: ProviderId, message: string): string | null {
  const lower = message.toLowerCase();
  if (!isQuotaOrLimitError(lower)) {
    return null;
  }

  const requestId = message.match(/Request id:\s*([A-Za-z0-9-]+)/i)?.[1];
  const requestSuffix = requestId ? `\u8bf7\u6c42 ID\uff1a${requestId}` : "";

  if (providerId === "volcano") {
    const account = message.match(/account\s+\[?(\d+)\]?/i)?.[1] ?? message.match(/\u8d26\u53f7\s+(\d+)/)?.[1];
    const model = message.match(/for the\s+\[?([A-Za-z0-9._:-]+)\]?\s+model/i)?.[1];
    return [
      `\u706b\u5c71\u65b9\u821f${account ? `\u8d26\u53f7 ${account} ` : ""}\u5df2\u8fbe\u5230${model ? ` ${model} \u6a21\u578b` : "\u5f53\u524d\u6a21\u578b"}\u7684\u63a8\u7406\u9650\u989d\uff0c\u6216 API \u989d\u5ea6/\u4f59\u989d\u5df2\u4e0d\u8db3\uff0c\u6a21\u578b\u670d\u52a1\u5df2\u6682\u505c\u3002`,
      "\u8bf7\u5230\u706b\u5c71\u65b9\u821f\u63a7\u5236\u53f0\u68c0\u67e5\u8d26\u6237\u4f59\u989d\u3001\u514d\u8d39\u989d\u5ea6\u548c\u6a21\u578b\u9650\u989d\uff1b\u5982\u679c\u5f00\u542f\u4e86 Safe Experience Mode\uff0c\u8bf7\u5728 Model Activation \u9875\u9762\u8c03\u6574\u6216\u5173\u95ed\u540e\u518d\u8bd5\u3002",
      requestSuffix
    ]
      .filter(Boolean)
      .join("");
  }

  return [
    "\u6a21\u578b\u5e73\u53f0\u63d0\u793a API \u989d\u5ea6\u4e0d\u8db3\u3001\u8d26\u6237\u4f59\u989d\u4e0d\u8db3\u6216\u5df2\u8fbe\u5230\u8c03\u7528\u9650\u989d\u3002",
    "\u8bf7\u5148\u5230\u5bf9\u5e94\u6a21\u578b\u5e73\u53f0\u68c0\u67e5\u8d26\u5355\u3001\u514d\u8d39\u989d\u5ea6\u548c\u6a21\u578b\u9650\u989d\uff1b\u5145\u503c\u3001\u63d0\u5347\u9650\u989d\u6216\u5207\u6362\u5176\u4ed6\u53ef\u7528\u6a21\u578b\u540e\u518d\u91cd\u8bd5\u3002",
    requestSuffix
  ]
    .filter(Boolean)
    .join("");
}

export function aspectRatioToSize(aspectRatio: AspectRatio): string {
  switch (aspectRatio) {
    case "1:1":
      return "1024x1024";
    case "4:5":
      return "1024x1280";
    case "16:9":
      return "1536x864";
    case "3:2":
      return "1536x1024";
    default:
      return "1024x1024";
  }
}

export function outputFormatToExtension(format: ExportFormat): string {
  return format === "jpg" ? "jpg" : format;
}

export function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
}

export async function fileToBlob(filePath: string, mimeType = getMimeType(filePath)): Promise<Blob> {
  const bytes = await fs.readFile(filePath);
  return new Blob([bytes], { type: mimeType });
}

export async function writeBase64Image(input: {
  b64: string;
  outputDir: string;
  fileName: string;
}): Promise<string> {
  await fs.mkdir(input.outputDir, { recursive: true });
  const normalized = input.b64.replace(/^data:image\/[a-z0-9.+-]+;base64,/i, "");
  const filePath = path.join(input.outputDir, input.fileName);
  await fs.writeFile(filePath, Buffer.from(normalized, "base64"));
  return filePath;
}

export async function writeBinaryImage(input: {
  data: ArrayBuffer;
  outputDir: string;
  fileName: string;
}): Promise<string> {
  await fs.mkdir(input.outputDir, { recursive: true });
  const filePath = path.join(input.outputDir, input.fileName);
  await fs.writeFile(filePath, Buffer.from(input.data));
  return filePath;
}
