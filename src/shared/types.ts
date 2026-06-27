export type ProviderId = "aliyun" | "volcano" | "tencent";

export type PresetId =
  | "white-main"
  | "scene"
  | "selling-points"
  | "detail"
  | "size-params"
  | "function-analysis"
  | "multi-angle"
  | "person-usage"
  | "comparison"
  | "promotion-poster"
  | "detail-page-long"
  | "custom";

export type FidelityMode = "strict" | "balanced" | "creative";
export type ImageQuality = "standard" | "high" | "ultra";
export type ExportFormat = "png" | "jpg" | "webp";
export type AspectRatio = string;
export type VideoResolution = "720p" | "1080p";
export type JobStatus = "queued" | "running" | "completed" | "partial" | "failed" | "canceled";
export type PresetStatus = "queued" | "running" | "completed" | "failed" | "canceled";
export type MediaType = "image" | "video";

export interface ProductShotRequest {
  sourceImagePath: string;
  providerId: ProviderId;
  modelId: string;
  presetIds: PresetId[];
  fidelity: FidelityMode;
  quality?: ImageQuality;
  productBrief?: string;
  styleGuide?: string;
  posterCopy?: string;
  outputCount: number;
  aspectRatio: AspectRatio;
  exportFormat: ExportFormat;
}

export interface ProductShotResult {
  presetId: PresetId;
  providerId: ProviderId;
  modelId: string;
  imagePath: string;
  promptUsed: string;
  dimensions: {
    width: number;
    height: number;
  };
  warnings: string[];
  createdAt: string;
}

export interface PersonalGalleryItem {
  id: string;
  userId: string;
  imagePath: string;
  mediaType: MediaType;
  title: string;
  providerId?: ProviderId;
  modelId?: string;
  jobId?: string;
  presetId?: PresetId;
  sortOrder: number;
  createdAt: string;
}

export interface AddPersonalGalleryItemRequest {
  imagePath: string;
  mediaType?: MediaType;
  title: string;
  providerId?: ProviderId;
  modelId?: string;
  jobId?: string;
  presetId?: PresetId;
}

export type CanvasNodeType = "image" | "text" | "shape" | "draw" | "note" | "connector" | "freehand" | "aiTask" | "aiResult";
export type CanvasShapeType = "rect" | "circle" | "line" | "arrow";
export type CanvasAiTaskStatus = "draft" | "ready" | "running" | "done" | "failed";

export interface CanvasViewport {
  zoom: number;
  panX: number;
  panY: number;
}

export interface CanvasNodeBase {
  id: string;
  type: CanvasNodeType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  locked: boolean;
  visible: boolean;
  groupId?: string;
}

export interface CanvasImageNode extends CanvasNodeBase {
  type: "image";
  sourcePath: string;
  naturalWidth: number;
  naturalHeight: number;
}

export interface CanvasTextNode extends CanvasNodeBase {
  type: "text";
  text: string;
  fontFamily: string;
  fontSize: number;
  fontStyle: "normal" | "bold";
  align: "left" | "center" | "right";
  fill: string;
  stroke: string;
  strokeWidth: number;
  shadowColor: string;
  shadowBlur: number;
}

export interface CanvasShapeNode extends CanvasNodeBase {
  type: "shape";
  shapeType: CanvasShapeType;
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
}

export interface CanvasDrawNode extends CanvasNodeBase {
  type: "draw";
  points: number[];
  stroke: string;
  strokeWidth: number;
  compositeOperation: "source-over" | "destination-out";
}

export interface CanvasFreehandNode extends CanvasNodeBase {
  type: "freehand";
  points: number[];
  stroke: string;
  strokeWidth: number;
  compositeOperation: "source-over" | "destination-out";
}

export interface CanvasNoteNode extends CanvasNodeBase {
  type: "note";
  text: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  fontSize: number;
  fontFamily: string;
}

export interface CanvasConnectorNode extends CanvasNodeBase {
  type: "connector";
  stroke: string;
  strokeWidth: number;
  dash?: number[];
  label?: string;
}

export interface CanvasAiTaskNode extends CanvasNodeBase {
  type: "aiTask";
  prompt: string;
  negativePrompt?: string;
  status: CanvasAiTaskStatus;
  sourceNodeIds?: string[];
  resultNodeIds?: string[];
}

export interface CanvasAiResultNode extends CanvasNodeBase {
  type: "aiResult";
  sourcePath: string;
  prompt?: string;
  naturalWidth: number;
  naturalHeight: number;
}

export type CanvasNode =
  | CanvasImageNode
  | CanvasTextNode
  | CanvasShapeNode
  | CanvasDrawNode
  | CanvasFreehandNode
  | CanvasNoteNode
  | CanvasConnectorNode
  | CanvasAiTaskNode
  | CanvasAiResultNode;

export interface CanvasProject {
  id: string;
  userId: string;
  title: string;
  width: number;
  height: number;
  background: string;
  nodes: CanvasNode[];
  viewport?: CanvasViewport;
  gridEnabled?: boolean;
  snapEnabled?: boolean;
  selectedNodeIds?: string[];
  thumbnailPath?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CanvasProjectSummary {
  id: string;
  userId: string;
  title: string;
  width: number;
  height: number;
  thumbnailPath?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CanvasSaveRequest {
  id?: string;
  title: string;
  width: number;
  height: number;
  background: string;
  nodes: CanvasNode[];
  viewport?: CanvasViewport;
  gridEnabled?: boolean;
  snapEnabled?: boolean;
  selectedNodeIds?: string[];
  thumbnailDataUrl?: string;
}

export interface CanvasExportRequest {
  dataUrl: string;
  title: string;
  format: ExportFormat;
  targetDir?: string;
}

export interface CanvasExportResponse {
  imagePath: string;
}

export interface CanvasAddRenderToGalleryRequest {
  dataUrl: string;
  title: string;
  format: ExportFormat;
}

export interface DeleteHistoryResultRequest {
  jobId: string;
  mediaType: MediaType;
  resultPath: string;
}

export interface DeleteHistoryResultResponse {
  removed: boolean;
  movedToTrash: boolean;
  job?: StudioJob;
}

export interface ProductShotJob {
  id: string;
  userId?: string;
  mediaType?: "image";
  request: ProductShotRequest;
  sourceImagePath: string;
  sourcePreviewUrl?: string;
  status: JobStatus;
  results: ProductShotResult[];
  errors: ProviderError[];
  createdAt: string;
  updatedAt: string;
}

export interface ProviderError {
  providerId: ProviderId;
  presetId?: PresetId;
  code: string;
  message: string;
  retryable: boolean;
}

export interface ProviderCapabilities {
  providerId: ProviderId;
  displayName: string;
  models: string[];
  aspectRatios: AspectRatio[];
  outputFormats: ExportFormat[];
  videoModels?: string[];
  videoModelDetails?: VideoModelMetadata[];
  videoAspectRatios?: AspectRatio[];
  videoDurations?: number[];
  videoResolutions?: VideoResolution[];
  supportsImageEdit: boolean;
  supportsVideoGeneration?: boolean;
  supportsCancel: boolean;
}

export interface ProviderAdapter {
  id: ProviderId;
  validateKey(apiKey: string): Promise<boolean>;
  getCapabilities(): ProviderCapabilities;
  generateProductShot(
    request: ProductShotRequest,
    context: ProviderGenerateContext
  ): Promise<ProductShotResult[]>;
  generateProductVideo?(
    request: VideoGenerationRequest,
    context: ProviderVideoGenerateContext
  ): Promise<VideoGenerationResult>;
  cancelJob(jobId: string): Promise<void>;
}

export interface VideoModelMetadata {
  providerId: ProviderId;
  modelId: string;
  displayName: string;
  aspectRatios: AspectRatio[];
  durations: number[];
  resolutions: VideoResolution[];
  supportsImageToVideo: boolean;
  supportsAudio?: boolean;
  sourceUrl: string;
  tencentVod?: {
    modelName: string;
    modelVersion: string;
    fileUsage?: "FirstFrame" | "Reference";
  };
}

export interface ProviderGenerateContext {
  jobId: string;
  apiKey: string;
  presetId: PresetId;
  prompt: string;
  outputDir: string;
  sourceMimeType: string;
}

export interface ProviderVideoGenerateContext {
  jobId: string;
  apiKey: string;
  prompt: string;
  outputDir: string;
  sourceMimeType: string;
}

export interface ProviderConfig {
  id: ProviderId;
  displayName: string;
  defaultModel: string;
  models: string[];
  apiKeyUrl: string;
  termsUrl: string;
}

export interface AuthSession {
  userId: string;
  accountId: string;
  username: string;
  createdAt: string;
}

export interface LocalAccountSummary {
  userId: string;
  accountId: string;
  username: string;
  createdAt: string;
  remembered: boolean;
}

export interface AuthCredentials {
  username: string;
  password: string;
}

export interface AuthSavedCredentials {
  username: string;
  password?: string;
  rememberPassword: boolean;
}

export interface AuthSavedCredentialsInput {
  username: string;
  password?: string;
  rememberPassword: boolean;
}

export interface WalletSummary {
  userId: string;
  balanceCents: number;
  reservedCents?: number;
  usedCents: number;
  totalRechargedCents: number;
  currency: "CNY";
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  type: "recharge" | "usage" | "adjustment";
  amountCents: number;
  balanceAfterCents?: number;
  providerId?: ProviderId;
  modelId?: string;
  jobId?: string;
  note: string;
  createdAt: string;
}

export interface VideoGenerationRequest {
  sourceImagePath: string;
  providerId: ProviderId;
  modelId: string;
  tencentVodSubAppId?: string;
  prompt: string;
  aspectRatio: AspectRatio;
  durationSeconds: number;
  resolution: VideoResolution;
  watermark: boolean;
  enableAudio: boolean;
}

export interface VideoGenerationResult {
  providerId: ProviderId;
  modelId: string;
  videoPath: string;
  promptUsed: string;
  aspectRatio: AspectRatio;
  durationSeconds: number;
  resolution: VideoResolution;
  warnings: string[];
  createdAt: string;
}

export interface VideoGenerationJob {
  id: string;
  userId?: string;
  mediaType: "video";
  request: VideoGenerationRequest;
  sourceImagePath: string;
  status: JobStatus;
  results: VideoGenerationResult[];
  errors: ProviderError[];
  createdAt: string;
  updatedAt: string;
}

export type StudioJob = ProductShotJob | VideoGenerationJob;

export interface RechargeRequest {
  providerId: ProviderId;
  modelId: string;
  amountCents: number;
}

export interface RechargeReceipt {
  transaction: WalletTransaction;
  wallet: WalletSummary;
}

export interface SecretStatus {
  providerId: ProviderId;
  configured: boolean;
}

export interface ImportedImage {
  sourceImagePath: string;
  originalPath: string;
  previewDataUrl: string;
  mimeType: string;
  sizeBytes: number;
  dimensions: {
    width: number;
    height: number;
  };
}

export interface GenerateProgress {
  jobId: string;
  presetId: PresetId;
  status: PresetStatus;
  message: string;
}

export interface VideoProgress {
  jobId: string;
  status: PresetStatus;
  message: string;
}

export interface ExportRequest {
  imagePaths: string[];
  format: ExportFormat;
  targetDir?: string;
}

export interface ExportVideosRequest {
  videoPaths: string[];
  targetDir?: string;
}

export interface ExportResponse {
  exportedPaths: string[];
  warnings: string[];
}

export interface SaveEditedImageRequest {
  dataUrl: string;
  targetDir?: string;
  fileName?: string;
}

export interface SaveEditedImageResponse {
  imagePath: string;
}
