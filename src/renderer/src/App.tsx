import { useEffect, useMemo, useState } from "react";
import {
  Children,
  useRef,
  type CSSProperties,
  type DragEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type WheelEvent
} from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Box,
  Brush,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Clock3,
  Copy,
  CreditCard,
  Download,
  Edit3,
  Eraser,
  Eye,
  EyeOff,
  FolderOpen,
  FolderPlus,
  GripVertical,
  HelpCircle,
  History,
  ImagePlus,
  ImageOff,
  Images,
  Info,
  KeyRound,
  Layers,
  LayoutGrid,
  Loader2,
  LogOut,
  MapPin,
  Megaphone,
  MousePointer2,
  Move,
  Palette,
  PenLine,
  Play,
  Plus,
  QrCode,
  RectangleHorizontal,
  RectangleVertical,
  Redo2,
  RotateCcw,
  Rows2,
  Save,
  Settings,
  Sparkles,
  Square,
  Trash2,
  Upload,
  User,
  Video,
  Wallet,
  X,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import Konva from "konva";
import {
  Arrow as KonvaArrow,
  Circle as KonvaCircle,
  Group,
  Image as KonvaImage,
  Layer,
  Line,
  Rect,
  Stage,
  Text as KonvaText,
  Transformer
} from "react-konva";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { createPortal } from "react-dom";
import { productShotPresets } from "@shared/presets";
import { providerConfigs, providerOrder } from "@shared/providers";
import {
  getAllowedVideoAspectRatio,
  getAllowedVideoDuration,
  getDefaultVideoModelId,
  getVideoModelMeta,
  getVideoModelsForProvider
} from "@shared/videoModels";
import { updateAnnouncements } from "@shared/updateAnnouncements";
import tutorialCurrentHistoryUrl from "../assets/tutorial-current-history.png";
import tutorialCurrentModelConfigUrl from "../assets/tutorial-current-model-config.png";
import tutorialCurrentPreviewUrl from "../assets/tutorial-current-preview.png";
import tutorialCurrentUpdatesUrl from "../assets/tutorial-current-updates.png";
import tutorialCurrentWorkspaceUrl from "../assets/tutorial-current-workspace.png";
import authRobotMascotUrl from "../assets/auth-robot-mascot.png";
import authStudioBackgroundUrl from "../assets/auth-studio-background-clean.png";
import workflowStudioIllustrationUrl from "../assets/workflow-studio-illustration.png";
import {
  estimateRequestCostCents,
  estimateVideoRequestCostCents,
  formatUsdCents,
  getUnitPriceCents,
  imageQualities,
  modelPrices,
  rechargeAmounts
} from "@shared/billing";
import type {
  AuthSession,
  AspectRatio,
  CanvasNode,
  CanvasConnectorNode,
  CanvasFreehandNode,
  CanvasNoteNode,
  CanvasProject,
  CanvasProjectSummary,
  CanvasShapeNode,
  CanvasTextNode,
  ExportFormat,
  GenerateProgress,
  ImageQuality,
  ImportedImage,
  MediaType,
  PersonalGalleryItem,
  PresetId,
  ProductShotJob,
  ProductShotResult,
  ProviderId,
  SecretStatus,
  StudioJob,
  VideoGenerationJob,
  VideoGenerationResult,
  VideoModelMetadata,
  VideoProgress,
  VideoResolution,
  WalletSummary,
  WalletTransaction
} from "@shared/types";

const aspectRatios: AspectRatio[] = ["1:1", "4:5", "16:9", "3:2"];
const exportFormats: ExportFormat[] = ["png", "jpg", "webp"];
const canvasExportFormats: ExportFormat[] = ["png", "jpg", "webp"];
const defaultCanvasSize = { width: 1080, height: 1350 };
const defaultCanvasBackground = "#fffaf3";
type AppPage = "image" | "video" | "gallery" | "personal" | "updates" | "settings";
type PersonalCenterTab = "overview" | "history" | "recharge" | "transactions" | "trash";
type StatusTone = "normal" | "success" | "warn" | "error";
type ExportFeedback = "idle" | "running" | "done";
type ExportNotice = {
  tone: "success" | "error";
  title: string;
  message: string;
  detail?: string;
};
type GenerateMode = "single" | "batch";
type PreviewCompareLayout = "grid-2x2" | "grid-3x3" | "grid-4x4" | "custom" | "adaptive";
type ImageConfigPanel = "model" | "ratio" | "count";
type VideoConfigPanel = "model" | "ratio" | "duration";
type PreviewImage = {
  src: string;
  filePath?: string;
  title: string;
  subtitle?: string;
  fileName?: string;
};
type PreviewVideo = {
  src: string;
  filePath: string;
  title: string;
  subtitle?: string;
  fileName?: string;
};
type GalleryViewMode = "works" | "canvas";
type CanvasTool = "select" | "pan" | "text" | "note" | "rect" | "circle" | "line" | "arrow" | "connector" | "brush" | "eraser" | "aiTask";
type CanvasSnapshot = Pick<CanvasProject, "background" | "nodes" | "width" | "height">;
type CanvasDraftProject = CanvasProject & {
  draft?: boolean;
};
type CanvasNodeChange = Partial<CanvasNode> & { id: string };
type CanvasSelectionBox = { x: number; y: number; width: number; height: number };
type CanvasContextMenuState = { x: number; y: number; canvasX: number; canvasY: number } | null;
type ResultDeleteTarget = {
  mediaType: MediaType;
  resultPath: string;
  jobId?: string;
  title: string;
  detail: string;
};
type ResultDeleteScope = "current" | "history";
type WorkflowStepState = {
  label: string;
  description: string;
  done: boolean;
  active: boolean;
};
type ComparisonLibrarySource = "current" | "history" | "gallery";
type ComparisonLibraryImage = PreviewImage & {
  libraryId: string;
  source: ComparisonLibrarySource;
  createdAt: string;
};
type PreviewCompareItem = PreviewImage & {
  id: string;
};
type PreviewViewState = {
  zoom: number;
  pan: { x: number; y: number };
};
type ProviderBrandMeta = {
  mark: string;
  shortName: string;
  label: string;
};
type ImageModelOption = {
  providerId: ProviderId;
  modelId: string;
  displayName: string;
};
type WorkspaceLayoutSize = {
  splitPercent: number;
  resultHeight: number;
};
type WorkspaceLayoutKind = "image" | "video";

gsap.registerPlugin(useGSAP);

const providerBrandMeta: Record<ProviderId, ProviderBrandMeta> = {
  aliyun: { mark: "百", shortName: "Ali", label: "阿里百炼" },
  volcano: { mark: "火", shortName: "Ark", label: "火山方舟" },
  tencent: { mark: "混", shortName: "Hun", label: "腾讯混元" }
};

const defaultPreviewViewState: PreviewViewState = {
  zoom: 1,
  pan: { x: 0, y: 0 }
};

const uiText = {
  tagline: "AI \u5546\u62cd\u56fe\u5de5\u4f5c\u53f0",
  imagePage: "\u56fe\u7247\u751f\u6210",
  videoPage: "\u89c6\u9891\u751f\u6210",
  galleryPage: "个人图库",
  historyPage: "\u5386\u53f2\u4f5c\u54c1",
  billingPage: "\u5145\u503c\u79ef\u5206",
  updatesPage: "\u66f4\u65b0\u516c\u544a",
  updatesSubtitle: "\u67e5\u770b\u6bcf\u6b21\u53d1\u5e03\u7684\u4e2d\u6587\u66f4\u65b0\u5185\u5bb9\u548c\u5177\u4f53\u65f6\u95f4\u3002",
  latestUpdate: "\u6700\u65b0\u66f4\u65b0",
  updateTime: "\u66f4\u65b0\u65f6\u95f4",
  updateVersion: "\u7248\u672c",
  updateDetails: "\u66f4\u65b0\u8be6\u60c5",
  settingsPage: "\u8bbe\u7f6e",
  model: "\u6a21\u578b",
  apiKeys: "API \u5bc6\u94a5",
  getApiKey: "\u83b7\u53d6 API \u5bc6\u94a5",
  openKeyPage: "\u6253\u5f00\u83b7\u53d6\u5bc6\u94a5\u9875\u9762",
  providerTerms: "\u670d\u52a1\u6761\u6b3e",
  output: "\u8f93\u51fa",
  outputCount: "\u5f20\u6570",
  customAspectRatio: "\u6bd4\u4f8b",
  outputFormat: "\u56fe\u7247\u683c\u5f0f",
  videoModel: "\u89c6\u9891\u6a21\u578b",
  videoPrompt: "输入提示词",
  videoPromptPlaceholder: "\u4f8b\u5982\uff1a\u4ea7\u54c1\u6162\u901f\u65cb\u8f6c\uff0c\u67d4\u548c\u5f71\u68da\u5149\uff0c\u5e72\u51c0\u9ad8\u7ea7\u80cc\u666f",
  videoDuration: "\u89c6\u9891\u65f6\u957f\uff08\u79d2\uff09",
  generateVideo: "\u751f\u6210\u89c6\u9891",
  generatingVideo: "\u6b63\u5728\u751f\u6210\u4ea7\u54c1\u89c6\u9891",
  videoComplete: "\u89c6\u9891\u751f\u6210\u5b8c\u6210",
  videoFailed: "\u89c6\u9891\u751f\u6210\u5931\u8d25",
  videoUnsupported: "\u5f53\u524d\u5e73\u53f0\u6682\u672a\u542f\u7528\u89c6\u9891\u751f\u6210\uff1b\u817e\u8baf\u89c6\u9891\u9996\u7248\u9700\u8981\u53ef\u516c\u7f51\u8bbf\u95ee\u7684\u9996\u5e27 URL/COS \u914d\u7f6e\u3002",
  videoWaiting: "\u7b49\u5f85\u89c6\u9891\u7ed3\u679c",
  exportVideo: "\u5bfc\u51fa\u89c6\u9891",
  quality: "\u56fe\u7247\u8d28\u91cf",
  estimatedCost: "\u9884\u4f30\u6210\u672c",
  unitPrice: "\u5355\u5f20",
  history: "\u5386\u53f2",
  allHistory: "\u5168\u90e8\u5386\u53f2",
  records: "\u6761\u8bb0\u5f55",
  viewAllHistory: "\u67e5\u770b\u5168\u90e8",
  historyResults: "\u5f20\u7ed3\u679c",
  defaultExportFolder: "\u9ed8\u8ba4\u5bfc\u51fa\u6587\u4ef6\u5939",
  changeExportFolder: "\u66f4\u6539",
  chooseFolder: "\u9009\u62e9\u6587\u4ef6\u5939",
  refresh: "\u5237\u65b0",
  refreshed: "\u5df2\u5237\u65b0",
  refreshing: "\u6b63\u5728\u5237\u65b0",
  noJobs: "\u6682\u65e0\u4efb\u52a1",
  packageTitle: "\u4e00\u952e\u5546\u62cd\u5957\u88c5",
  productBrief: "\u4ea7\u54c1\u4fe1\u606f",
  productBriefPlaceholder: "\u54c1\u7c7b\u3001\u6750\u8d28\u3001\u5356\u70b9\u3001\u4eba\u7fa4\uff0c\u4f8b\u5982\uff1a\u971c\u611f\u9ed1\u8272\u5496\u5561\u676f\uff0c\u9002\u5408\u901a\u52e4\u529e\u516c",
  styleGuide: "\u98ce\u683c\u8981\u6c42",
  styleGuidePlaceholder: "\u573a\u666f\u3001\u5149\u7ebf\u3001\u54c1\u724c\u8c03\u6027\uff0c\u4f8b\u5982\uff1a\u9ad8\u7aef\u7b80\u7ea6\u3001\u6696\u8272\u53a8\u623f\u3001\u7559\u767d\u53ef\u653e\u6587\u6848",
  posterCopy: "\u6d77\u62a5\u4fe1\u606f",
  posterCopyPlaceholder: "\u529f\u80fd\u3001\u6210\u5206/\u6750\u8d28\u3001\u6548\u679c\u3001\u5356\u70b9\u3001\u4f7f\u7528\u573a\u666f\uff0c\u4f8b\u5982\uff1a\u4eb2\u80a4\u67d4\u8f6f\uff0c\u53ef\u62c6\u6d17\uff0c\u9002\u54083\u5c81\u4ee5\u4e0a",
  configureKeyFirst: "\u8bf7\u5148\u914d\u7f6e\u5f53\u524d\u6a21\u578b\u5bc6\u94a5",
  configured: "\u5df2\u914d\u7f6e",
  export: "\u5bfc\u51fa",
  generate: "\u751f\u6210",
  cannotReadPath: "\u65e0\u6cd5\u8bfb\u53d6\u672c\u5730\u6587\u4ef6\u8def\u5f84\uff0c\u8bf7\u4f7f\u7528\u684c\u9762\u7aef\u6587\u4ef6\u9009\u62e9\u5668\u3002",
  importing: "\u6b63\u5728\u5bfc\u5165\u56fe\u7247",
  imageReady: "\u56fe\u7247\u5df2\u5c31\u7eea",
  imageCanceled: "\u56fe\u7247\u9009\u62e9\u5df2\u53d6\u6d88",
  importFailed: "\u5bfc\u5165\u5931\u8d25",
  generating: "\u6b63\u5728\u751f\u6210\u5546\u62cd\u5957\u88c5",
  generationComplete: "\u751f\u6210\u5b8c\u6210",
  generationPartial: "\u90e8\u5206\u751f\u6210\u5b8c\u6210",
  generationFailed: "\u751f\u6210\u5931\u8d25",
  failureReasons: "\u5931\u8d25\u539f\u56e0",
  retryable: "\u53ef\u91cd\u8bd5",
  notRetryable: "\u9700\u5904\u7406",
  retryFailed: "\u91cd\u8bd5\u5931\u8d25\u9879",
  retryingFailed: "\u6b63\u5728\u91cd\u8bd5\u5931\u8d25\u7684\u56fe\u7247",
  noFailedPresets: "\u6ca1\u6709\u53ef\u91cd\u8bd5\u7684\u5931\u8d25\u9879",
  cancel: "\u53d6\u6d88",
  canceling: "\u6b63\u5728\u53d6\u6d88\u751f\u6210",
  canceled: "\u751f\u6210\u5df2\u53d6\u6d88",
  clearImages: "\u6e05\u7a7a\u56fe\u7247",
  imagesCleared: "\u5df2\u6e05\u7a7a\u4e0a\u4f20\u56fe\u7247",
  exported: "\u5df2\u5bfc\u51fa",
  exporting: "\u6b63\u5728\u5bfc\u51fa\u56fe\u7247",
  exportComplete: "\u5bfc\u51fa\u5b8c\u6210",
  noExportImages: "\u6ca1\u6709\u53ef\u5bfc\u51fa\u7684\u56fe\u7247",
  exportCurrent: "\u5bfc\u51fa\u5f53\u524d\u7ed3\u679c",
  imageCountSuffix: "\u5f20\u56fe\u7247",
  exportCanceled: "\u5bfc\u51fa\u5df2\u53d6\u6d88",
  selectImage: "\u9009\u62e9\u56fe\u7247",
  addImages: "\u6dfb\u52a0\u56fe\u7247",
  deleteImage: "\u5220\u9664\u56fe\u7247",
  batchGenerate: "\u6279\u91cf\u751f\u6210",
  batchGenerating: "\u6b63\u5728\u6279\u91cf\u751f\u6210",
  imageQueue: "\u4ea7\u54c1\u56fe\u7247",
  imagesCount: "\u5f20\u539f\u56fe",
  presets: "\u8f93\u51fa\u5957\u88c5",
  ready: "\u5c31\u7eea",
  results: "\u7ed3\u679c",
  errors: "\u4e2a\u9519\u8bef",
  waitingResults: "\u7b49\u5f85\u751f\u6210\u7ed3\u679c",
  close: "\u5173\u95ed",
  notConfigured: "\u672a\u914d\u7f6e",
  save: "\u4fdd\u5b58",
  validate: "\u9a8c\u8bc1",
  delete: "\u5220\u9664",
  saved: "\u5df2\u4fdd\u5b58",
  deleted: "\u5df2\u5220\u9664",
  works: "\u53ef\u7528",
  validationFailed: "\u9a8c\u8bc1\u5931\u8d25",
  localKeysOnly: "\u5bc6\u94a5\u4ec5\u4fdd\u5b58\u5728\u672c\u673a\u3002",
  accountLogin: "\u672c\u5730\u8d26\u53f7\u767b\u5f55",
  personalCenter: "\u4e2a\u4eba\u4e2d\u5fc3",
  previewImage: "\u56fe\u7247\u9884\u89c8",
  zoomIn: "\u653e\u5927",
  zoomOut: "\u7f29\u5c0f",
  editImage: "\u7f16\u8f91",
  resetEdit: "\u91cd\u7f6e\u7f16\u8f91",
  saveImage: "\u4fdd\u5b58\u56fe\u7247",
  saveEdited: "\u4fdd\u5b58\u7f16\u8f91\u540e\u56fe\u7247",
  resetView: "\u9002\u5e94\u7a97\u53e3",
  previewInteractionHint: "\u6eda\u8f6e\u7f29\u653e\uff0c\u6309\u4f4f\u56fe\u7247\u62d6\u52a8\uff0c\u53cc\u51fb\u6062\u590d\u5b8c\u6574\u89c6\u56fe",
  brightness: "\u4eae\u5ea6",
  contrast: "\u5bf9\u6bd4\u5ea6",
  saturation: "\u9971\u548c\u5ea6",
  recycleBin: "\u56de\u6536\u7ad9",
  restore: "\u6062\u590d",
  deleteForever: "\u5f7b\u5e95\u5220\u9664",
  moveToTrash: "\u5220\u9664\u8bb0\u5f55",
  movedToTrash: "\u8bb0\u5f55\u5df2\u79fb\u5165\u56de\u6536\u7ad9",
  restored: "\u5df2\u6062\u590d",
  deletedForever: "\u5df2\u5f7b\u5e95\u5220\u9664",
  continueLogin: "\u76f4\u63a5\u8fdb\u5165\u4e3b\u754c\u9762",
  rememberedAccount: "\u5df2\u767b\u5f55\u8d26\u53f7",
  useExistingAccount: "\u4f7f\u7528\u5df2\u6709\u8d26\u53f7",
  localAccounts: "\u672c\u5730\u8d26\u53f7",
  addAccount: "\u6dfb\u52a0\u8d26\u53f7",
  selectAccount: "\u9009\u62e9\u8d26\u53f7",
  deleteAccount: "\u5220\u9664\u8d26\u53f7",
  accountDeleted: "\u8d26\u53f7\u5df2\u5220\u9664",
  accountCreatedAt: "\u521b\u5efa\u4e8e",
  accountId: "账号 ID",
  loginAccount: "账号 ID / 账号名",
  displayName: "账号名",
  duplicateNameHint: "账号名可以重复；创建后请记住系统分配的唯一账号 ID。",
  emptyAccounts: "\u8fd8\u6ca1\u6709\u672c\u5730\u8d26\u53f7",
  loginHeroTitle: "\u628a\u666e\u901a\u4ea7\u54c1\u7167\u53d8\u6210\u5546\u7528\u5927\u7247",
  loginHeroSubtitle: "\u672c\u5730\u8d26\u53f7\u3001\u56fd\u5185\u5927\u6a21\u578b\u3001\u6279\u91cf\u5546\u62cd\u56fe\u751f\u6210\uff0c\u5bc6\u94a5\u53ea\u7559\u5728\u4f60\u7684\u7535\u8111\u4e0a\u3002",
  workflowImport: "\u5bfc\u5165",
  workflowConfigure: "\u914d\u7f6e",
  workflowGenerate: "\u751f\u6210",
  workflowExport: "\u5bfc\u51fa",
  historyListMode: "\u6761\u5f62\u8bb0\u5f55",
  historyImageMode: "\u56fe\u7247\u8bb0\u5f55",
  generatedImages: "\u5df2\u751f\u6210\u56fe\u7247",
  accountOverview: "\u8d26\u6237\u6982\u89c8",
  rechargeDetails: "\u5145\u503c\u660e\u7ec6",
  transactionTime: "\u65f6\u95f4",
  transactionType: "\u7c7b\u578b",
  transactionAmount: "\u79ef\u5206\u53d8\u52a8",
  transactionProvider: "\u4f9b\u5e94\u5546",
  transactionTask: "\u5173\u8054\u4efb\u52a1",
  transactionNote: "\u5907\u6ce8",
  noTransactions: "\u6682\u65e0\u5145\u503c\u660e\u7ec6",
  rechargeIncome: "\u5145\u503c",
  usageExpense: "\u751f\u6210\u6d88\u8017",
  adjustmentTransaction: "\u79ef\u5206\u8c03\u6574",
  openTutorial: "\u6253\u5f00\u6559\u7a0b",
  tutorialSettingsHint: "\u67e5\u770b\u5bfc\u5165\u3001\u5bc6\u94a5\u914d\u7f6e\u3001\u751f\u6210\u3001\u5bfc\u51fa\u548c\u5e38\u89c1\u95ee\u9898\u3002",
  usedModel: "\u4f7f\u7528\u6a21\u578b",
  unknownProvider: "\u65e7\u7248\u6a21\u578b",
  unknownPreset: "\u751f\u6210\u56fe\u7247",
  signUp: "\u521b\u5efa\u8d26\u53f7",
  login: "\u767b\u5f55",
  logout: "\u9000\u51fa",
  username: "\u8d26\u53f7",
  password: "\u5bc6\u7801",
  localAccountOnly: "\u8d26\u53f7\u548c\u5bc6\u7801\u4fdd\u5b58\u5728\u672c\u5730\u8d26\u672c\u670d\u52a1\uff0c\u5bc6\u7801\u53ea\u4fdd\u5b58\u52a0\u76d0\u54c8\u5e0c\u3002",
  walletBalance: "\u5269\u4f59\u79ef\u5206",
  walletUsed: "\u5df2\u7528",
  insufficientBalance: "\u4f59\u989d\u4e0d\u8db3\uff0c\u8bf7\u5148\u5145\u503c",
  recharge: "\u5145\u503c",
  rechargeTitle: "\u5fae\u4fe1\u626b\u7801\u5145\u503c",
  rechargeModel: "\u5145\u503c\u6a21\u578b",
  rechargeAmount: "\u5145\u503c\u91d1\u989d",
  confirmRecharge: "\u6211\u5df2\u5b8c\u6210\u626b\u7801\uff0c\u8bb0\u5f55\u5230\u8d26",
  rechargeLocalNote: "\u5f53\u524d\u4e3a\u672c\u5730\u8bb0\u8d26\u7248\u672c\uff1b\u771f\u5b9e\u5fae\u4fe1\u652f\u4ed8\u9700\u8981\u5546\u6237\u53f7\u3001\u670d\u52a1\u7aef\u4e0b\u5355\u548c\u56de\u8c03\u786e\u8ba4\u3002",
  pricing: "\u6a21\u578b\u4ef7\u683c",
  priceNote: "\u4ef7\u683c\u4e3a\u516c\u5f00\u4ef7\u683c\u4f30\u7b97\uff0c\u5b9e\u9645\u8d26\u5355\u4ee5\u5404\u6a21\u578b\u5e73\u53f0\u4e3a\u51c6\u3002",
  tutorial: "\u6559\u7a0b",
  tutorialTitle: "\u4f7f\u7528\u6559\u7a0b\u4e0e\u5e38\u89c1\u95ee\u9898",
  tutorialIntroTitle: "\u8f6f\u4ef6\u4ecb\u7ecd",
  tutorialIntro: "Product Shot Studio 是 Windows AI 商拍工作台，可从普通产品照生成白底图、场景图、特写图、营销图和商品海报，并通过个人图库完成筛选、排序与对比。下面的界面截图来自当前版本，点击图片可以放大查看操作位置。",
  tutorialFlow: "\u57fa\u672c\u6d41\u7a0b",
  tutorialFaq: "\u5e38\u89c1\u95ee\u9898",
  tutorialTip: "\u5c0f\u63d0\u793a",
  collapseModel: "\u6536\u8d77\u6a21\u578b",
  expandModel: "\u5c55\u5f00\u6a21\u578b",
  clickOrDragUpload: "\u70b9\u51fb\u6dfb\u52a0\u56fe\u7247\uff0c\u6216\u628a\u4ea7\u54c1\u56fe\u62d6\u5230\u8fd9\u91cc",
  clickImageToAdd: "\u70b9\u51fb\u5927\u56fe\u53ef\u7ee7\u7eed\u6dfb\u52a0\u4ea7\u54c1\u56fe",
  previewCurrentImage: "\u9884\u89c8\u539f\u56fe"
};

const apiKeyGuides: Record<ProviderId, string[]> = {
  aliyun: [
    "\u767b\u5f55\u963f\u91cc\u4e91\u767e\u70bc\u63a7\u5236\u53f0\u3002",
    "\u8fdb\u5165 API Key \u9875\u9762\uff0c\u521b\u5efa\u6216\u590d\u5236\u767e\u70bc API Key\u3002",
    "\u786e\u8ba4\u5df2\u5f00\u901a\u901a\u4e49\u4e07\u76f8 / Qwen-Image \u6a21\u578b\u6743\u9650\u3002"
  ],
  volcano: [
    "\u767b\u5f55\u706b\u5c71\u5f15\u64ce\u65b9\u821f\u63a7\u5236\u53f0\u3002",
    "\u5728 API Key \u9875\u9762\u521b\u5efa\u65b9\u821f API Key\u3002",
    "\u786e\u8ba4 Seedream \u56fe\u50cf\u6a21\u578b\u5df2\u5f00\u901a\u5e76\u6709\u8d26\u6237\u4f59\u989d\uff1b\u5982\u679c\u5f00\u901a\u7684 ID \u4e0d\u540c\uff0c\u53ef\u5728\u5de6\u4fa7\u624b\u52a8\u8f93\u5165\u3002"
  ],
  tencent: [
    "\u767b\u5f55\u817e\u8baf\u4e91\u63a7\u5236\u53f0\uff0c\u8fdb\u5165\u8bbf\u95ee\u5bc6\u94a5\u9875\u9762\u3002",
    "\u590d\u5236 SecretId \u548c SecretKey\u3002",
    "\u6309 SecretId:SecretKey \u683c\u5f0f\u7c98\u8d34\u4fdd\u5b58\uff0c\u5e76\u786e\u8ba4\u6df7\u5143\u751f\u56fe\u5df2\u5f00\u901a\u3002",
    "如需腾讯云点播 AIGC 生视频，请在设置页填写 VOD SubAppId。"
  ]
};

const jobStatusLabels: Record<ProductShotJob["status"], string> = {
  queued: "\u6392\u961f\u4e2d",
  running: "\u751f\u6210\u4e2d",
  completed: "\u5df2\u5b8c\u6210",
  partial: "\u90e8\u5206\u5b8c\u6210",
  failed: "\u5931\u8d25",
  canceled: "\u5df2\u53d6\u6d88"
};

const qualityLabels: Record<ImageQuality, string> = {
  standard: "\u6807\u51c6",
  high: "\u9ad8\u6e05",
  ultra: "\u8d85\u6e05"
};

const presetLabels = Object.fromEntries(
  productShotPresets.map((preset) => [
    preset.id,
    {
      name: preset.name,
      description: preset.description
    }
  ])
) as Record<PresetId, { name: string; description: string }>;

const modelSelectionStorageKeys = {
  providerId: "productStudio.providerId",
  modelId: (providerId: ProviderId) => `productStudio.modelId.${providerId}`
};
const exportFormatStorageKey = "productStudio.exportFormat";
const tencentVodSubAppIdStorageKey = "productStudio.tencentVodSubAppId";
const workspaceLayoutStorageKeys: Record<WorkspaceLayoutKind, string> = {
  image: "productStudio.layout.image",
  video: "productStudio.layout.video"
};
const defaultWorkspaceLayouts: Record<WorkspaceLayoutKind, WorkspaceLayoutSize> = {
  image: { splitPercent: 48, resultHeight: 230 },
  video: { splitPercent: 42, resultHeight: 240 }
};

function readInitialModelSelection(): { providerId: ProviderId; modelId: string } {
  const savedProvider = localStorage.getItem(modelSelectionStorageKeys.providerId);
  const providerId = isProviderId(savedProvider) ? savedProvider : "aliyun";
  return {
    providerId,
    modelId: readSavedModelId(providerId)
  };
}

function readSavedModelId(providerId: ProviderId): string {
  return localStorage.getItem(modelSelectionStorageKeys.modelId(providerId)) || providerConfigs[providerId].defaultModel;
}

function readSavedExportFormat(): ExportFormat {
  const savedFormat = localStorage.getItem(exportFormatStorageKey);
  return exportFormats.includes(savedFormat as ExportFormat) ? (savedFormat as ExportFormat) : "png";
}

function readSavedTencentVodSubAppId(): string {
  return localStorage.getItem(tencentVodSubAppIdStorageKey) ?? "";
}

function readWorkspaceLayout(kind: WorkspaceLayoutKind): WorkspaceLayoutSize {
  const fallback = defaultWorkspaceLayouts[kind];
  const raw = localStorage.getItem(workspaceLayoutStorageKeys[kind]);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as Partial<WorkspaceLayoutSize>;
    return clampWorkspaceLayout({
      splitPercent: Number(parsed.splitPercent) || fallback.splitPercent,
      resultHeight: Number(parsed.resultHeight) || fallback.resultHeight
    });
  } catch {
    return fallback;
  }
}

function persistModelSelection(providerId: ProviderId, modelId: string) {
  localStorage.setItem(modelSelectionStorageKeys.providerId, providerId);
  if (modelId) {
    localStorage.setItem(modelSelectionStorageKeys.modelId(providerId), modelId);
  }
}

function persistWorkspaceLayout(kind: WorkspaceLayoutKind, layout: WorkspaceLayoutSize) {
  localStorage.setItem(workspaceLayoutStorageKeys[kind], JSON.stringify(clampWorkspaceLayout(layout)));
}

export function App() {
  const [initialModelSelection] = useState(() => readInitialModelSelection());
  const [activePage, setActivePage] = useState<AppPage>("image");
  const [personalCenterTab, setPersonalCenterTab] = useState<PersonalCenterTab>("overview");
  const [session, setSession] = useState<AuthSession | null>(null);
  const [rememberedSession, setRememberedSession] = useState<AuthSession | null>(null);
  const [walletSummary, setWalletSummary] = useState<WalletSummary | null>(null);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [keyStatus, setKeyStatus] = useState<SecretStatus[]>([]);
  const [providerId, setProviderId] = useState<ProviderId>(initialModelSelection.providerId);
  const [modelId, setModelId] = useState(initialModelSelection.modelId);
  const [selectedPresets, setSelectedPresets] = useState<PresetId[]>(["white-main"]);
  const [productBrief, setProductBrief] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [exportFormat, setExportFormatState] = useState<ExportFormat>(() => readSavedExportFormat());
  const [quality, setQuality] = useState<ImageQuality>("standard");
  const [outputCount, setOutputCount] = useState(1);
  const [videoProviderId, setVideoProviderId] = useState<ProviderId>("aliyun");
  const [videoModelId, setVideoModelId] = useState("wanx2.1-i2v-turbo");
  const [videoPrompt, setVideoPrompt] = useState("");
  const [selectedVideoPresetId, setSelectedVideoPresetId] = useState<PresetId>("custom");
  const [videoAspectRatio, setVideoAspectRatio] = useState<AspectRatio>("16:9");
  const [videoDurationSeconds, setVideoDurationSeconds] = useState(5);
  const [tencentVodSubAppId, setTencentVodSubAppId] = useState(() => readSavedTencentVodSubAppId());
  const [imageWorkspaceLayout, setImageWorkspaceLayout] = useState(() => readWorkspaceLayout("image"));
  const [videoWorkspaceLayout, setVideoWorkspaceLayout] = useState(() => readWorkspaceLayout("video"));
  const [importedImages, setImportedImages] = useState<ImportedImage[]>([]);
  const [activeImagePath, setActiveImagePath] = useState<string | null>(null);
  const [videoImportedImages, setVideoImportedImages] = useState<ImportedImage[]>([]);
  const [activeVideoImagePath, setActiveVideoImagePath] = useState<string | null>(null);
  const [history, setHistory] = useState<StudioJob[]>([]);
  const [trashedHistory, setTrashedHistory] = useState<StudioJob[]>([]);
  const [galleryItems, setGalleryItems] = useState<PersonalGalleryItem[]>([]);
  const [selectedGalleryIds, setSelectedGalleryIds] = useState<string[]>([]);
  const [activeJob, setActiveJob] = useState<ProductShotJob | null>(null);
  const [sessionImageResults, setSessionImageResults] = useState<ProductShotResult[]>([]);
  const [activeVideoJob, setActiveVideoJob] = useState<VideoGenerationJob | null>(null);
  const [progress, setProgress] = useState<Partial<Record<PresetId, GenerateProgress>>>({});
  const [videoProgress, setVideoProgress] = useState<VideoProgress | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [currentVideoJobId, setCurrentVideoJobId] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("");
  const [statusTone, setStatusTone] = useState<StatusTone>("normal");
  const [statusSequence, setStatusSequence] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<ExportFeedback>("idle");
  const [exportNotice, setExportNotice] = useState<ExportNotice | null>(null);
  const [imageExportCompleted, setImageExportCompleted] = useState(false);
  const [videoExportCompleted, setVideoExportCompleted] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [videoDragActive, setVideoDragActive] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [pendingGenerateMode, setPendingGenerateMode] = useState<GenerateMode | null>(null);
  const [defaultExportDir, setDefaultExportDir] = useState("");
  const [previewImage, setPreviewImage] = useState<PreviewImage | null>(null);
  const [previewVideo, setPreviewVideo] = useState<PreviewVideo | null>(null);
  const [previewComparisonImages, setPreviewComparisonImages] = useState<PreviewImage[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<ResultDeleteTarget | null>(null);
  const [openImageConfigPanel, setOpenImageConfigPanel] = useState<ImageConfigPanel | null>(null);

  function updateExportFormat(format: ExportFormat) {
    setExportFormatState(format);
    localStorage.setItem(exportFormatStorageKey, format);
  }

  function updateTencentVodSubAppId(value: string) {
    setTencentVodSubAppId(value);
    localStorage.setItem(tencentVodSubAppIdStorageKey, value.trim());
  }

  function updateImageWorkspaceLayout(layout: WorkspaceLayoutSize) {
    const clamped = clampWorkspaceLayout(layout);
    setImageWorkspaceLayout(clamped);
    persistWorkspaceLayout("image", clamped);
  }

  function updateVideoWorkspaceLayout(layout: WorkspaceLayoutSize) {
    const clamped = clampWorkspaceLayout(layout);
    setVideoWorkspaceLayout(clamped);
    persistWorkspaceLayout("video", clamped);
  }

  const configuredProvider = keyStatus.find((item) => item.providerId === providerId)?.configured ?? false;
  const results = sessionImageResults;
  const comparisonLibraryImages = useMemo(
    () => buildComparisonLibraryImages(sessionImageResults, history, galleryItems),
    [sessionImageResults, history, galleryItems]
  );
  const failedPresetIds = useMemo(() => getFailedPresetIds(activeJob), [activeJob]);
  const canRetryFailed = Boolean(activeJob && failedPresetIds.length > 0 && !isGenerating);
  const activeImage = importedImages.find((image) => image.sourceImagePath === activeImagePath) ?? importedImages[0] ?? null;
  const activeVideoImage =
    videoImportedImages.find((image) => image.sourceImagePath === activeVideoImagePath) ?? videoImportedImages[0] ?? null;
  const estimateRequest = useMemo(
    () => ({
      sourceImagePath: activeImage?.sourceImagePath ?? "",
      providerId,
      modelId,
      presetIds: selectedPresets,
      fidelity: "strict" as const,
      quality,
      productBrief: productBrief.trim() || undefined,
      outputCount,
      aspectRatio,
      exportFormat
    }),
    [
      activeImage?.sourceImagePath,
      providerId,
      modelId,
      selectedPresets,
      quality,
      productBrief,
      outputCount,
      aspectRatio,
      exportFormat
    ]
  );
  const estimatedCostCents = estimateRequestCostCents(estimateRequest);
  const unitPriceCents = getUnitPriceCents({ providerId, modelId, quality });
  const hasEnoughBalance = (walletSummary?.balanceCents ?? 0) >= estimatedCostCents;
  const singleOutputTotal = selectedPresets.length * outputCount;
  const batchCostCents = estimatedCostCents * importedImages.length;
  const batchOutputTotal = importedImages.length * singleOutputTotal;
  const hasEnoughBatchBalance = (walletSummary?.balanceCents ?? 0) >= batchCostCents;
  const videoModelOptions = useMemo(() => getVideoModelOptions(videoProviderId, videoModelId), [videoProviderId, videoModelId]);
  const selectedVideoModel = useMemo(
    () => getVideoModelMeta(videoProviderId, videoModelId) ?? videoModelOptions[0] ?? null,
    [videoProviderId, videoModelId, videoModelOptions]
  );
  const videoAspectRatioOptions = selectedVideoModel?.aspectRatios ?? [];
  const videoDurationOptions = selectedVideoModel?.durations ?? [];
  const hiddenVideoResolution = getDefaultHiddenVideoResolution(selectedVideoModel);
  const videoEstimateRequest = useMemo(
    () => ({
      sourceImagePath: activeVideoImage?.sourceImagePath ?? "",
      providerId: videoProviderId,
      modelId: videoModelId,
      tencentVodSubAppId,
      prompt: videoPrompt,
      aspectRatio: videoAspectRatio,
      durationSeconds: clampVideoDuration(videoDurationSeconds),
      resolution: hiddenVideoResolution,
      watermark: false,
      enableAudio: false
    }),
    [
      activeVideoImage?.sourceImagePath,
      videoProviderId,
      videoModelId,
      tencentVodSubAppId,
      videoPrompt,
      videoAspectRatio,
      videoDurationSeconds,
      hiddenVideoResolution
    ]
  );
  const estimatedVideoCostCents = estimateVideoRequestCostCents(videoEstimateRequest);
  const videoProviderConfigured = keyStatus.find((item) => item.providerId === videoProviderId)?.configured ?? false;
  const videoSupported = Boolean(selectedVideoModel?.supportsImageToVideo);
  const videoSetupWarning = !videoSupported
    ? uiText.videoUnsupported
    : videoProviderId === "tencent" && !tencentVodSubAppId.trim()
      ? "腾讯云点播 AIGC 生视频需要先在设置中填写 SubAppId。"
      : "";
  const hasEnoughVideoBalance = (walletSummary?.balanceCents ?? 0) >= estimatedVideoCostCents;
  const videoResults = activeVideoJob?.results ?? [];
  const imageResultSignature = results.map((result) => result.imagePath).join("|");
  const videoResultSignature = videoResults.map((result) => result.videoPath).join("|");
  const modelOptions = useMemo(() => getImageModelOptions(providerId, modelId), [providerId, modelId]);
  const isExporting = exportFeedback === "running";
  const showActivityProgress = isRefreshing || exportFeedback !== "idle";
  const canGenerate = Boolean(
    activeImage && configuredProvider && selectedPresets.length > 0 && !isGenerating && hasEnoughBalance
  );
  const canBatchGenerate = Boolean(
    importedImages.length > 0 && configuredProvider && selectedPresets.length > 0 && !isGenerating && hasEnoughBatchBalance
  );
  const canGenerateVideo = Boolean(
    activeVideoImage &&
      videoProviderConfigured &&
      videoSupported &&
      !videoSetupWarning &&
      !isGeneratingVideo &&
      hasEnoughVideoBalance
  );
  const workflowResultCount = results.length;
  const hasImageWork = Boolean(activeImage);
  const hasVideoWork = Boolean(activeVideoImage);
  const workflowSteps = useMemo(
    () => gateWorkflowSteps([
      {
        label: uiText.workflowImport,
        description: "上传商品图，支持拖拽或批量导入",
        done: hasImageWork,
        active: !hasImageWork
      },
      {
        label: uiText.workflowConfigure,
        description: "选择模型与生成参数",
        done: hasImageWork && configuredProvider && selectedPresets.length > 0,
        active: hasImageWork && (!configuredProvider || selectedPresets.length === 0)
      },
      {
        label: uiText.workflowGenerate,
        description: "AI 生成优质商品图",
        done: hasImageWork && configuredProvider && selectedPresets.length > 0 && workflowResultCount > 0,
        active: hasImageWork && configuredProvider && selectedPresets.length > 0 && (isGenerating || workflowResultCount === 0)
      },
      {
        label: uiText.workflowExport,
        description: "下载图片或专业素材",
        done: hasImageWork && workflowResultCount > 0 && imageExportCompleted,
        active: hasImageWork && workflowResultCount > 0 && !imageExportCompleted
      }
    ]),
    [configuredProvider, hasImageWork, imageExportCompleted, isGenerating, selectedPresets.length, workflowResultCount]
  );
  const videoWorkflowSteps = useMemo(
    () => gateWorkflowSteps([
      {
        label: uiText.workflowImport,
        description: "上传商品图，作为图生视频首帧参考",
        done: hasVideoWork,
        active: !hasVideoWork
      },
      {
        label: uiText.workflowConfigure,
        description: "选择视频模型、比例和时长",
        done: hasVideoWork && videoProviderConfigured && videoSupported && !videoSetupWarning,
        active: hasVideoWork && (!videoProviderConfigured || !videoSupported || Boolean(videoSetupWarning))
      },
      {
        label: uiText.workflowGenerate,
        description: "AI 生成商品视频",
        done: hasVideoWork && videoProviderConfigured && videoSupported && !videoSetupWarning && videoResults.length > 0,
        active:
          hasVideoWork &&
          videoProviderConfigured &&
          videoSupported &&
          !videoSetupWarning &&
          (isGeneratingVideo || videoResults.length === 0)
      },
      {
        label: uiText.workflowExport,
        description: "导出视频素材",
        done: hasVideoWork && videoResults.length > 0 && videoExportCompleted,
        active: hasVideoWork && videoResults.length > 0 && !videoExportCompleted
      }
    ]),
    [
      hasVideoWork,
      isGeneratingVideo,
      videoExportCompleted,
      videoProviderConfigured,
      videoResults.length,
      videoSetupWarning,
      videoSupported
    ]
  );

  useEffect(() => {
    void loadExportDirectory();
    void bootstrapSession();
    const disposeProgress = window.productStudio.onGenerationProgress((item) => {
      setCurrentJobId(item.jobId);
      setProgress((current) => ({ ...current, [item.presetId]: item }));
      if (item.status === "canceled") {
        setIsGenerating(false);
        showStatus(uiText.canceled);
      }
    });
    const disposeVideoProgress = window.productStudio.onVideoProgress((item) => {
      setCurrentVideoJobId(item.jobId);
      setVideoProgress(item);
      if (item.status === "canceled") {
        setIsGeneratingVideo(false);
        showStatus(uiText.canceled);
      }
    });
    const disposeSettings = window.productStudio.onOpenSettings(() => {
      setActivePage("settings");
    });
    return () => {
      disposeProgress();
      disposeVideoProgress();
      disposeSettings();
    };
  }, []);

  useEffect(() => {
    setImageExportCompleted(false);
  }, [imageResultSignature]);

  useEffect(() => {
    setVideoExportCompleted(false);
  }, [videoResultSignature]);

  useEffect(() => {
    if (getVideoModelMeta(videoProviderId, videoModelId)) return;
    const nextModelId = getDefaultVideoModelId(videoProviderId);
    if (nextModelId && nextModelId !== videoModelId) {
      setVideoModelId(nextModelId);
    }
  }, [videoProviderId, videoModelId]);

  useEffect(() => {
    if (!selectedVideoModel) return;
    const nextAspectRatio = getAllowedVideoAspectRatio(videoProviderId, selectedVideoModel.modelId, videoAspectRatio);
    const nextDuration = getAllowedVideoDuration(videoProviderId, selectedVideoModel.modelId, videoDurationSeconds);
    if (nextAspectRatio !== videoAspectRatio) {
      setVideoAspectRatio(nextAspectRatio);
    }
    if (nextDuration !== videoDurationSeconds) {
      setVideoDurationSeconds(nextDuration);
    }
  }, [selectedVideoModel, videoAspectRatio, videoDurationSeconds, videoProviderId]);

  async function bootstrapSession() {
    const [currentSession, remembered] = await Promise.all([
      window.productStudio.getSession(),
      window.productStudio.getRememberedSession()
    ]);
    setSession(currentSession);
    setRememberedSession(currentSession ? null : remembered);
    if (currentSession) {
      await refreshStatus();
    }
  }

  async function loadExportDirectory() {
    const paths = await window.productStudio.getPaths();
    const savedPath = localStorage.getItem("productStudio.defaultExportDir");
    setDefaultExportDir(savedPath || paths.defaultExportPath);
  }

  async function refreshStatus() {
    const [statuses, jobs, trashedJobs, gallery, wallet, transactions] = await Promise.all([
      window.productStudio.getKeyStatus(),
      window.productStudio.listHistory(),
      window.productStudio.listTrashedHistory(),
      window.productStudio.listGalleryItems(),
      window.productStudio.getWallet(),
      window.productStudio.listWalletTransactions(100)
    ]);
    setKeyStatus(statuses);
    setHistory(jobs);
    setTrashedHistory(trashedJobs);
    setGalleryItems(gallery);
    setSelectedGalleryIds((current) => current.filter((itemId) => gallery.some((item) => item.id === itemId)));
    setWalletSummary(wallet);
    setWalletTransactions(transactions);
  }

  async function refreshAfterGeneration() {
    await refreshStatus();
  }

  async function refreshWithFeedback() {
    setIsRefreshing(true);
    showStatus(uiText.refreshing);
    try {
      await refreshStatus();
      showStatus(uiText.refreshed);
    } finally {
      window.setTimeout(() => setIsRefreshing(false), 450);
    }
  }

  function showStatus(message: string, tone: StatusTone = "normal") {
    setStatusText(message);
    setStatusTone(tone);
    setStatusSequence((current) => current + 1);
  }

  useEffect(() => {
    if (!statusText) return;
    const timeout = window.setTimeout(() => setStatusText(""), statusTone === "normal" ? 5200 : 4400);
    return () => window.clearTimeout(timeout);
  }, [statusSequence, statusText, statusTone]);

  useEffect(() => {
    if (!exportNotice) return;
    const timeout = window.setTimeout(
      () => setExportNotice(null),
      exportNotice.tone === "error" ? 8000 : 6200
    );
    return () => window.clearTimeout(timeout);
  }, [exportNotice]);

  function prependSessionResults(nextResults: ProductShotResult[]) {
    if (nextResults.length === 0) return;
    setSessionImageResults((current) => [...nextResults, ...current]);
  }

  async function authenticate(mode: "login" | "signup", username: string, password: string) {
    const nextSession =
      mode === "login"
        ? await window.productStudio.login({ username, password })
        : await window.productStudio.signUp({ username, password });
    setSession(nextSession);
    setRememberedSession(null);
    await refreshStatus();
  }

  async function resumeRememberedSession() {
    const nextSession = await window.productStudio.resumeRememberedSession();
    if (!nextSession) {
      setRememberedSession(null);
      return;
    }
    setSession(nextSession);
    setRememberedSession(null);
    await refreshStatus();
  }

  async function logout() {
    await window.productStudio.logout();
    setSession(null);
    setRememberedSession(null);
    setWalletSummary(null);
    setActiveJob(null);
    setSessionImageResults([]);
    setActiveVideoJob(null);
    setHistory([]);
    setTrashedHistory([]);
    setGalleryItems([]);
    setSelectedGalleryIds([]);
    setWalletTransactions([]);
    setProgress({});
    setVideoProgress(null);
  }

  async function addResultToGallery(result: ProductShotResult, jobId?: string) {
    const existing = galleryItems.find((item) => item.imagePath === result.imagePath);
    if (existing) {
      showStatus("这张图片已经在个人图库中。");
      return;
    }
    try {
      const item = await window.productStudio.addGalleryItem({
        imagePath: result.imagePath,
        mediaType: "image",
        title: getPresetName(result.presetId),
        providerId: result.providerId,
        modelId: result.modelId,
        jobId,
        presetId: result.presetId
      });
      setGalleryItems((current) => [...current, item].sort((a, b) => a.sortOrder - b.sortOrder));
      showStatus("已加入个人图库。");
    } catch (error) {
      showStatus(error instanceof Error ? error.message : "加入个人图库失败。", "warn");
    }
  }

  async function addJobResultsToGallery(job: StudioJob) {
    if (job.results.length === 0) {
      showStatus("该历史任务没有可加入图库的作品。", "warn");
      return;
    }
    try {
      await Promise.all(
        isVideoJob(job)
          ? job.results.map((result) =>
              window.productStudio.addGalleryItem({
                imagePath: result.videoPath,
                mediaType: "video",
                title: getVideoModelDisplayName(result.providerId, result.modelId),
                providerId: result.providerId,
                modelId: result.modelId,
                jobId: job.id
              })
            )
          : job.results.map((result) =>
              window.productStudio.addGalleryItem({
                imagePath: result.imagePath,
                mediaType: "image",
                title: getPresetName(result.presetId),
                providerId: result.providerId,
                modelId: result.modelId,
                jobId: job.id,
                presetId: result.presetId
              })
            )
      );
      const gallery = await window.productStudio.listGalleryItems();
      setGalleryItems(gallery);
      showStatus(`已将 ${job.results.length} ${isVideoJob(job) ? "个历史视频" : "张历史图片"}加入个人图库。`);
    } catch (error) {
      showStatus(error instanceof Error ? error.message : "加入个人图库失败。", "warn");
    }
  }

  async function removeGalleryItem(itemId: string) {
    try {
      await window.productStudio.removeGalleryItem(itemId);
      setGalleryItems((current) =>
        current
          .filter((item) => item.id !== itemId)
          .map((item, index) => ({ ...item, sortOrder: index }))
      );
      setSelectedGalleryIds((current) => current.filter((selectedId) => selectedId !== itemId));
      showStatus("已从个人图库移除。");
    } catch (error) {
      showStatus(error instanceof Error ? error.message : "移除图片失败。", "warn");
    }
  }

  async function reorderGalleryItems(nextItems: PersonalGalleryItem[]) {
    const previousItems = galleryItems;
    const normalizedItems = nextItems.map((item, index) => ({ ...item, sortOrder: index }));
    setGalleryItems(normalizedItems);
    try {
      const savedItems = await window.productStudio.reorderGalleryItems(normalizedItems.map((item) => item.id));
      setGalleryItems(savedItems);
      showStatus("个人图库顺序已保存。");
    } catch (error) {
      setGalleryItems(previousItems);
      showStatus(error instanceof Error ? error.message : "保存图库顺序失败。", "warn");
    }
  }

  function openGalleryComparison(items: PersonalGalleryItem[]) {
    if (items.length === 0) return;
    const previewImages = items.map(createGalleryPreviewImage);
    setPreviewImage(previewImages[0]);
    setPreviewComparisonImages(previewImages.slice(1));
  }

  async function handleFiles(files: FileList | null, target: "image" | "video" = "image") {
    if (!files || files.length === 0) return;
    const filePaths = Array.from(files).map((file) => window.productStudio.getFilePath(file)).filter(Boolean);
    if (filePaths.length === 0) {
      showStatus(uiText.cannotReadPath, "warn");
      return;
    }
    try {
      showStatus(uiText.importing);
      const imported = await Promise.all(filePaths.map((filePath) => window.productStudio.importImage(filePath)));
      appendImportedImages(imported, target);
      showStatus(uiText.imageReady);
    } catch (error) {
      showStatus(error instanceof Error ? error.message : uiText.importFailed, "warn");
    }
  }

  async function addVideoResultToGallery(result: VideoGenerationResult, jobId?: string) {
    const existing = galleryItems.find((item) => item.imagePath === result.videoPath);
    if (existing) {
      showStatus("这个视频已经在个人图库中。");
      return;
    }
    try {
      const item = await window.productStudio.addGalleryItem({
        imagePath: result.videoPath,
        mediaType: "video",
        title: getVideoModelDisplayName(result.providerId, result.modelId),
        providerId: result.providerId,
        modelId: result.modelId,
        jobId
      });
      setGalleryItems((current) => [...current, item].sort((a, b) => a.sortOrder - b.sortOrder));
      showStatus("视频已加入个人图库。");
    } catch (error) {
      showStatus(error instanceof Error ? error.message : "加入个人图库失败。", "warn");
    }
  }

  async function selectImages(target: "image" | "video" = "image") {
    try {
      showStatus(uiText.importing);
      const imported = await window.productStudio.selectImages();
      if (imported.length === 0) {
        showStatus(uiText.imageCanceled);
        return;
      }
      appendImportedImages(imported, target);
      showStatus(uiText.imageReady);
    } catch (error) {
      showStatus(error instanceof Error ? error.message : uiText.importFailed, "warn");
    }
  }

  function appendImportedImages(images: ImportedImage[], target: "image" | "video" = "image") {
    if (target === "video") {
      setVideoImportedImages((current) => {
        const next = [...current, ...images];
        if (!activeVideoImagePath && next[0]) {
          setActiveVideoImagePath(next[0].sourceImagePath);
        }
        return next;
      });
      setActiveVideoJob(null);
      setVideoProgress(null);
      return;
    }

    setImportedImages((current) => {
      const next = [...current, ...images];
      if (!activeImagePath && next[0]) {
        setActiveImagePath(next[0].sourceImagePath);
      }
      return next;
    });
    setActiveJob(null);
    setProgress({});
  }

  function deleteImage(imagePath: string, target: "image" | "video" = "image") {
    if (target === "video") {
      setVideoImportedImages((current) => {
        const next = current.filter((image) => image.sourceImagePath !== imagePath);
        if (activeVideoImagePath === imagePath) {
          setActiveVideoImagePath(next[0]?.sourceImagePath ?? null);
        }
        return next;
      });
      setActiveVideoJob(null);
      return;
    }

    setImportedImages((current) => {
      const next = current.filter((image) => image.sourceImagePath !== imagePath);
      if (activeImagePath === imagePath) {
        setActiveImagePath(next[0]?.sourceImagePath ?? null);
      }
      return next;
    });
    setActiveJob(null);
  }

  function clearImages(target: "image" | "video" = "image") {
    if (target === "video") {
      setVideoImportedImages([]);
      setActiveVideoImagePath(null);
      setActiveVideoJob(null);
      setVideoProgress(null);
      showStatus(uiText.imagesCleared);
      return;
    }

    setImportedImages([]);
    setActiveImagePath(null);
    setActiveJob(null);
    setProgress({});
    showStatus(uiText.imagesCleared);
  }

  async function generate() {
    if (!activeImage) return;
    setIsGenerating(true);
    setCurrentJobId(null);
    setProgress({});
    showStatus(uiText.generating);

    try {
      const job = await window.productStudio.generateProductShots(buildGenerateRequest(activeImage));
      setActiveJob(job);
      prependSessionResults(job.results);
      await refreshAfterGeneration();
      showStatus(resolveGenerationStatusText(job));
    } catch (error) {
      showStatus(error instanceof Error ? error.message : uiText.generationFailed, "warn");
    } finally {
      setIsGenerating(false);
      setCurrentJobId(null);
    }
  }

  function confirmGenerate() {
    if (!canGenerate) return;
    setPendingGenerateMode("single");
  }

  function confirmBatchGenerate() {
    if (!canBatchGenerate) return;
    setPendingGenerateMode("batch");
  }

  function runPendingGeneration() {
    const mode = pendingGenerateMode;
    setPendingGenerateMode(null);
    if (mode === "single") {
      void generate();
      return;
    }
    if (mode === "batch") {
      void batchGenerate();
    }
  }

  async function batchGenerate() {
    if (importedImages.length === 0) return;
    setIsGenerating(true);
    setCurrentJobId(null);
    setProgress({});
    showStatus(uiText.batchGenerating);

    try {
      let latestJob: ProductShotJob | null = null;
      for (const [index, image] of importedImages.entries()) {
        setActiveImagePath(image.sourceImagePath);
        showStatus(`${uiText.batchGenerating} ${index + 1}/${importedImages.length}`);
        latestJob = await window.productStudio.generateProductShots(buildGenerateRequest(image));
        prependSessionResults(latestJob.results);
      }
      if (latestJob) {
        setActiveJob(latestJob);
      }
      await refreshAfterGeneration();
      showStatus(uiText.generationComplete);
    } catch (error) {
      showStatus(error instanceof Error ? error.message : uiText.generationFailed, "warn");
    } finally {
      setIsGenerating(false);
      setCurrentJobId(null);
    }
  }

  function buildGenerateRequest(image: ImportedImage) {
    return {
      sourceImagePath: image.sourceImagePath,
      providerId,
      modelId,
      presetIds: selectedPresets,
      fidelity: "strict" as const,
      quality,
      productBrief: productBrief.trim() || undefined,
      outputCount,
      aspectRatio,
      exportFormat
    };
  }

  async function retryFailed() {
    if (!activeJob) return;
    const retryPresetIds = getFailedPresetIds(activeJob);
    if (retryPresetIds.length === 0) {
      showStatus(uiText.noFailedPresets);
      return;
    }

    const request = {
      ...activeJob.request,
      presetIds: retryPresetIds
    };
    syncFormFromJob(activeJob);
    setIsGenerating(true);
    setCurrentJobId(null);
    setProgress({});
    showStatus(uiText.retryingFailed);

    try {
      const job = await window.productStudio.generateProductShots(request);
      setActiveJob(job);
      prependSessionResults(job.results);
      await refreshAfterGeneration();
      showStatus(resolveGenerationStatusText(job));
    } catch (error) {
      showStatus(error instanceof Error ? error.message : uiText.generationFailed, "warn");
    } finally {
      setIsGenerating(false);
      setCurrentJobId(null);
    }
  }

  async function cancelGeneration() {
    if (!currentJobId) return;
    showStatus(uiText.canceling);
    await window.productStudio.cancelProductJob(currentJobId);
    setIsGenerating(false);
    await refreshStatus();
    showStatus(uiText.canceled);
  }

  async function generateVideo() {
    if (!activeVideoImage) return;
    setIsGeneratingVideo(true);
    setCurrentVideoJobId(null);
    setVideoProgress(null);
    showStatus(uiText.generatingVideo);

    try {
      const job = await window.productStudio.generateProductVideo({
        sourceImagePath: activeVideoImage.sourceImagePath,
        providerId: videoProviderId,
        modelId: videoModelId,
        tencentVodSubAppId,
        prompt: videoPrompt.trim(),
        aspectRatio: videoAspectRatio,
        durationSeconds: clampVideoDuration(videoDurationSeconds),
        resolution: hiddenVideoResolution,
        watermark: false,
        enableAudio: false
      });
      setActiveVideoJob(job);
      await refreshAfterGeneration();
      showStatus(job.status === "completed" ? uiText.videoComplete : uiText.videoFailed, job.status === "completed" ? "normal" : "warn");
    } catch (error) {
      showStatus(error instanceof Error ? error.message : uiText.videoFailed, "warn");
    } finally {
      setIsGeneratingVideo(false);
      setCurrentVideoJobId(null);
    }
  }

  async function cancelVideoGeneration() {
    if (!currentVideoJobId) return;
    showStatus(uiText.canceling);
    await window.productStudio.cancelVideoJob(currentVideoJobId);
    setIsGeneratingVideo(false);
    await refreshStatus();
    showStatus(uiText.canceled);
  }

  async function exportAll() {
    const imagePaths = results.map((result) => result.imagePath);
    if (imagePaths.length === 0) {
      showStatus(uiText.noExportImages, "warn");
      return;
    }
    await exportImagePaths(imagePaths);
  }

  async function exportImagePaths(imagePaths: string[]) {
    if (imagePaths.length === 0) {
      showStatus(uiText.noExportImages, "warn");
      return;
    }
    setExportFeedback("running");
    setExportNotice(null);
    showStatus(uiText.exporting);
    try {
      const targetDir = defaultExportDir || (await resolveDefaultExportDir());
      const response = await window.productStudio.exportImages({ imagePaths, format: exportFormat, targetDir });
      if (response.exportedPaths.length > 0) {
        setExportFeedback("done");
        setImageExportCompleted(true);
        setStatusText("");
        setExportNotice({
          tone: "success",
          title: "导出成功",
          message: `${response.exportedPaths.length} 张图片已保存到`,
          detail: targetDir
        });
        window.setTimeout(() => {
          setExportFeedback((current) => (current === "done" ? "idle" : current));
        }, 1600);
      } else {
        setExportFeedback("idle");
        setExportNotice(null);
        showStatus("已取消导出，未保存任何图片。");
      }
    } catch (error) {
      setExportFeedback("idle");
      setStatusText("");
      setExportNotice({
        tone: "error",
        title: "导出失败",
        message: error instanceof Error ? error.message : "未获得具体错误信息。"
      });
    }
  }

  async function exportVideoPaths(videoPaths: string[]) {
    if (videoPaths.length === 0) {
      showStatus(uiText.videoWaiting, "warn");
      return;
    }
    setExportFeedback("running");
    setExportNotice(null);
    showStatus(uiText.exporting);
    try {
      const targetDir = defaultExportDir || (await resolveDefaultExportDir());
      const response = await window.productStudio.exportVideos({ videoPaths, targetDir });
      if (response.exportedPaths.length > 0) {
        setExportFeedback("done");
        setVideoExportCompleted(true);
        setStatusText("");
        setExportNotice({
          tone: "success",
          title: "导出成功",
          message: `${response.exportedPaths.length} 个视频已保存到`,
          detail: targetDir
        });
        window.setTimeout(() => {
          setExportFeedback((current) => (current === "done" ? "idle" : current));
        }, 1600);
      } else {
        setExportFeedback("idle");
        setExportNotice(null);
        showStatus("已取消导出，未保存任何视频。");
      }
    } catch (error) {
      setExportFeedback("idle");
      setStatusText("");
      setExportNotice({
        tone: "error",
        title: "导出失败",
        message: error instanceof Error ? error.message : "未获得具体错误信息。"
      });
    }
  }

  async function exportHistoryJob(job: StudioJob) {
    if (isVideoJob(job)) {
      await exportVideoPaths(job.results.map((result) => result.videoPath));
      return;
    }
    await exportImagePaths(job.results.map((result) => result.imagePath));
  }

  async function trashHistoryJob(jobId: string) {
    await window.productStudio.trashHistoryJob(jobId);
    if (activeJob?.id === jobId) {
      setActiveJob(null);
    }
    if (activeVideoJob?.id === jobId) {
      setActiveVideoJob(null);
    }
    await refreshStatus();
    showStatus(uiText.movedToTrash);
  }

  async function restoreHistoryJob(jobId: string) {
    await window.productStudio.restoreHistoryJob(jobId);
    await refreshStatus();
    showStatus(uiText.restored);
  }

  async function deleteHistoryJobForever(jobId: string) {
    await window.productStudio.deleteHistoryJobForever(jobId);
    await refreshStatus();
    showStatus(uiText.deletedForever);
  }

  async function resolveDefaultExportDir(): Promise<string> {
    if (defaultExportDir) return defaultExportDir;
    const paths = await window.productStudio.getPaths();
    setDefaultExportDir(paths.defaultExportPath);
    return paths.defaultExportPath;
  }

  async function chooseDefaultExportFolder() {
    const folder = await window.productStudio.selectExportFolder();
    if (!folder) return;
    localStorage.setItem("productStudio.defaultExportDir", folder);
    setDefaultExportDir(folder);
    showStatus(`${uiText.defaultExportFolder} ${folder}`);
  }

  function selectPreset(presetId: PresetId) {
    setSelectedPresets([presetId]);
    const preset = productShotPresets.find((item) => item.id === presetId);
    if (preset && preset.prompt) {
      setProductBrief(preset.prompt);
    }
  }

  async function exportAllVideos() {
    await exportVideoPaths(videoResults.map((result) => result.videoPath));
  }

  function selectVideoPreset(presetId: PresetId) {
    setSelectedVideoPresetId(presetId);
    const preset = productShotPresets.find((item) => item.id === presetId);
    if (preset?.prompt) {
      setVideoPrompt(preset.prompt);
    }
  }

  function selectImageModel(option: ImageModelOption) {
    setProviderId(option.providerId);
    setModelId(option.modelId);
    persistModelSelection(option.providerId, option.modelId);
    setOpenImageConfigPanel(null);
  }

  function toggleImageConfigPanel(panel: ImageConfigPanel) {
    setOpenImageConfigPanel((current) => (current === panel ? null : panel));
  }

  function selectImageAspectRatio(ratio: AspectRatio) {
    setAspectRatio(ratio);
    setOpenImageConfigPanel(null);
  }

  function selectImageOutputCount(count: number) {
    setOutputCount(clampOutputCount(count));
    setOpenImageConfigPanel(null);
  }

  function requestDeleteImageResult(result: ProductShotResult, jobId?: string) {
    setDeleteTarget({
      mediaType: "image",
      resultPath: result.imagePath,
      jobId,
      title: getPresetName(result.presetId),
      detail: "删除后不会删除本地图片文件。你可以选择只从当前生成结果移除，或同时从历史作品中移除这条作品。"
    });
  }

  function requestDeleteVideoResult(result: VideoGenerationResult, jobId?: string) {
    setDeleteTarget({
      mediaType: "video",
      resultPath: result.videoPath,
      jobId,
      title: getVideoModelDisplayName(result.providerId, result.modelId),
      detail: "删除后不会删除本地视频文件。你可以选择只从当前生成结果移除，或同时从历史作品中移除这条作品。"
    });
  }

  function removeResultFromCurrentView(target: ResultDeleteTarget) {
    if (target.mediaType === "video") {
      setActiveVideoJob((current) => {
        if (!current || (target.jobId && current.id !== target.jobId)) return current;
        return {
          ...current,
          results: current.results.filter((result) => result.videoPath !== target.resultPath)
        };
      });
      return;
    }

    setSessionImageResults((current) => current.filter((result) => result.imagePath !== target.resultPath));
    setActiveJob((current) => {
      if (!current || (target.jobId && current.id !== target.jobId)) return current;
      return {
        ...current,
        results: current.results.filter((result) => result.imagePath !== target.resultPath)
      };
    });
  }

  async function confirmDeleteResult(syncHistory: boolean) {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    removeResultFromCurrentView(target);

    if (!syncHistory || !target.jobId) {
      showStatus(syncHistory ? "已从当前结果移除；未找到可同步的历史任务。" : "已从当前生成结果移除。");
      return;
    }

    try {
      const response = await window.productStudio.deleteHistoryResult({
        jobId: target.jobId,
        mediaType: target.mediaType,
        resultPath: target.resultPath
      });
      await refreshStatus();
      if (!response.removed) {
        showStatus("当前结果已移除，历史作品中未找到对应记录。", "warn");
        return;
      }
      showStatus(response.movedToTrash ? "已从当前结果移除，并将空历史任务移入回收站。" : "已从当前结果和历史作品中移除。");
    } catch (error) {
      showStatus(error instanceof Error ? `当前结果已移除，历史同步失败：${error.message}` : "当前结果已移除，历史同步失败。", "warn");
    }
  }

  function selectHistoryJob(job: ProductShotJob) {
    const firstResult = job.results[0];
    if (firstResult) {
      setPreviewComparisonImages([]);
      setPreviewImage(createResultPreviewImage(firstResult));
      return;
    }
    showStatus(job.errors[0]?.message ?? "该历史作品没有可预览的图片。", "warn");
  }

  function selectVideoHistoryJob(job: VideoGenerationJob) {
    const firstResult = job.results[0];
    if (firstResult) {
      setPreviewVideo(createResultPreviewVideo(firstResult));
      return;
    }
    showStatus(job.errors[0]?.message ?? "该历史作品没有可预览的视频。", "warn");
  }

  function syncFormFromJob(job: ProductShotJob) {
    if (isProviderId(job.request.providerId)) {
      setProviderId(job.request.providerId);
      const nextModelId = job.request.modelId || providerConfigs[job.request.providerId].defaultModel;
      setModelId(nextModelId);
      persistModelSelection(job.request.providerId, nextModelId);
    }
    const restoredPreset = job.request.presetIds.find(isPresetId) ?? "white-main";
    setSelectedPresets([restoredPreset]);
    setProductBrief(mergeLegacyPromptFields(job.request.productBrief, job.request.styleGuide, job.request.posterCopy));
    setQuality(job.request.quality ?? "standard");
    setAspectRatio(job.request.aspectRatio);
    updateExportFormat(job.request.exportFormat);
    setOutputCount(clampOutputCount(job.request.outputCount));
  }

  function resolveGenerationStatusText(job: ProductShotJob) {
    if (job.status === "completed") return uiText.generationComplete;
    if (job.status === "canceled") return uiText.canceled;
    if (job.status === "failed") return uiText.generationFailed;
    return uiText.generationPartial;
  }

  const presetProgress = useMemo(
    () =>
      productShotPresets.map((preset) => ({
        preset,
        progress: progress[preset.id],
        selected: selectedPresets.includes(preset.id)
      })),
    [progress, selectedPresets]
  );

  const imageConfigControls = (
    <ImageQuickConfigPanel
      openPanel={openImageConfigPanel}
      providerId={providerId}
      modelId={modelId}
      modelOptions={modelOptions}
      keyStatus={keyStatus}
      aspectRatio={aspectRatio}
      outputCount={outputCount}
      onTogglePanel={toggleImageConfigPanel}
      onModelSelect={selectImageModel}
      onAspectRatioSelect={selectImageAspectRatio}
      onOutputCountSelect={selectImageOutputCount}
      onInvalidInput={(message) => showStatus(message, "warn")}
      onOpenSettings={() => setSettingsOpen(true)}
    />
  );

  if (!session) {
    return (
      <div className="app-frame auth-app-frame">
        <WindowTitleBar />
        <AuthScreen
          rememberedSession={rememberedSession}
          onAuthenticate={authenticate}
          onResume={() => void resumeRememberedSession()}
        />
      </div>
    );
  }

  return (
    <div className="app-frame">
      <WindowTitleBar activePage={activePage} />
      {showActivityProgress ? (
        <div className={`refresh-progress ${isRefreshing ? "refreshing" : ""} ${exportFeedback}`} />
      ) : null}
      <div className="studio-page-shell">
        <PageNavigation
          activePage={activePage}
          session={session}
          wallet={walletSummary}
          onNavigate={setActivePage}
          onRecharge={() => {
            setPersonalCenterTab("recharge");
            setActivePage("personal");
          }}
          onLogout={() => void logout()}
        />
        {activePage === "image" ? (
          <main className="workspace image-workspace-page">
            <div className="studio-board">
              <header className="top-bar studio-command-bar">
                <div className="studio-heading">
                  <div className="studio-title-line">
                    <h2>{uiText.packageTitle}</h2>
                    <span>{getModelDisplayName(providerId, modelId)}</span>
                  </div>
                  <p>
                    {configuredProvider ? `${uiText.model} ${uiText.configured}` : uiText.configureKeyFirst}
                    {" | "}
                    {getModelDisplayName(providerId, modelId)}
                    {" | "}
                    {uiText.unitPrice} {formatUsdCents(unitPriceCents)}
                    {!hasEnoughBalance ? ` | ${uiText.insufficientBalance}` : ""}
                  </p>
                </div>
                <div className="top-actions">
                  {canRetryFailed ? (
                    <button className="secondary-button" onClick={() => void retryFailed()}>
                      <RotateCcw size={17} />
                      {uiText.retryFailed}
                    </button>
                  ) : null}
                  {isGenerating ? (
                    <button className="secondary-button" onClick={() => void cancelGeneration()} disabled={!currentJobId}>
                      <Square size={15} />
                      {uiText.cancel}
                    </button>
                  ) : null}
                  <button className="secondary-button cost-action-button" onClick={confirmBatchGenerate} disabled={!canBatchGenerate}>
                    <Sparkles size={17} />
                    <span>{uiText.batchGenerate}（{batchOutputTotal}张）</span>
                    <small>{formatUsdCents(batchCostCents)}</small>
                  </button>
                  <GenerateActionButton
                    loading={isGenerating}
                    disabled={!canGenerate}
                    onClick={confirmGenerate}
                    label={`${uiText.generate}（${outputCount}张）`}
                    cost={formatUsdCents(estimatedCostCents)}
                  />
                </div>
              </header>

              <div className="image-page-grid">
                <div className="image-main-column">
                  <WorkflowRibbon steps={workflowSteps} busy={isGenerating || isExporting} />

                  <ResizableWorkspace
                    className="image-resizable-workspace"
                    layout={imageWorkspaceLayout}
                    onLayoutChange={updateImageWorkspaceLayout}
                  >
                    <section
                      className={`upload-surface ${dragActive ? "drag-active" : ""} ${activeImage ? "has-image" : "is-empty"}`}
                      onDragEnter={(event) => {
                        event.preventDefault();
                        setDragActive(true);
                      }}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setDragActive(true);
                      }}
                      onDragLeave={(event) => {
                        event.preventDefault();
                        setDragActive(false);
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        setDragActive(false);
                        void handleFiles(event.dataTransfer.files);
                      }}
                    >
                      {activeImage ? (
                        <div className="image-workbench">
                          <button
                            className="image-preview-button"
                            onClick={() => void selectImages()}
                            title={uiText.clickImageToAdd}
                          >
                            <img src={activeImage.previewDataUrl} alt="Imported product" />
                          </button>
                          <div className="image-toolbar">
                            <span>{importedImages.length} {uiText.imagesCount}</span>
                            <button
                              className="secondary-button"
                              onClick={() =>
                                setPreviewImage({
                                  src: activeImage.previewDataUrl,
                                  filePath: activeImage.sourceImagePath,
                                  title: uiText.selectImage,
                                  subtitle: `${activeImage.dimensions.width} x ${activeImage.dimensions.height}`,
                                  fileName: "source-product.png"
                                })
                              }
                            >
                              <ZoomIn size={16} />
                              {uiText.previewCurrentImage}
                            </button>
                            <button className="secondary-button" onClick={() => void selectImages()}>
                              <Upload size={17} />
                              {uiText.addImages}
                            </button>
                            <button className="secondary-button" onClick={() => clearImages()}>
                              <Trash2 size={16} />
                              {uiText.clearImages}
                            </button>
                          </div>
                          <div className="image-queue">
                            {importedImages.map((image, index) => (
                              <button
                                key={image.sourceImagePath}
                                className={image.sourceImagePath === activeImage.sourceImagePath ? "active" : ""}
                                onClick={() => setActiveImagePath(image.sourceImagePath)}
                              >
                                <img src={image.previewDataUrl} alt={`Product ${index + 1}`} />
                                <span>{index + 1}</span>
                                <i
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    deleteImage(image.sourceImagePath);
                                  }}
                                  title={uiText.deleteImage}
                                >
                                  <X size={13} />
                                </i>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="upload-empty">
                          <button className="upload-empty-visual" onClick={() => void selectImages()}>
                            <img src={workflowStudioIllustrationUrl} alt="" />
                            <div className="upload-empty-action">
                              <ImagePlus size={28} />
                            </div>
                          </button>
                          <strong>{uiText.clickOrDragUpload}</strong>
                          <p>支持 JPG / PNG / WebP 格式，单张图片 ≤ 20MB</p>
                          <button className="primary-button" onClick={() => void selectImages()}>
                            <Upload size={17} />
                            {uiText.addImages}
                          </button>
                        </div>
                      )}
                    </section>

                    <section className="preset-panel">
                      {imageConfigControls}

                      <section className="prompt-panel">
                        <div className="section-title">
                          <span>输入描述</span>
                        </div>
                        <label className="prompt-single-field">
                          <span>提示词</span>
                          <textarea
                            value={productBrief}
                            maxLength={5000}
                            placeholder="选择下方模板会自动填入提示词，也可以在这里直接输入自定义生成要求。"
                            onChange={(event) => setProductBrief(event.target.value)}
                          />
                        </label>
                      </section>

                      <section className="template-panel">
                        <div className="section-title">
                          <span>提示词模板</span>
                          <small>{getPresetName(selectedPresets[0])}</small>
                        </div>
                        <div className="preset-list">
                          {presetProgress.map(({ preset, progress: item, selected }) => (
                            <button
                              key={preset.id}
                              className={`preset-item ${selected ? "selected" : ""} ${item?.status ? `progress-${item.status}` : ""}`}
                              onClick={() => selectPreset(preset.id)}
                              title={preset.prompt || preset.description}
                            >
                              <div>
                                <strong>{preset.name}</strong>
                                <span>{preset.description}</span>
                              </div>
                              <PresetState status={item?.status} />
                            </button>
                          ))}
                        </div>
                      </section>
                    </section>

                    <section className={`result-band unified-result-band ${activeJob?.errors.length ? "has-errors" : ""}`}>
                    <div className="section-title result-section-title">
                      <span>生成结果</span>
                      <div className="section-actions">
                        {activeJob?.errors.length ? <span className="error-count">{activeJob.errors.length} {uiText.errors}</span> : null}
                        <button
                          className="secondary-button compact-button result-export-all-button"
                          onClick={() => void exportAll()}
                          disabled={results.length === 0 || isExporting}
                        >
                          {isExporting ? <Loader2 className="spin" size={14} /> : <Download size={14} />}
                          导出全部
                        </button>
                      </div>
                    </div>
                    {activeJob?.errors.length ? <FailurePanel job={activeJob} /> : null}
                    <ResultGridMotion signature={imageResultSignature}>
                      {results.length === 0 ? (
                        <ResultEmptyState mediaType="image" />
                      ) : (
                        results.map((result) => (
                          <figure key={`${result.presetId}-${result.imagePath}`} className="result-tile result-enter">
                            <button
                              className="result-image-button"
                              onClick={() => setPreviewImage(createResultPreviewImage(result))}
                            >
                              <img src={window.productStudio.toFileUrl(result.imagePath)} alt={result.presetId} />
                            </button>
                            <figcaption className="result-actions-only">
                              <button
                                className={`icon-button ${
                                  galleryItems.some((item) => getGalleryMediaType(item) === "image" && item.imagePath === result.imagePath)
                                    ? "active"
                                    : ""
                                }`}
                                onClick={() => void addResultToGallery(result, activeJob?.id)}
                                title={
                                  galleryItems.some((item) => getGalleryMediaType(item) === "image" && item.imagePath === result.imagePath)
                                    ? "已在个人图库"
                                    : "加入个人图库"
                                }
                              >
                                {galleryItems.some((item) => getGalleryMediaType(item) === "image" && item.imagePath === result.imagePath) ? (
                                  <Check size={14} />
                                ) : (
                                  <FolderPlus size={14} />
                                )}
                              </button>
                              <button
                                className="icon-button"
                                onClick={() => void exportImagePaths([result.imagePath])}
                                disabled={isExporting}
                                title={uiText.export}
                              >
                                {isExporting ? <Loader2 className="spin" size={14} /> : <Download size={14} />}
                              </button>
                              <button
                                className="icon-button danger"
                                onClick={() => requestDeleteImageResult(result, activeJob?.id)}
                                title="删除结果"
                              >
                                <Trash2 size={14} />
                              </button>
                            </figcaption>
                          </figure>
                        ))
                      )}
                    </ResultGridMotion>
                    </section>
                  </ResizableWorkspace>
                </div>
              </div>
            </div>
          </main>
        ) : activePage === "video" ? (
          <VideoGenerationPage
            activeImage={activeVideoImage}
            importedImages={videoImportedImages}
            providerId={videoProviderId}
            modelId={videoModelId}
            modelOptions={videoModelOptions}
            aspectRatioOptions={videoAspectRatioOptions}
            durationOptions={videoDurationOptions}
            keyStatus={keyStatus}
            prompt={videoPrompt}
            aspectRatio={videoAspectRatio}
            durationSeconds={videoDurationSeconds}
            estimatedCost={estimatedVideoCostCents}
            wallet={walletSummary}
            supported={videoSupported}
            setupWarning={videoSetupWarning}
            workflowSteps={videoWorkflowSteps}
            progress={videoProgress}
            job={activeVideoJob}
            layout={videoWorkspaceLayout}
            dragActive={videoDragActive}
            selectedPresetId={selectedVideoPresetId}
            isGenerating={isGeneratingVideo}
            isExporting={isExporting}
            canGenerate={canGenerateVideo}
            galleryPaths={new Set(galleryItems.filter((item) => getGalleryMediaType(item) === "video").map((item) => item.imagePath))}
            onSelectImage={() => void selectImages("video")}
            onSelectImagePath={setActiveVideoImagePath}
            onPreviewImage={(image) => {
              setPreviewImage({
                src: image.previewDataUrl,
                filePath: image.sourceImagePath,
                title: uiText.selectImage,
                subtitle: `${image.dimensions.width} x ${image.dimensions.height}`,
                fileName: "source-video-product.png"
              });
            }}
            onDeleteImage={(imagePath) => deleteImage(imagePath, "video")}
            onClearImages={() => clearImages("video")}
            onDragActiveChange={setVideoDragActive}
            onDropFiles={(files) => void handleFiles(files, "video")}
            onModelSelect={(option) => {
              setVideoProviderId(option.providerId);
              setVideoModelId(option.modelId);
            }}
            onPromptChange={(prompt) => {
              setVideoPrompt(prompt);
              setSelectedVideoPresetId("custom");
            }}
            onPresetSelect={selectVideoPreset}
            onAspectRatioChange={setVideoAspectRatio}
            onDurationChange={(value) => setVideoDurationSeconds(clampVideoDuration(value))}
            onInvalidInput={(message) => showStatus(message, "warn")}
            onOpenSettings={() => setSettingsOpen(true)}
            onLayoutChange={updateVideoWorkspaceLayout}
            onGenerate={() => void generateVideo()}
            onCancel={() => void cancelVideoGeneration()}
            onAddToGallery={(result) => void addVideoResultToGallery(result, activeVideoJob?.id)}
            onPreviewVideo={(result) => setPreviewVideo(createResultPreviewVideo(result))}
            onExport={(videoPath) => void exportVideoPaths([videoPath])}
            onExportAll={() => void exportAllVideos()}
            onDelete={(result) => requestDeleteVideoResult(result, activeVideoJob?.id)}
          />
        ) : activePage === "gallery" ? (
          <PersonalGalleryPage
            items={galleryItems}
            selectedIds={selectedGalleryIds}
            onSelectedIdsChange={setSelectedGalleryIds}
            onPreview={(item) => {
              if (getGalleryMediaType(item) === "video") {
                setPreviewVideo(createGalleryPreviewVideo(item));
                return;
              }
              setPreviewComparisonImages([]);
              setPreviewImage(createGalleryPreviewImage(item));
            }}
            onCompare={openGalleryComparison}
            onReorder={(items) => void reorderGalleryItems(items)}
            onRemove={(itemId) => void removeGalleryItem(itemId)}
            onGalleryItemAdded={(item) => {
              setGalleryItems((current) => [...current.filter((entry) => entry.id !== item.id), item].sort((a, b) => a.sortOrder - b.sortOrder));
            }}
          />
        ) : activePage === "personal" ? (
          <PersonalCenterPage
            session={session}
            wallet={walletSummary}
            jobs={history}
            trashedJobs={trashedHistory}
            transactions={walletTransactions}
            activeTab={personalCenterTab}
            providerId={providerId}
            modelId={modelId}
            onTabChange={setPersonalCenterTab}
            onRefresh={() => void refreshWithFeedback()}
            onTrash={(jobId) => void trashHistoryJob(jobId)}
            onRestore={(jobId) => void restoreHistoryJob(jobId)}
            onDeleteForever={(jobId) => void deleteHistoryJobForever(jobId)}
            onSelectImage={selectHistoryJob}
            onSelectVideo={selectVideoHistoryJob}
            galleryPaths={new Set(galleryItems.map((item) => item.imagePath))}
            onAddToGallery={(job) => void addJobResultsToGallery(job)}
            onExport={(job) => void exportHistoryJob(job)}
            onRecharged={(wallet) => {
              setWalletSummary(wallet);
              void refreshStatus();
            }}
          />
        ) : activePage === "updates" ? (
          <UpdateAnnouncementsPage />
        ) : (
          <SettingsDialog
            defaultExportDir={defaultExportDir}
            exportFormat={exportFormat}
            tencentVodSubAppId={tencentVodSubAppId}
            embedded
            onExportFormatChange={updateExportFormat}
            onTencentVodSubAppIdChange={updateTencentVodSubAppId}
            onClose={() => setActivePage("image")}
            onChooseExportFolder={() => void chooseDefaultExportFolder()}
            onOpenTutorial={() => setTutorialOpen(true)}
          />
        )}
      </div>

      {statusText ? (
        <StatusToast
          key={statusSequence}
          message={statusText}
          tone={statusTone}
          loading={isGenerating || isGeneratingVideo || isRefreshing || isExporting}
          onClose={() => setStatusText("")}
        />
      ) : null}
      {exportNotice ? <ExportResultNotice notice={exportNotice} onClose={() => setExportNotice(null)} /> : null}
      {settingsOpen ? (
        <ApiKeysDialog
          statuses={keyStatus}
          onClose={() => setSettingsOpen(false)}
          onUpdated={() => void refreshStatus()}
        />
      ) : null}
      {tutorialOpen ? <TutorialDialog onClose={() => setTutorialOpen(false)} /> : null}
      {pendingGenerateMode ? (
        <GenerateConfirmationDialog
          mode={pendingGenerateMode}
          activeImage={activeImage}
          importedImages={importedImages}
          providerId={providerId}
          modelId={modelId}
          selectedPresets={selectedPresets}
          aspectRatio={aspectRatio}
          exportFormat={exportFormat}
          outputCount={outputCount}
          productBrief={productBrief}
          estimatedCostCents={pendingGenerateMode === "single" ? estimatedCostCents : batchCostCents}
          walletBalanceCents={walletSummary?.balanceCents ?? 0}
          totalOutputCount={pendingGenerateMode === "single" ? singleOutputTotal : batchOutputTotal}
          defaultExportDir={defaultExportDir}
          onChooseExportFolder={() => void chooseDefaultExportFolder()}
          onCancel={() => setPendingGenerateMode(null)}
          onConfirm={runPendingGeneration}
        />
      ) : null}
      {previewImage ? (
        <ImagePreviewDialog
          image={previewImage}
          comparisonImages={previewComparisonImages}
          libraryImages={comparisonLibraryImages}
          exportFormat={exportFormat}
          defaultExportDir={defaultExportDir}
          resolveDefaultExportDir={resolveDefaultExportDir}
          onClose={() => {
            setPreviewImage(null);
            setPreviewComparisonImages([]);
          }}
          onSaved={(path) => showStatus(`${uiText.saved} ${path}`)}
        />
      ) : null}
      {previewVideo ? (
        <VideoPreviewDialog video={previewVideo} onClose={() => setPreviewVideo(null)} />
      ) : null}
      {deleteTarget ? (
        <DeleteResultDialog
          target={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={(scope) => void confirmDeleteResult(scope === "history")}
        />
      ) : null}
    </div>
  );
}

function WindowTitleBar(props: { activePage?: AppPage }) {
  const pageLabels: Partial<Record<AppPage, string>> = {
    image: uiText.imagePage,
    video: uiText.videoPage,
    gallery: uiText.galleryPage,
    personal: uiText.personalCenter,
    updates: uiText.updatesPage,
    settings: uiText.settingsPage
  };
  const pageLabel = props.activePage ? pageLabels[props.activePage] : "";

  return (
    <header className="window-titlebar">
      <span className="window-titlebar-mark">
        <Sparkles size={13} strokeWidth={2.2} />
      </span>
      <strong>Product Shot Studio</strong>
      {pageLabel ? (
        <>
          <i />
          <span className="window-titlebar-page">{pageLabel}</span>
        </>
      ) : null}
    </header>
  );
}

function PageNavigation(props: {
  activePage: AppPage;
  session: AuthSession;
  wallet: WalletSummary | null;
  onNavigate: (page: AppPage) => void;
  onRecharge: () => void;
  onLogout: () => void;
}) {
  const items: Array<{ id: AppPage; label: string; icon: JSX.Element }> = [
    { id: "image", label: uiText.imagePage, icon: <ImagePlus size={17} /> },
    { id: "video", label: uiText.videoPage, icon: <Video size={17} /> },
    { id: "gallery", label: uiText.galleryPage, icon: <Images size={17} /> },
    { id: "personal", label: uiText.personalCenter, icon: <User size={17} /> },
    { id: "updates", label: uiText.updatesPage, icon: <Megaphone size={17} /> },
    { id: "settings", label: uiText.settingsPage, icon: <Settings size={17} /> }
  ];
  return (
    <aside className="page-nav">
      <div className="page-nav-brand">
        <span><Sparkles size={18} /></span>
        <div>
          <strong>Product Shot Studio</strong>
          <small>{uiText.tagline}</small>
        </div>
      </div>
      <div className="page-nav-list">
        {items.map((item) => (
          <button
            key={item.id}
            className={props.activePage === item.id ? "active" : ""}
            onClick={() => props.onNavigate(item.id)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
      <WalletBadge
        session={props.session}
        wallet={props.wallet}
        onRecharge={props.onRecharge}
        onLogout={props.onLogout}
      />
    </aside>
  );
}

function UpdateAnnouncementsPage() {
  return (
    <main className="page-workspace updates-page">
      <header className="page-header">
        <div>
          <h2>{uiText.updatesPage}</h2>
          <p>{uiText.updatesSubtitle}</p>
        </div>
        <div className="update-header-badge">
          <Megaphone size={18} />
          <span>{updateAnnouncements.length} 条公告</span>
        </div>
      </header>

      <div className="updates-layout">
        <section className="updates-list">
          {updateAnnouncements.map((announcement, index) => (
            <article
              key={announcement.id}
              className={`update-card ${index === 0 ? "latest" : ""}`}
            >
              <header>
                <div>
                  <span className="update-kicker">
                    {index === 0 ? uiText.latestUpdate : uiText.updatesPage}
                  </span>
                  <h3>{announcement.title}</h3>
                </div>
                <div className="update-meta">
                  <span>{uiText.updateVersion} {announcement.version}</span>
                  <span>{uiText.updateTime} {announcement.publishedAt}</span>
                </div>
              </header>
              <p>{announcement.summary}</p>
              <div className="update-section-grid">
                {announcement.sections.map((section) => (
                  <section key={`${announcement.id}-${section.heading}`} className="update-section">
                    <h4>{section.heading}</h4>
                    <ul>
                      {section.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </article>
          ))}
        </section>

        <aside className="updates-guideline">
          <span>{uiText.updateDetails}</span>
          <h3>以后每次更新都记录这几件事</h3>
          <ol>
            <li>更新时间：使用明确的年月日和时分秒。</li>
            <li>版本标题：让用户一眼知道这次更新解决了什么。</li>
            <li>功能新增：写清楚入口、用法和对用户的价值。</li>
            <li>问题修复：写清楚原问题、修复方式和影响范围。</li>
            <li>验证结果：记录测试、构建或打包是否通过。</li>
          </ol>
        </aside>
      </div>
    </main>
  );
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function GenerateActionButton(props: {
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
  label: string;
  cost: string;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useGSAP(
    () => {
      const button = buttonRef.current;
      if (!button || !props.loading || prefersReducedMotion()) return;
      const tween = gsap.to(button, {
        scale: 1.018,
        duration: 0.56,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        overwrite: "auto"
      });
      return () => tween.kill();
    },
    { scope: buttonRef, dependencies: [props.loading] }
  );

  return (
    <button
      ref={buttonRef}
      className={`primary-button generate-button cost-action-button ${props.loading ? "is-loading" : ""}`}
      onClick={props.onClick}
      disabled={props.disabled}
    >
      {props.loading ? <Loader2 className="spin" size={18} /> : <Play size={18} />}
      <span>{props.label}</span>
      <small>{props.cost}</small>
    </button>
  );
}

function StatusToast(props: {
  message: string;
  tone: StatusTone;
  loading: boolean;
  onClose: () => void;
}) {
  const toastRef = useRef<HTMLDivElement>(null);
  const Icon =
    props.tone === "success"
      ? CheckCircle2
      : props.tone === "error" || props.tone === "warn"
        ? CircleAlert
        : Info;

  useGSAP(
    () => {
      const toast = toastRef.current;
      if (!toast) return;
      const reduceMotion = prefersReducedMotion();
      gsap.from(toast, {
        x: reduceMotion ? 0 : 18,
        y: reduceMotion ? 0 : -6,
        autoAlpha: 0,
        duration: reduceMotion ? 0.12 : 0.28,
        ease: "power2.out",
        overwrite: "auto"
      });
    },
    { scope: toastRef, dependencies: [props.message, props.tone] }
  );

  return (
    <div
      ref={toastRef}
      className={`status-toast status-toast-${props.tone}`}
      role={props.tone === "error" || props.tone === "warn" ? "alert" : "status"}
      aria-live={props.tone === "error" ? "assertive" : "polite"}
    >
      <span className="status-toast-icon">
        {props.loading && props.tone === "normal" ? <Loader2 className="spin" size={19} /> : <Icon size={19} />}
      </span>
      <span>{props.message}</span>
      <button className="icon-button" onClick={props.onClose} title="关闭提示" aria-label="关闭提示">
        <X size={15} />
      </button>
    </div>
  );
}

function ExportResultNotice(props: {
  notice: ExportNotice;
  onClose: () => void;
}) {
  const noticeRef = useRef<HTMLDivElement>(null);
  const isSuccess = props.notice.tone === "success";

  useGSAP(
    () => {
      const notice = noticeRef.current;
      if (!notice) return;
      const reduceMotion = prefersReducedMotion();
      gsap.from(notice, {
        x: reduceMotion ? 0 : 24,
        y: reduceMotion ? 0 : -8,
        autoAlpha: 0,
        duration: reduceMotion ? 0.12 : 0.3,
        ease: "power2.out",
        clearProps: "transform,opacity,visibility"
      });
    },
    { scope: noticeRef, dependencies: [props.notice] }
  );

  return (
    <div
      ref={noticeRef}
      className={`export-result-notice export-result-notice-${props.notice.tone}`}
      role={isSuccess ? "status" : "alert"}
      aria-live={isSuccess ? "polite" : "assertive"}
    >
      <span className="export-result-notice-icon" aria-hidden="true">
        {isSuccess ? <Check size={30} strokeWidth={2.6} /> : <CircleAlert size={30} strokeWidth={2.2} />}
      </span>
      <span className="export-result-notice-divider" />
      <span className="export-result-notice-copy">
        <strong>{props.notice.title}</strong>
        <span>
          {props.notice.message}
          {props.notice.detail ? <em>{props.notice.detail}</em> : null}
        </span>
      </span>
      <button className="export-result-notice-close" onClick={props.onClose} title="关闭提示" aria-label="关闭提示">
        <X size={22} />
      </button>
    </div>
  );
}

function AnimatedConfigPanel(props: {
  children: ReactNode;
  panelKey: string;
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const panel = panelRef.current;
      if (!panel) return;
      const reduceMotion = prefersReducedMotion();
      gsap.from(panel, {
        y: reduceMotion ? 0 : -8,
        autoAlpha: 0,
        duration: reduceMotion ? 0.12 : 0.24,
        ease: "power2.out",
        overwrite: "auto"
      });
      const items = panel.querySelectorAll<HTMLElement>(".config-panel-animate-item");
      if (items.length > 0 && !reduceMotion) {
        gsap.from(items, {
          y: 8,
          duration: 0.24,
          stagger: 0.025,
          ease: "power2.out",
          overwrite: "auto",
          clearProps: "transform"
        });
      }
    },
    { scope: panelRef, dependencies: [props.panelKey] }
  );

  return (
    <div ref={panelRef} className={`config-panel-shell ${props.className ?? ""}`}>
      {props.children}
    </div>
  );
}

function ResultGridMotion(props: {
  signature: string;
  children: ReactNode;
  className?: string;
}) {
  const gridRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const grid = gridRef.current;
      if (!grid) return;
      const items = grid.querySelectorAll<HTMLElement>(".result-enter");
      if (items.length === 0) return;
      const reduceMotion = prefersReducedMotion();
      gsap.from(items, {
        y: reduceMotion ? 0 : 12,
        autoAlpha: 0,
        scale: reduceMotion ? 1 : 0.985,
        duration: reduceMotion ? 0.12 : 0.34,
        stagger: reduceMotion ? 0 : 0.035,
        ease: "power2.out",
        overwrite: "auto"
      });
    },
    { scope: gridRef, dependencies: [props.signature] }
  );

  return (
    <div ref={gridRef} className={props.className ?? "result-grid"}>
      {props.children}
    </div>
  );
}

function ResultEmptyState(props: { mediaType: MediaType }) {
  return (
    <div className="result-empty-state">
      <span className="result-empty-visual" aria-hidden="true">
        {props.mediaType === "video" ? <Video size={50} strokeWidth={1.6} /> : <Images size={50} strokeWidth={1.6} />}
        <Sparkles size={22} strokeWidth={1.8} />
      </span>
      <strong>等待生成结果</strong>
      <p>生成完成后将在这里展示，可一键导出全部结果</p>
    </div>
  );
}

function ImageQuickConfigPanel(props: {
  openPanel: ImageConfigPanel | null;
  providerId: ProviderId;
  modelId: string;
  modelOptions: ImageModelOption[];
  keyStatus: SecretStatus[];
  aspectRatio: AspectRatio;
  outputCount: number;
  onTogglePanel: (panel: ImageConfigPanel) => void;
  onModelSelect: (model: ImageModelOption) => void;
  onAspectRatioSelect: (ratio: AspectRatio) => void;
  onOutputCountSelect: (count: number) => void;
  onInvalidInput: (message: string) => void;
  onOpenSettings: () => void;
}) {
  const currentModelName = getModelDisplayName(props.providerId, props.modelId);

  return (
    <section className="quick-config-panel image-quick-config-panel">
      <div className="quick-config-toolbar" aria-label="图片生成配置">
        <button className={props.openPanel === "model" ? "active" : ""} onClick={() => props.onTogglePanel("model")}>
          <Box size={18} />
          <span>{uiText.model}</span>
          <small>{currentModelName}</small>
          {props.openPanel === "model" ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        <button className={props.openPanel === "ratio" ? "active" : ""} onClick={() => props.onTogglePanel("ratio")}>
          <MapPin size={18} />
          <span>比例</span>
          <small>{props.aspectRatio}</small>
          {props.openPanel === "ratio" ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        <button className={props.openPanel === "count" ? "active" : ""} onClick={() => props.onTogglePanel("count")}>
          <Images size={18} />
          <span>{uiText.outputCount}</span>
          <small>{props.outputCount}张</small>
          {props.openPanel === "count" ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>
      {props.openPanel ? (
        <AnimatedConfigPanel panelKey={`image-${props.openPanel}`}>
          {props.openPanel === "model" ? (
            <ConfigPanelHeading
              title={uiText.model}
              onCollapse={() => props.onTogglePanel("model")}
              onOpenSettings={props.onOpenSettings}
            />
          ) : null}
          {props.openPanel === "model" ? (
            <div className="config-model-picker image-config-model-picker">
              <div className="config-model-grid">
                {props.modelOptions.map((option) => {
                  const active = props.providerId === option.providerId && props.modelId === option.modelId;
                  const configured = props.keyStatus.find((item) => item.providerId === option.providerId)?.configured;
                  return (
                    <ModelOptionCard
                      key={`${option.providerId}:${option.modelId}`}
                      providerId={option.providerId}
                      displayName={option.displayName}
                      active={active}
                      configured={Boolean(configured)}
                      onClick={() => props.onModelSelect(option)}
                    />
                  );
                })}
              </div>
            </div>
          ) : null}
          {props.openPanel === "ratio" ? (
            <div className="config-selection-layout ratio-selection-layout">
              <AspectRatioOptionGrid
                options={aspectRatios}
                value={props.aspectRatio}
                onSelect={props.onAspectRatioSelect}
              />
              <ManualAspectRatioInput
                value={props.aspectRatio}
                onCommit={props.onAspectRatioSelect}
                onInvalid={props.onInvalidInput}
              />
            </div>
          ) : null}
          {props.openPanel === "count" ? (
            <div className="config-selection-layout count-selection-layout">
              <OutputCountOptionGrid value={props.outputCount} onSelect={props.onOutputCountSelect} />
              <ManualOutputCountInput value={props.outputCount} onCommit={props.onOutputCountSelect} />
            </div>
          ) : null}
        </AnimatedConfigPanel>
      ) : null}
    </section>
  );
}

function ConfigPanelHeading(props: {
  title: string;
  onCollapse: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <div className="config-panel-heading">
      <span className="config-panel-title">{props.title}</span>
      <span className="config-panel-heading-actions">
        <button className="icon-button" onClick={props.onCollapse} title="收起">
          <ChevronUp size={18} />
        </button>
        <button className="icon-button" onClick={props.onOpenSettings} title={uiText.apiKeys}>
          <Settings size={18} />
        </button>
      </span>
    </div>
  );
}

function ModelOptionCard(props: {
  providerId: ProviderId;
  displayName: string;
  active: boolean;
  configured: boolean;
  onClick: () => void;
}) {
  const [tooltipPosition, setTooltipPosition] = useState<{ left: number; top: number } | null>(null);
  const nameRef = useRef<HTMLElement>(null);

  function showTooltip(event: MouseEvent<HTMLButtonElement>) {
    const name = nameRef.current;
    if (!name || name.scrollWidth <= name.clientWidth) {
      setTooltipPosition(null);
      return;
    }
    const maxLeft = Math.max(8, window.innerWidth - 328);
    const maxTop = Math.max(8, window.innerHeight - 54);
    setTooltipPosition({
      left: Math.max(8, Math.min(event.clientX, maxLeft)),
      top: Math.max(8, Math.min(event.clientY, maxTop))
    });
  }

  return (
    <>
      <button
        className={`config-model-card config-panel-animate-item ${props.active ? "active" : ""}`}
        onClick={props.onClick}
        onMouseEnter={showTooltip}
        onMouseMove={showTooltip}
        onMouseLeave={() => setTooltipPosition(null)}
        aria-label={props.displayName}
      >
        <ProviderLogo providerId={props.providerId} compact />
        <strong ref={nameRef}>{props.displayName}</strong>
        <span className="config-model-access" title={props.configured ? "接口已配置" : "需要配置接口密钥"}>
          {props.configured ? <Check size={17} /> : <KeyRound size={17} />}
        </span>
        {props.active ? (
          <span className="config-selected-badge">
            <Check size={16} />
          </span>
        ) : null}
      </button>
      {tooltipPosition
        ? createPortal(
            <span className="model-name-tooltip" style={tooltipPosition} role="tooltip">
              {props.displayName}
            </span>,
            document.body
          )
        : null}
    </>
  );
}

function AspectRatioOptionGrid(props: {
  options: readonly AspectRatio[];
  value: AspectRatio;
  onSelect: (value: AspectRatio) => void;
}) {
  return (
    <div className="config-choice-grid aspect-ratio-choice-grid">
      {props.options.map((option) => {
        const active = props.value === option;
        return (
          <button
            key={option}
            className={`config-choice-card config-panel-animate-item ${active ? "active" : ""}`}
            onClick={() => props.onSelect(option)}
          >
            <AspectRatioGlyph ratio={option} />
            <strong>{option}</strong>
            {active ? (
              <span className="config-selected-badge">
                <Check size={16} />
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function AspectRatioGlyph({ ratio }: { ratio: AspectRatio }) {
  const [width, height] = ratio.split(":").map(Number);
  const numericRatio = width > 0 && height > 0 ? width / height : 1;
  if (numericRatio > 1.2) return <RectangleHorizontal size={38} strokeWidth={1.8} />;
  if (numericRatio < 0.82) return <RectangleVertical size={38} strokeWidth={1.8} />;
  return <Square size={38} strokeWidth={1.8} />;
}

function OutputCountOptionGrid(props: {
  value: number;
  onSelect: (value: number) => void;
}) {
  return (
    <div className="config-choice-grid output-count-choice-grid">
      {[1, 2, 3, 4].map((option) => {
        const active = props.value === option;
        return (
          <button
            key={option}
            className={`config-choice-card config-panel-animate-item ${active ? "active" : ""}`}
            onClick={() => props.onSelect(option)}
          >
            <strong>{option}张</strong>
            {active ? (
              <span className="config-selected-badge">
                <Check size={16} />
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function ManualAspectRatioInput(props: {
  value: AspectRatio;
  allowedOptions?: readonly AspectRatio[];
  onCommit: (value: AspectRatio) => void;
  onInvalid: (message: string) => void;
}) {
  const [draftValue, setDraftValue] = useState(props.value);

  useEffect(() => {
    setDraftValue(props.value);
  }, [props.value]);

  function commit() {
    const normalized = normalizeAspectRatioInput(draftValue);
    if (!normalized) {
      props.onInvalid("比例格式不正确，请输入类似 1:1、4:5、16:9 的宽高比。");
      setDraftValue(props.value);
      return;
    }
    if (props.allowedOptions?.length && !props.allowedOptions.includes(normalized)) {
      props.onInvalid(`当前模型仅支持：${props.allowedOptions.join("、")}`);
      setDraftValue(props.value);
      return;
    }
    props.onCommit(normalized);
  }

  return (
    <label className="manual-config-input config-panel-animate-item">
      <span>手动比例</span>
      <input
        value={draftValue}
        placeholder="例如 16:9"
        onChange={(event) => setDraftValue(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}

function ManualOutputCountInput(props: {
  value: number;
  onCommit: (value: number) => void;
}) {
  const [draftValue, setDraftValue] = useState(String(props.value));

  useEffect(() => {
    setDraftValue(String(props.value));
  }, [props.value]);

  function commit() {
    const nextValue = clampOutputCount(Number.parseInt(draftValue, 10));
    setDraftValue(String(nextValue));
    props.onCommit(nextValue);
  }

  return (
    <label className="manual-config-input config-panel-animate-item">
      <span>手动张数</span>
      <input
        type="number"
        min={1}
        max={4}
        value={draftValue}
        onChange={(event) => setDraftValue(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}

function VideoDurationInput(props: {
  value: number;
  onChange: (value: number) => void;
  onCommit: () => void;
}) {
  const [draftValue, setDraftValue] = useState(String(props.value));

  useEffect(() => {
    setDraftValue(String(props.value));
  }, [props.value]);

  function commit(value: string) {
    const nextValue = clampVideoDuration(Number.parseInt(value, 10));
    props.onChange(nextValue);
    setDraftValue(String(nextValue));
    props.onCommit();
  }

  return (
    <div className="video-duration-control config-panel-animate-item">
      <label className="duration-range-field">
        <span>视频时长</span>
        <input
          type="range"
          min={1}
          max={15}
          value={props.value}
          onChange={(event) => {
            const nextValue = clampVideoDuration(Number.parseInt(event.target.value, 10));
            props.onChange(nextValue);
            setDraftValue(String(nextValue));
          }}
          onPointerUp={() => props.onCommit()}
          onKeyUp={(event) => {
            if (event.key === "Enter") props.onCommit();
          }}
        />
        <small>1-15 秒</small>
      </label>
      <label className="duration-number-field">
        <span>手动时长</span>
        <input
          type="number"
          min={1}
          max={15}
          value={draftValue}
          onChange={(event) => {
            const nextValue = event.target.value;
            setDraftValue(nextValue);
            const numericValue = Number.parseInt(nextValue, 10);
            if (!Number.isNaN(numericValue)) {
              props.onChange(clampVideoDuration(numericValue));
            }
          }}
          onBlur={() => commit(draftValue)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
        />
        <small>秒</small>
      </label>
    </div>
  );
}

function VideoGenerationPage(props: {
  activeImage: ImportedImage | null;
  importedImages: ImportedImage[];
  providerId: ProviderId;
  modelId: string;
  modelOptions: VideoModelMetadata[];
  aspectRatioOptions: AspectRatio[];
  durationOptions: number[];
  keyStatus: SecretStatus[];
  prompt: string;
  aspectRatio: AspectRatio;
  durationSeconds: number;
  estimatedCost: number;
  wallet: WalletSummary | null;
  supported: boolean;
  setupWarning: string;
  workflowSteps: WorkflowStepState[];
  progress: VideoProgress | null;
  job: VideoGenerationJob | null;
  layout: WorkspaceLayoutSize;
  dragActive: boolean;
  selectedPresetId: PresetId;
  isGenerating: boolean;
  isExporting: boolean;
  canGenerate: boolean;
  galleryPaths: Set<string>;
  onSelectImage: () => void;
  onSelectImagePath: (path: string) => void;
  onPreviewImage: (image: ImportedImage) => void;
  onDeleteImage: (path: string) => void;
  onClearImages: () => void;
  onDragActiveChange: (active: boolean) => void;
  onDropFiles: (files: FileList | null) => void;
  onModelSelect: (model: VideoModelMetadata) => void;
  onPromptChange: (prompt: string) => void;
  onPresetSelect: (presetId: PresetId) => void;
  onAspectRatioChange: (ratio: AspectRatio) => void;
  onDurationChange: (value: number) => void;
  onInvalidInput: (message: string) => void;
  onOpenSettings: () => void;
  onLayoutChange: (layout: WorkspaceLayoutSize) => void;
  onGenerate: () => void;
  onCancel: () => void;
  onAddToGallery: (result: VideoGenerationResult) => void;
  onPreviewVideo: (result: VideoGenerationResult) => void;
  onExport: (videoPath: string) => void;
  onExportAll: () => void;
  onDelete: (result: VideoGenerationResult) => void;
}) {
  const configured = props.keyStatus.find((item) => item.providerId === props.providerId)?.configured ?? false;
  const hasEnoughCredits = (props.wallet?.balanceCents ?? 0) >= props.estimatedCost;
  const currentModelName = getVideoModelDisplayName(props.providerId, props.modelId);
  const [openConfigPanel, setOpenConfigPanel] = useState<VideoConfigPanel | null>(null);

  function toggleConfigPanel(panel: VideoConfigPanel) {
    setOpenConfigPanel((current) => (current === panel ? null : panel));
  }

  return (
    <main className="page-workspace video-workspace-page">
      <header className="page-header">
        <div>
          <h2>{uiText.videoPage}</h2>
          <p>
            {providerConfigs[props.providerId].displayName} / {currentModelName}
            {!configured ? ` / ${uiText.configureKeyFirst}` : ""}
            {props.setupWarning ? ` / ${props.setupWarning}` : ""}
            {!hasEnoughCredits ? ` / ${uiText.insufficientBalance}` : ""}
          </p>
        </div>
        <div className="page-header-actions">
          {props.isGenerating ? (
            <button className="secondary-button" onClick={props.onCancel}>
              <Square size={15} />
              {uiText.cancel}
            </button>
          ) : null}
          <GenerateActionButton
            loading={props.isGenerating}
            disabled={!props.canGenerate}
            onClick={props.onGenerate}
            label={uiText.generateVideo}
            cost={formatUsdCents(props.estimatedCost)}
          />
        </div>
      </header>

      <WorkflowRibbon steps={props.workflowSteps} busy={props.isGenerating || props.isExporting} />

      <ResizableWorkspace
        className="video-resizable-workspace"
        layout={props.layout}
        onLayoutChange={props.onLayoutChange}
      >
        <section
          className={`upload-surface video-upload-surface ${props.dragActive ? "drag-active" : ""} ${props.activeImage ? "has-image" : "is-empty"}`}
          onDragEnter={(event) => {
            event.preventDefault();
            props.onDragActiveChange(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            props.onDragActiveChange(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            props.onDragActiveChange(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            props.onDragActiveChange(false);
            props.onDropFiles(event.dataTransfer.files);
          }}
        >
          {props.activeImage ? (
            <div className="image-workbench">
              <button className="image-preview-button" onClick={props.onSelectImage} title={uiText.clickImageToAdd}>
                <img src={props.activeImage.previewDataUrl} alt="Product source" />
              </button>
              <div className="image-toolbar">
                <span>{props.importedImages.length} {uiText.imagesCount}</span>
                <button className="secondary-button" onClick={() => props.activeImage && props.onPreviewImage(props.activeImage)}>
                  <ZoomIn size={16} />
                  {uiText.previewCurrentImage}
                </button>
                <button className="secondary-button" onClick={props.onSelectImage}>
                  <Upload size={17} />
                  {uiText.addImages}
                </button>
                <button className="secondary-button" onClick={props.onClearImages}>
                  <Trash2 size={16} />
                  {uiText.clearImages}
                </button>
              </div>
              <div className="image-queue">
                {props.importedImages.map((image, index) => (
                  <button
                    key={image.sourceImagePath}
                    className={image.sourceImagePath === props.activeImage?.sourceImagePath ? "active" : ""}
                    onClick={() => props.onSelectImagePath(image.sourceImagePath)}
                  >
                    <img src={image.previewDataUrl} alt={`Product ${index + 1}`} />
                    <span>{index + 1}</span>
                    <i
                      onClick={(event) => {
                        event.stopPropagation();
                        props.onDeleteImage(image.sourceImagePath);
                      }}
                      title={uiText.deleteImage}
                    >
                      <X size={13} />
                    </i>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="upload-empty">
              <button className="upload-empty-visual" onClick={props.onSelectImage}>
                <img src={workflowStudioIllustrationUrl} alt="" />
                <div className="upload-empty-action">
                  <ImagePlus size={28} />
                </div>
              </button>
              <strong>{uiText.clickOrDragUpload}</strong>
              <p>支持 JPG / PNG / WebP 格式，单张图片 ≤ 20MB</p>
              <button className="primary-button" onClick={props.onSelectImage}>
                <Upload size={17} />
                {uiText.addImages}
              </button>
            </div>
          )}
        </section>

        <section className="video-control-panel">
          <section className="quick-config-panel video-quick-config-panel">
            <div className="quick-config-toolbar video-config-toolbar" aria-label="视频生成配置">
              <button className={openConfigPanel === "model" ? "active" : ""} onClick={() => toggleConfigPanel("model")}>
                <Box size={18} />
                <span>模型</span>
                <small>{currentModelName}</small>
                {openConfigPanel === "model" ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              <button className={openConfigPanel === "ratio" ? "active" : ""} onClick={() => toggleConfigPanel("ratio")}>
                <MapPin size={18} />
                <span>比例</span>
                <small>{props.aspectRatio}</small>
                {openConfigPanel === "ratio" ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              <button className={openConfigPanel === "duration" ? "active" : ""} onClick={() => toggleConfigPanel("duration")}>
                <Clock3 size={18} />
                <span>自动时长</span>
                <small>{props.durationSeconds}s</small>
                {openConfigPanel === "duration" ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
            {openConfigPanel ? (
              <AnimatedConfigPanel panelKey={`video-${openConfigPanel}`} className="video-config-panel">
                {openConfigPanel === "model" ? (
                  <>
                    <ConfigPanelHeading
                      title="模型"
                      onCollapse={() => setOpenConfigPanel(null)}
                      onOpenSettings={props.onOpenSettings}
                    />
                    <div className="config-model-picker video-config-model-picker">
                      <div className="config-model-grid">
                      {props.modelOptions.map((option) => {
                        const active = props.providerId === option.providerId && props.modelId === option.modelId;
                        const configured = props.keyStatus.find((item) => item.providerId === option.providerId)?.configured;
                        return (
                          <ModelOptionCard
                            key={`${option.providerId}:${option.modelId}`}
                            providerId={option.providerId}
                            displayName={option.displayName}
                            active={active}
                            configured={Boolean(configured)}
                            onClick={() => {
                              props.onModelSelect(option);
                              setOpenConfigPanel(null);
                            }}
                          />
                        );
                      })}
                      </div>
                    </div>
                  </>
                ) : null}
                {openConfigPanel === "ratio" ? (
                  <div className="config-selection-layout ratio-selection-layout">
                    <AspectRatioOptionGrid
                      options={props.aspectRatioOptions}
                      value={props.aspectRatio}
                      onSelect={(ratio) => {
                        props.onAspectRatioChange(ratio);
                        setOpenConfigPanel(null);
                      }}
                    />
                    <ManualAspectRatioInput
                      value={props.aspectRatio}
                      allowedOptions={props.aspectRatioOptions}
                      onCommit={(ratio) => {
                        props.onAspectRatioChange(ratio);
                        setOpenConfigPanel(null);
                      }}
                      onInvalid={props.onInvalidInput}
                    />
                  </div>
                ) : null}
                {openConfigPanel === "duration" ? (
                  <VideoDurationInput
                    value={props.durationSeconds}
                    onChange={props.onDurationChange}
                    onCommit={() => setOpenConfigPanel(null)}
                  />
                ) : null}
              </AnimatedConfigPanel>
            ) : null}
          </section>

          <section className="prompt-panel video-prompt-panel">
            <div className="section-title">
              <span>{uiText.videoPrompt}</span>
            </div>
            <label className="prompt-single-field">
              <span>提示词</span>
              <textarea
                value={props.prompt}
                maxLength={900}
                placeholder={uiText.videoPromptPlaceholder}
                onChange={(event) => props.onPromptChange(event.target.value)}
              />
            </label>
          </section>
          <section className="template-panel video-template-panel">
            <div className="section-title">
              <span>提示词模板</span>
              <small>{getPresetName(props.selectedPresetId)}</small>
            </div>
            <div className="preset-list">
              {productShotPresets.map((preset) => (
                <button
                  key={preset.id}
                  className={`preset-item ${props.selectedPresetId === preset.id ? "selected" : ""}`}
                  onClick={() => props.onPresetSelect(preset.id)}
                  title={preset.prompt || preset.description}
                >
                  <div>
                    <strong>{preset.name}</strong>
                    <span>{preset.description}</span>
                  </div>
                  {props.selectedPresetId === preset.id ? <Check size={15} /> : null}
                </button>
              ))}
            </div>
          </section>
          {props.setupWarning ? <div className="auth-message">{props.setupWarning}</div> : null}
          {props.progress ? <div className="status-line"><span>{props.progress.message}</span></div> : null}
        </section>

      <section className={`result-band video-result-band unified-result-band ${props.job?.errors.length ? "has-errors" : ""}`}>
        <div className="section-title result-section-title">
          <span>生成结果</span>
          <div className="section-actions">
            {props.job?.errors.length ? <span className="error-count">{props.job.errors.length} {uiText.errors}</span> : null}
            <button
              className="secondary-button compact-button result-export-all-button"
              onClick={props.onExportAll}
              disabled={!props.job?.results.length || props.isExporting}
            >
              {props.isExporting ? <Loader2 className="spin" size={14} /> : <Download size={14} />}
              导出全部
            </button>
          </div>
        </div>
        {props.job?.errors.length ? <FailurePanel job={props.job} /> : null}
        {props.job?.results.length ? (
          <ResultGridMotion signature={props.job.results.map((result) => result.videoPath).join("|")}>
            {props.job.results.map((result) => (
              <figure key={result.videoPath} className="result-tile video-result-card result-enter">
                <button className="result-image-button video-preview-button" onClick={() => props.onPreviewVideo(result)}>
                  <video src={window.productStudio.toFileUrl(result.videoPath)} muted preload="metadata" />
                  <span className="video-preview-play">
                    <Play size={16} />
                  </span>
                </button>
                <figcaption className="result-actions-only">
                  <button
                    className={`icon-button ${props.galleryPaths.has(result.videoPath) ? "active" : ""}`}
                    onClick={() => props.onAddToGallery(result)}
                    title={props.galleryPaths.has(result.videoPath) ? "已在个人图库" : "加入个人图库"}
                  >
                    {props.galleryPaths.has(result.videoPath) ? <Check size={14} /> : <FolderPlus size={14} />}
                  </button>
                  <button
                    className="icon-button"
                    onClick={() => props.onExport(result.videoPath)}
                    disabled={props.isExporting}
                    title={uiText.exportVideo}
                  >
                    {props.isExporting ? <Loader2 className="spin" size={14} /> : <Download size={14} />}
                  </button>
                  <button className="icon-button danger" onClick={() => props.onDelete(result)} title="删除结果">
                    <Trash2 size={14} />
                  </button>
                </figcaption>
              </figure>
            ))}
          </ResultGridMotion>
        ) : (
          <div className="result-grid">
            <ResultEmptyState mediaType="video" />
          </div>
        )}
      </section>
      </ResizableWorkspace>
    </main>
  );
}

function ProviderLogo(props: { providerId: ProviderId; compact?: boolean }) {
  const brand = providerBrandMeta[props.providerId];
  return (
    <span
      className={`provider-logo provider-logo-${props.providerId} ${props.compact ? "compact" : ""}`}
      aria-label={`${brand.label} Logo 占位`}
    >
      <b>{brand.mark}</b>
      {props.compact ? null : <small>{brand.shortName}</small>}
    </span>
  );
}

function ResizableWorkspace(props: {
  className?: string;
  layout: WorkspaceLayoutSize;
  onLayoutChange: (layout: WorkspaceLayoutSize) => void;
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panes = Children.toArray(props.children).filter((child) => typeof child !== "string" || child.trim());
  const [sourcePane, configPane, resultPane] = panes;
  const style = {
    "--workspace-split": `${props.layout.splitPercent}%`,
    "--workspace-result-height": `${props.layout.resultHeight}px`
  } as CSSProperties;

  function startResize(axis: "column" | "row", event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const root = rootRef.current;
    if (!root) return;
    root.classList.add("is-resizing");

    const handleMove = (moveEvent: globalThis.PointerEvent) => {
      const rect = root.getBoundingClientRect();
      if (axis === "column") {
        const splitPercent = ((moveEvent.clientX - rect.left) / Math.max(rect.width, 1)) * 100;
        props.onLayoutChange({ ...props.layout, splitPercent });
        return;
      }
      const resultHeight = rect.bottom - moveEvent.clientY;
      props.onLayoutChange({ ...props.layout, resultHeight });
    };

    const stopResize = () => {
      root.classList.remove("is-resizing");
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", stopResize);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", stopResize);
  }

  return (
    <div ref={rootRef} className={`resizable-workspace ${props.className ?? ""}`} style={style}>
      <div className="resizable-main-row">
        <div className="resizable-pane resizable-source-pane">{sourcePane}</div>
        <div
          className="workspace-resize-handle workspace-resize-handle-column"
          role="separator"
          aria-orientation="vertical"
          onPointerDown={(event) => startResize("column", event)}
        />
        <div className="resizable-pane resizable-config-pane">{configPane}</div>
      </div>
      <div
        className="workspace-resize-handle workspace-resize-handle-row"
        role="separator"
        aria-orientation="horizontal"
        onPointerDown={(event) => startResize("row", event)}
      />
      <div className="resizable-pane resizable-result-pane">{resultPane}</div>
    </div>
  );
}

function SegmentedControl<T extends string>(props: {
  items: T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="segmented">
      {props.items.map((item) => (
        <button key={item} className={props.value === item ? "active" : ""} onClick={() => props.onChange(item)}>
          {item}
        </button>
      ))}
    </div>
  );
}

function OutputDropdown(props: {
  value: string;
  options: string[];
  customLabel: string;
  inputType: "text" | "number";
  placeholder: string;
  customValue?: string;
  min?: number;
  max?: number;
  onChange: (value: string) => void;
  onCustomChange?: (value: string) => void;
}) {
  const customValue = props.customValue ?? props.value;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function closeOnOutsidePointer(event: globalThis.PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [open]);

  return (
    <div className="output-dropdown" ref={rootRef}>
      <button className="output-dropdown-value" type="button">
        {props.value}
      </button>
      <details
        className="output-dropdown-menu"
        open={open}
        onToggle={(event) => setOpen(event.currentTarget.open)}
      >
        <summary
          title="展开选项"
          onClick={(event) => {
            event.preventDefault();
            setOpen((current) => !current);
          }}
        >
          <ChevronDown size={15} />
        </summary>
        <div className="output-dropdown-panel">
          {props.options.map((option) => (
            <button
              key={option}
              type="button"
              className={props.value === option ? "active" : ""}
              onClick={() => {
                props.onChange(option);
                setOpen(false);
              }}
            >
              {option}
            </button>
          ))}
          <label>
            <span>{props.customLabel}</span>
            <input
              type={props.inputType}
              min={props.min}
              max={props.max}
              value={customValue}
              placeholder={props.placeholder}
              onChange={(event) => (props.onCustomChange ?? props.onChange)(event.target.value)}
            />
          </label>
        </div>
      </details>
    </div>
  );
}

function gateWorkflowSteps(steps: WorkflowStepState[]): WorkflowStepState[] {
  let blocked = false;
  return steps.map((step) => {
    if (blocked) {
      return { ...step, done: false, active: false };
    }
    const nextStep = { ...step, active: step.active && !step.done };
    if (!nextStep.done) {
      blocked = true;
    }
    return nextStep;
  });
}

function WorkflowRibbon(props: {
  steps: WorkflowStepState[];
  busy: boolean;
}) {
  return (
    <section className={`workflow-ribbon ${props.busy ? "busy" : ""}`}>
      {props.steps.map((step, index) => (
        <div
          key={step.label}
          className={`workflow-step ${step.done ? "done" : ""} ${step.active ? "active" : ""}`}
        >
          <span className="workflow-number">{index + 1}</span>
          <div>
            <strong>{step.label}</strong>
            <small>{step.description}</small>
          </div>
          <span className="workflow-check">
            {step.done ? (
              <>
                <Check size={15} />
                <b>已完成</b>
              </>
            ) : step.active ? (
              <b>进行中</b>
            ) : (
              <b>待处理</b>
            )}
          </span>
        </div>
      ))}
    </section>
  );
}

function PresetState({ status }: { status?: GenerateProgress["status"] }) {
  if (status === "running") return <Loader2 className="spin" size={17} />;
  if (status === "completed") return <Check size={17} />;
  if (status === "failed") return <AlertCircle size={17} />;
  if (status === "canceled") return <Square size={14} />;
  return <span className="state-dot" />;
}

function getFailedPresetIds(job: ProductShotJob | null): PresetId[] {
  if (!job) return [];
  return Array.from(
    new Set(
      job.errors
        .map((error) => error.presetId)
        .filter((presetId): presetId is PresetId => Boolean(presetId))
    )
  );
}

function clampOutputCount(value: number): number {
  return Math.min(4, Math.max(1, Math.floor(Number(value) || 1)));
}

function normalizeAspectRatioInput(value: string): AspectRatio | null {
  const normalized = value.trim().replace(/：/g, ":").replace(/\s+/g, "");
  const match = normalized.match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  return `${match[1]}:${match[2]}`;
}

function clampMascotMotion(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

type RobotEyeOffset = {
  x: number;
  y: number;
};

function AuthRobotMascot(props: {
  isTyping: boolean;
  showPassword: boolean;
  passwordLength: number;
}) {
  const mascotRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const latestPointerRef = useRef({ x: 0, y: 0 });
  const [eyeOffset, setEyeOffset] = useState<RobotEyeOffset>({ x: 0, y: 0 });
  const reducedMotion = prefersReducedMotion();
  const hasPassword = props.passwordLength > 0;
  const hidingPassword = hasPassword && !props.showPassword;
  const peekingPassword = hasPassword && props.showPassword;

  useEffect(() => {
    if (reducedMotion) return;

    function updateEyeOffset() {
      frameRef.current = null;
      const rect = mascotRef.current?.getBoundingClientRect();
      if (!rect) return;

      const centerX = rect.left + rect.width * 0.52;
      const centerY = rect.top + rect.height * 0.44;
      const deltaX = latestPointerRef.current.x - centerX;
      const deltaY = latestPointerRef.current.y - centerY;

      setEyeOffset({
        x: clampMascotMotion(deltaX / 54, -4, 4),
        y: clampMascotMotion(deltaY / 68, -3, 3)
      });
    }

    function handleMouseMove(event: globalThis.MouseEvent) {
      latestPointerRef.current = { x: event.clientX, y: event.clientY };
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(updateEyeOffset);
    }

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [reducedMotion]);

  let directedEyeOffset = eyeOffset;
  if (reducedMotion) {
    directedEyeOffset = { x: 0, y: 0 };
  } else if (peekingPassword) {
    directedEyeOffset = { x: 4, y: -3 };
  } else if (hidingPassword) {
    directedEyeOffset = { x: -4, y: 3 };
  } else if (props.isTyping) {
    directedEyeOffset = { x: -3, y: -2 };
  }

  return (
    <div
      ref={mascotRef}
      className={`auth-robot-mascot ${props.isTyping ? "is-typing" : ""} ${hidingPassword ? "is-hiding-password" : ""} ${peekingPassword ? "is-peeking-password" : ""}`}
      aria-hidden="true"
    >
      <img src={authRobotMascotUrl} alt="" />
      <div className="auth-robot-face-mask">
        <span
          className="auth-robot-eye left"
          style={{ transform: `translate(${directedEyeOffset.x}px, ${directedEyeOffset.y}px)` }}
        />
        <span
          className="auth-robot-eye right"
          style={{ transform: `translate(${directedEyeOffset.x}px, ${directedEyeOffset.y}px)` }}
        />
      </div>
    </div>
  );
}

function AuthScreen(props: {
  rememberedSession: AuthSession | null;
  onAuthenticate: (mode: "login" | "signup", username: string, password: string) => Promise<void>;
  onResume: () => void;
}) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberPassword, setRememberPassword] = useState(false);
  const [isAuthTyping, setIsAuthTyping] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void loadSavedAuthCredentials();
  }, []);

  async function loadSavedAuthCredentials() {
    const savedCredentials = await window.productStudio.getSavedAuthCredentials();
    if (!savedCredentials) return;
    setMode("login");
    setUsername(savedCredentials.username);
    setPassword(savedCredentials.password ?? "");
    setRememberPassword(savedCredentials.rememberPassword);
  }

  async function submit() {
    setBusy(true);
    setMessage("");
    try {
      await props.onAuthenticate(mode, username, password);
      if (rememberPassword) {
        await window.productStudio.saveAuthCredentials({
          username,
          password,
          rememberPassword: true
        });
      } else if (username.trim()) {
        await window.productStudio.saveAuthCredentials({
          username,
          rememberPassword: false
        });
      } else {
        await window.productStudio.clearSavedAuthCredentials();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : uiText.generationFailed);
    } finally {
      setBusy(false);
    }
  }

  function updateSideFeatureTilt(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetX = (event.clientX - rect.left) / rect.width - 0.5;
    const offsetY = (event.clientY - rect.top) / rect.height - 0.5;
    event.currentTarget.style.setProperty("--tilt-x", `${clampMascotMotion(-offsetY * 8, -4, 4)}deg`);
    event.currentTarget.style.setProperty("--tilt-y", `${clampMascotMotion(offsetX * 10, -5, 5)}deg`);
    event.currentTarget.style.setProperty("--glow-x", `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty("--glow-y", `${event.clientY - rect.top}px`);
  }

  function resetSideFeatureTilt(event: MouseEvent<HTMLDivElement>) {
    event.currentTarget.style.setProperty("--tilt-x", "0deg");
    event.currentTarget.style.setProperty("--tilt-y", "0deg");
    event.currentTarget.style.setProperty("--glow-x", "50%");
    event.currentTarget.style.setProperty("--glow-y", "50%");
  }

  const sideFeatures = [
    {
      title: "AI Enhance",
      description: "Smart image enhancement",
      icon: <ImagePlus size={31} />
    },
    {
      title: "Pro Tools",
      description: "Advanced editing features",
      icon: <Settings size={31} />
    },
    {
      title: "Creative Filters",
      description: "Unique styles and effects",
      icon: <LayoutGrid size={31} />
    }
  ];

  return (
    <div className="auth-shell">
      <aside className="auth-side photo-auth-side">
        <img className="auth-side-background" src={authStudioBackgroundUrl} alt="" />
        <div className="auth-side-copy">
          <span>Create</span>
          <h2>Stunning Photos<br />Effortlessly</h2>
          <i />
          <p>Professional-grade editing tools<br />for every creator.</p>
        </div>
        <div className="auth-side-feature-stack" aria-label="Product Shot Studio features">
          {sideFeatures.map((feature) => (
            <div
              className="auth-side-feature-card"
              key={feature.title}
              onMouseMove={updateSideFeatureTilt}
              onMouseLeave={resetSideFeatureTilt}
            >
              <div className="auth-side-feature-icon">{feature.icon}</div>
              <div>
                <strong>{feature.title}</strong>
                <span>{feature.description}</span>
              </div>
            </div>
          ))}
        </div>
      </aside>
      <section className="auth-panel">
        <div className="auth-panel-inner">
          <header className="auth-top-frame">
            <div className="auth-brand-lockup">
              <div className="brand-mark">
                <Sparkles size={18} />
              </div>
              <div>
                <strong>Product Shot Studio</strong>
                <span>{uiText.tagline}</span>
              </div>
            </div>
            <AuthRobotMascot isTyping={isAuthTyping} showPassword={showPassword} passwordLength={password.length} />
          </header>

          <div className="auth-title-block">
            <span>{uiText.accountLogin}</span>
            <h1>{mode === "login" ? "欢迎回来" : "创建新账号"}<Sparkles size={26} /></h1>
            <p>{mode === "login" ? "继续创建专业商拍作品。" : "创建本地账号后即可继续使用商拍工作台。"}</p>
          </div>

          <div className="auth-form-card">
            <div className="auth-tabs">
              <button className={mode === "login" ? "active" : ""} type="button" onClick={() => setMode("login")}>
                {uiText.login}
              </button>
              <button className={mode === "signup" ? "active" : ""} type="button" onClick={() => setMode("signup")}>
                {uiText.signUp}
              </button>
            </div>
            <form
              className="auth-form"
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
              <label>
                <span>{mode === "login" ? uiText.loginAccount : uiText.displayName}</span>
                <input
                  value={username}
                  placeholder={mode === "login" ? "输入账号 ID 或账号名" : "输入账号名"}
                  onFocus={() => setIsAuthTyping(true)}
                  onBlur={() => setIsAuthTyping(false)}
                  onChange={(event) => setUsername(event.target.value)}
                />
              </label>
              <label>
                <span>{uiText.password}</span>
                <div className="password-field">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    placeholder="输入密码"
                    onFocus={() => setIsAuthTyping(true)}
                    onBlur={() => setIsAuthTyping(false)}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button
                    className="password-toggle"
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    title={showPassword ? "隐藏密码" : "显示密码"}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>
              <label className="auth-remember-password">
                <input
                  checked={rememberPassword}
                  type="checkbox"
                  onChange={(event) => setRememberPassword(event.target.checked)}
                />
                <span>保留密码，下次自动填入</span>
              </label>
              <button className="primary-button" type="submit" disabled={busy}>
                {busy ? <Loader2 className="spin" size={18} /> : <User size={18} />}
                {mode === "login" ? uiText.login : uiText.signUp}
              </button>
            </form>
            <p className="auth-footnote">
              {uiText.localAccountOnly}
              {mode === "signup" ? ` ${uiText.duplicateNameHint}` : ""}
            </p>
            {message ? <div className="auth-message">{message}</div> : null}
          </div>

          <div className="auth-feature-strip" aria-hidden="true">
            <span><ImagePlus size={20} /> 专业商拍质量</span>
            <span><Sparkles size={20} /> AI 增强工作流</span>
            <span><KeyRound size={20} /> 本地账号安全</span>
          </div>

          <footer className="auth-footer">© Product Shot Studio · Local account workspace</footer>
        </div>
      </section>
    </div>
  );
}

function WalletBadge(props: {
  session: AuthSession;
  wallet: WalletSummary | null;
  onRecharge: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="wallet-badge">
      <div>
        <span className="wallet-user-row">
          {props.session.username}
          <em>VIP</em>
        </span>
        <small>{props.session.accountId}</small>
        <small>{uiText.walletBalance}</small>
        <strong>{formatUsdCents(props.wallet?.balanceCents ?? 0)}</strong>
        <small>{uiText.walletUsed} {formatUsdCents(props.wallet?.usedCents ?? 0)}</small>
      </div>
      <button className="secondary-button" onClick={props.onRecharge}>
        <Wallet size={16} />
        {uiText.recharge}
      </button>
      <button className="icon-button" onClick={props.onLogout} title={uiText.logout}>
        <LogOut size={16} />
      </button>
    </div>
  );
}

function FailurePanel({ job }: { job: ProductShotJob | VideoGenerationJob }) {
  return (
    <div className="failure-panel">
      <strong>{uiText.failureReasons}</strong>
      {job.errors.map((error, index) => (
        <div key={`${error.presetId ?? "job"}-${index}`} className="failure-item">
          <div>
            <span>{error.presetId ? getPresetName(error.presetId) : getProviderDisplayName(error.providerId)}</span>
            <small>{error.code} / {error.retryable ? uiText.retryable : uiText.notRetryable}</small>
          </div>
          <p>{error.message}</p>
        </div>
      ))}
    </div>
  );
}

function GenerateConfirmationDialog(props: {
  mode: GenerateMode;
  activeImage: ImportedImage | null;
  importedImages: ImportedImage[];
  providerId: ProviderId;
  modelId: string;
  selectedPresets: PresetId[];
  aspectRatio: AspectRatio;
  exportFormat: ExportFormat;
  outputCount: number;
  productBrief: string;
  estimatedCostCents: number;
  walletBalanceCents: number;
  totalOutputCount: number;
  defaultExportDir: string;
  onChooseExportFolder: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const sourceImages = props.mode === "single"
    ? props.activeImage
      ? [props.activeImage]
      : []
    : props.importedImages;
  const modelName = getModelDisplayName(props.providerId, props.modelId);
  const modeTitle = props.mode === "single" ? "确认生成图片" : "确认批量生成";
  const costAfterGenerate = props.walletBalanceCents - props.estimatedCostCents;
  const perSourceOutputCount = props.selectedPresets.length * props.outputCount;
  const presetNames = props.selectedPresets.map((presetId) => getPresetName(presetId)).join("、") || "未选择";
  const promptSummary = props.productBrief.trim() || "未填写";

  return (
    <div className="modal-backdrop generate-confirm-backdrop">
      <div className="generate-confirm-dialog compact">
        <header>
          <div className="generate-confirm-title">
            <ProviderLogo providerId={props.providerId} />
            <div>
              <span>{props.mode === "single" ? uiText.generate : uiText.batchGenerate}</span>
              <h2>{modeTitle}</h2>
              <p>确认后开始任务，取消不会消耗积分。</p>
            </div>
          </div>
          <button className="icon-button" onClick={props.onCancel} title={uiText.close}>
            <X size={16} />
          </button>
        </header>

        <section className="generate-confirm-summary">
          <div>
            <span>预计出图</span>
            <strong>{props.totalOutputCount} 张</strong>
          </div>
          <div>
            <span>预计消耗</span>
            <strong>{formatUsdCents(props.estimatedCostCents)}</strong>
          </div>
          <div>
            <span>{uiText.walletBalance}</span>
            <strong>{formatUsdCents(props.walletBalanceCents)}</strong>
          </div>
          <div>
            <span>任务后余额</span>
            <strong className={costAfterGenerate < 0 ? "warn" : ""}>{formatUsdCents(costAfterGenerate)}</strong>
          </div>
        </section>

        <div className="generate-confirm-compact-grid">
          <ConfirmField label="源图 / 每张" value={`${sourceImages.length} 张 / ${perSourceOutputCount} 张`} />
          <ConfirmField label="模型" value={modelName} />
          <ConfirmField
            label={uiText.output}
            value={`${props.aspectRatio} / ${props.exportFormat} / 张数 ${props.outputCount} 张`}
          />
          <ConfirmField label="当前模板" value={presetNames} />
          <ConfirmField label="模式" value={props.mode === "single" ? "单张生成" : "批量生成"} />
        </div>

        <section className="generate-confirm-brief">
          <span>输入描述</span>
          <p title={promptSummary}>{promptSummary}</p>
        </section>

        <div className="generate-confirm-paths">
          <div className="generate-confirm-path-row">
            <div>
              <span>源图位置</span>
              <strong title={sourceImages.map((image) => image.sourceImagePath).join("\n")}>
                {sourceImages[0]?.sourceImagePath ?? "未选择源图"}
                {sourceImages.length > 1 ? ` 等 ${sourceImages.length} 张` : ""}
              </strong>
            </div>
          </div>
          <div className="generate-confirm-path-row">
            <div>
              <span>导出位置</span>
              <strong title={props.defaultExportDir}>
                {props.defaultExportDir || "使用系统默认导出文件夹"}
              </strong>
            </div>
            <button className="secondary-button compact-button" onClick={props.onChooseExportFolder}>
              <FolderOpen size={15} />
              更改
            </button>
          </div>
        </div>

        <footer>
          <button className="secondary-button" onClick={props.onCancel}>
            {uiText.cancel}
          </button>
          <button className="primary-button" onClick={props.onConfirm}>
            <Sparkles size={17} />
            确认开始
          </button>
        </footer>
      </div>
    </div>
  );
}

function ConfirmField(props: { label: string; value: string }) {
  return (
    <div className="confirm-field">
      <span>{props.label}</span>
      <strong title={props.value}>{props.value}</strong>
    </div>
  );
}

function TutorialDialog(props: { onClose: () => void }) {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const steps = [
    {
      imageUrl: tutorialCurrentWorkspaceUrl,
      title: "导入产品图",
      body: "进入“图片生成”，点击中间的上传区域或“添加图片”，也可以把 JPG、PNG、WebP 产品图直接拖进工作区。支持一次导入多张图片，并在下方缩略图中切换、删除或清空。"
    },
    {
      imageUrl: tutorialCurrentModelConfigUrl,
      title: "配置密钥、模型与输出",
      body: "先在“设置”中填写已开通平台的 API 密钥和模型/接入点 ID。回到工作台选择模型，再设置比例、张数、图片格式、质量和提示词模板。模型卡片上的钥匙图标表示仍需配置密钥。"
    },
    {
      imageUrl: tutorialCurrentPreviewUrl,
      title: "预览、编辑、对比与导出",
      body: "点击生成结果或历史作品即可打开大图预览。图片会先完整适配窗口；滚轮可围绕鼠标位置缩放，按住图片拖动查看细节，双击恢复完整视图。你还可以编辑、保存、加入对比图，并导出当前图片。"
    },
    {
      imageUrl: tutorialCurrentHistoryUrl,
      title: "管理历史作品与个人图库",
      body: "在“个人中心 > 历史作品”查看每次生成任务、模型和结果；删除记录后可在回收站恢复。喜欢的图片可加入个人图库，拖拽调整电商发布顺序，也能勾选多张图片进行并排对比。不同账号的数据彼此隔离。"
    },
    {
      imageUrl: tutorialCurrentUpdatesUrl,
      title: "设置导出位置并查看更新",
      body: "在“设置”中修改默认导出文件夹，之后生成确认页和导出操作会同步使用该路径。“更新公告”会记录每个版本的中文更新内容、发布时间、功能变化和修复情况。"
    }
  ];
  const faqs = [
    {
      question: "生成失败怎么处理？",
      answer: "先看结果区的中文失败原因。常见情况包括 API 密钥无效、模型或接入点未开通、平台额度或软件积分不足、模型达到推理限额，以及输入尺寸不符合供应商要求。"
    },
    {
      question: "产品外观与原图不一致怎么办？",
      answer: "在提示词中明确要求保持产品形状、颜色、材质、比例、Logo 和包装文字，只改变背景、灯光、构图和陈列环境。尽量使用主体清晰、无遮挡、光线均匀的原图。"
    },
    {
      question: "图片为什么加载不出来？",
      answer: "先点击刷新，再确认原文件没有被移动或删除。历史图片来自软件数据目录；如果更换电脑、清理数据目录或只复制数据库而没有复制图片文件，缩略图和大图可能无法显示。"
    },
    {
      question: "历史记录或个人图库为什么是空的？",
      answer: "历史记录和个人图库按账号 ID 分开保存。请确认当前登录的是生成这些作品时使用的账号；账号名可能相同，但唯一账号 ID 不同，数据也不会共享。"
    },
    {
      question: "后端服务未连接怎么办？",
      answer: "开发模式下请先在项目目录运行本地账本服务，或直接运行 npm.cmd run dev:all。软件关闭不应影响独立启动的后端；如果后台也关闭了，请重新启动 server 服务。"
    },
    {
      question: "如何直接使用已经生成的图片进行对比？",
      answer: "在大图预览中点击“添加对比图”，从“本次结果、历史生成、个人图库”里勾选图片即可；也可以在个人图库中直接多选两张以上图片进入对比视图。"
    }
  ];
  const tips = [
    "拍摄原图时让主体完整入镜，减少强反光、遮挡和复杂背景，能明显提高产品保真度。",
    "电商主图优先选择 1:1 或 4:5；店铺横幅、活动页和广告素材优先选择 16:9。",
    "生成前先核对模型、单张积分和预计总积分；批量任务建议先用一张标准质量试生成。",
    "导出前放大检查 Logo、包装文字、边缘、手指和产品结构，再把通过的图片加入个人图库排序。"
  ];

  return (
    <div className="modal-backdrop">
      <div className="tutorial-dialog">
        <header>
          <div>
            <h2>{uiText.tutorialTitle}</h2>
            <p>{uiText.tutorialIntro}</p>
          </div>
          <button className="icon-button" onClick={props.onClose} title={uiText.close}>
            <X size={16} />
          </button>
        </header>
        <div className="tutorial-body">
          <section className="tutorial-steps" aria-label={uiText.tutorialFlow}>
            {steps.map((step, index) => (
              <article key={step.title} className="tutorial-card">
                <button
                  type="button"
                  className="tutorial-card-image"
                  onClick={() => setExpandedStep(index)}
                  aria-label={`放大查看：${step.title}`}
                >
                  <img src={step.imageUrl} alt={`${step.title}界面示例`} />
                  <span><ZoomIn size={14} /> 点击查看大图</span>
                </button>
                <div>
                  <small>{uiText.tutorialFlow} {index + 1}</small>
                  <strong>{step.title}</strong>
                  <p>{step.body}</p>
                </div>
              </article>
            ))}
          </section>
          <section className="tutorial-tips">
            <h3>{uiText.tutorialTip}</h3>
            <div>
              {tips.map((tip) => (
                <p key={tip}>{tip}</p>
              ))}
            </div>
          </section>
          <section className="tutorial-faq" aria-label={uiText.tutorialFaq}>
            <h3>{uiText.tutorialFaq}</h3>
            <div>
              {faqs.map((item) => (
                <article key={item.question}>
                  <strong>{item.question}</strong>
                  <p>{item.answer}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
        {expandedStep !== null ? (
          <div className="tutorial-image-backdrop" role="dialog" aria-modal="true" onClick={() => setExpandedStep(null)}>
            <div className="tutorial-image-dialog" onClick={(event) => event.stopPropagation()}>
              <header>
                <div>
                  <small>{uiText.tutorialFlow} {expandedStep + 1}</small>
                  <strong>{steps[expandedStep].title}</strong>
                </div>
                <button className="icon-button" onClick={() => setExpandedStep(null)} title={uiText.close}>
                  <X size={17} />
                </button>
              </header>
              <img src={steps[expandedStep].imageUrl} alt={`${steps[expandedStep].title}界面大图`} />
              <p>{steps[expandedStep].body}</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ImagePreviewDialog(props: {
  image: PreviewImage;
  comparisonImages?: PreviewImage[];
  libraryImages: ComparisonLibraryImage[];
  exportFormat: ExportFormat;
  defaultExportDir: string;
  resolveDefaultExportDir: () => Promise<string>;
  onClose: () => void;
  onSaved: (path: string) => void;
}) {
  const sourcePreviewItem = useMemo(
    () => createPreviewCompareItem(normalizePreviewImageName(props.image, props.image.title), `source:${props.image.filePath || props.image.src}`),
    [props.image.filePath, props.image.src, props.image.subtitle, props.image.title, props.image.fileName]
  );
  const initialPreviewItems = useMemo(() => {
    const seen = new Set<string>();
    return [props.image, ...(props.comparisonImages ?? [])]
      .filter((image) => {
        const key = image.filePath || image.src;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((image, index) =>
        createPreviewCompareItem(
          normalizePreviewImageName(image, image.title),
          index === 0
            ? sourcePreviewItem.id
            : `compare:${image.filePath || image.src}:${index}`
        )
      );
  }, [props.image, props.comparisonImages, sourcePreviewItem.id]);
  const dragRef = useRef<{
    imageKey: string;
    pointerId: number;
    startX: number;
    startY: number;
    panX: number;
    panY: number;
  } | null>(null);
  const compareGridRef = useRef<HTMLElement | null>(null);
  const [previewItems, setPreviewItems] = useState<PreviewCompareItem[]>(() => initialPreviewItems);
  const [activePreviewId, setActivePreviewId] = useState(sourcePreviewItem.id);
  const [compareLayout, setCompareLayout] = useState<PreviewCompareLayout>("adaptive");
  const [customGridSize, setCustomGridSize] = useState(5);
  const [compareModeEnabled, setCompareModeEnabled] = useState(false);
  const [comparisonLibraryOpen, setComparisonLibraryOpen] = useState(false);
  const [comparisonLibraryTab, setComparisonLibraryTab] = useState<ComparisonLibrarySource>("current");
  const [selectedLibraryIds, setSelectedLibraryIds] = useState<string[]>([]);
  const [draggedPreviewId, setDraggedPreviewId] = useState<string | null>(null);
  const [dragOverPreviewId, setDragOverPreviewId] = useState<string | null>(null);
  const [viewStates, setViewStates] = useState<Record<string, PreviewViewState>>({});
  const [panningImageKey, setPanningImageKey] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const activePreviewImage = previewItems.find((image) => image.id === activePreviewId) ?? previewItems[0] ?? sourcePreviewItem;
  const activePreviewKey = activePreviewImage.id;
  const activeViewState = viewStates[activePreviewKey] ?? defaultPreviewViewState;
  const showCompareGrid = previewItems.length > 1 || compareModeEnabled;
  const previewImageKeys = useMemo(
    () => new Set(previewItems.map((item) => item.filePath || item.src)),
    [previewItems]
  );
  const visibleLibraryImages = useMemo(
    () => props.libraryImages.filter((image) => image.source === comparisonLibraryTab),
    [props.libraryImages, comparisonLibraryTab]
  );
  const selectedLibraryImages = useMemo(
    () => props.libraryImages.filter((image) => selectedLibraryIds.includes(image.libraryId)),
    [props.libraryImages, selectedLibraryIds]
  );
  const imageFilter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

  useEffect(() => {
    resetAllViews();
    setEditing(false);
    resetEdit();
    setMessage("");
    setPreviewItems(initialPreviewItems);
    setActivePreviewId(sourcePreviewItem.id);
    setCompareLayout("adaptive");
    setCustomGridSize(5);
    setCompareModeEnabled(initialPreviewItems.length > 1);
    setComparisonLibraryOpen(false);
    setSelectedLibraryIds([]);
  }, [initialPreviewItems, sourcePreviewItem.id]);

  useEffect(() => {
    const gridElement = compareGridRef.current;
    if (!showCompareGrid || !gridElement) return;
    const guardedGrid: HTMLElement = gridElement;

    function blockGridWheel(event: globalThis.WheelEvent) {
      const rect = guardedGrid.getBoundingClientRect();
      const scrollbarWidth = guardedGrid.offsetWidth - guardedGrid.clientWidth;
      const scrollbarHitWidth = Math.max(14, scrollbarWidth);
      const onVerticalScrollbar = event.clientX >= rect.right - scrollbarHitWidth && event.clientX <= rect.right;
      if (onVerticalScrollbar) return;
      event.preventDefault();
    }

    guardedGrid.addEventListener("wheel", blockGridWheel, { capture: true, passive: false });
    return () => {
      guardedGrid.removeEventListener("wheel", blockGridWheel, true);
    };
  }, [showCompareGrid]);

  function createPreviewCompareItem(image: PreviewImage, id: string): PreviewCompareItem {
    return { ...image, id };
  }

  function createDefaultPreviewViewState(): PreviewViewState {
    return { zoom: 1, pan: { x: 0, y: 0 } };
  }

  function clampPreviewZoom(value: number): number {
    return Math.min(6, Math.max(0.35, value));
  }

  function getViewState(imageKey: string): PreviewViewState {
    return viewStates[imageKey] ?? defaultPreviewViewState;
  }

  function updateViewState(imageKey: string, updater: (state: PreviewViewState) => PreviewViewState) {
    setViewStates((current) => ({
      ...current,
      [imageKey]: updater(current[imageKey] ?? defaultPreviewViewState)
    }));
  }

  function resetView(imageKey = activePreviewKey) {
    setViewStates((current) => ({
      ...current,
      [imageKey]: createDefaultPreviewViewState()
    }));
  }

  function resetAllViews() {
    dragRef.current = null;
    setPanningImageKey(null);
    setDraggedPreviewId(null);
    setDragOverPreviewId(null);
    setViewStates({});
  }

  function zoomFromCenter(delta: number) {
    updateViewState(activePreviewKey, (current) => {
      const nextZoom = clampPreviewZoom(current.zoom + delta);
      return {
        zoom: nextZoom,
        pan: nextZoom <= 1 ? { x: 0, y: 0 } : current.pan
      };
    });
  }

  function selectPreviewItem(imageId: string) {
    setActivePreviewId(imageId);
    setMessage("");
  }

  function deletePreviewItem(imageId: string) {
    setPreviewItems((current) => {
      if (current.length <= 1) return current;
      const deletedIndex = current.findIndex((item) => item.id === imageId);
      if (deletedIndex < 0) return current;
      const nextItems = current.filter((item) => item.id !== imageId);
      setViewStates((currentStates) => {
        const nextStates = { ...currentStates };
        delete nextStates[imageId];
        return nextStates;
      });
      setActivePreviewId((currentActiveId) => {
        if (currentActiveId !== imageId) return currentActiveId;
        return nextItems[Math.min(deletedIndex, nextItems.length - 1)].id;
      });
      setMessage("已删除对比图");
      return nextItems;
    });
  }

  function reorderPreviewItems(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;
    setPreviewItems((current) => {
      const sourceIndex = current.findIndex((item) => item.id === sourceId);
      const targetIndex = current.findIndex((item) => item.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) return current;
      const nextItems = [...current];
      const [movedItem] = nextItems.splice(sourceIndex, 1);
      nextItems.splice(targetIndex, 0, movedItem);
      return nextItems;
    });
    setMessage("已调整对比顺序");
  }

  function handlePreviewDragStart(event: DragEvent<HTMLElement>, imageId: string) {
    if (isPreviewInteractiveDragTarget(event.target)) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", imageId);
    setDraggedPreviewId(imageId);
  }

  function handlePreviewDragOver(event: DragEvent<HTMLElement>, imageId: string) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverPreviewId(imageId);
  }

  function handlePreviewDrop(event: DragEvent<HTMLElement>, imageId: string) {
    event.preventDefault();
    const sourceId = draggedPreviewId || event.dataTransfer.getData("text/plain");
    setDraggedPreviewId(null);
    setDragOverPreviewId(null);
    if (sourceId) {
      reorderPreviewItems(sourceId, imageId);
    }
  }

  function handlePreviewDragEnd() {
    setDraggedPreviewId(null);
    setDragOverPreviewId(null);
  }

  function handleWheelForImage(event: WheelEvent<HTMLElement>, imageKey: string) {
    event.preventDefault();
    event.stopPropagation();
    setActivePreviewId(imageKey);
    const rect = event.currentTarget.getBoundingClientRect();

    const cursorX = event.clientX - rect.left - rect.width / 2;
    const cursorY = event.clientY - rect.top - rect.height / 2;
    const factor = event.deltaY > 0 ? 0.88 : 1.12;

    updateViewState(imageKey, (current) => {
      const nextZoom = clampPreviewZoom(current.zoom * factor);
      const imagePointX = (cursorX - current.pan.x) / current.zoom;
      const imagePointY = (cursorY - current.pan.y) / current.zoom;
      return {
        zoom: nextZoom,
        pan: {
          x: cursorX - imagePointX * nextZoom,
          y: cursorY - imagePointY * nextZoom
        }
      };
    });
  }

  function handleCompareGridWheel(event: WheelEvent<HTMLElement>) {
    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();
    const scrollbarWidth = element.offsetWidth - element.clientWidth;
    const scrollbarHitWidth = Math.max(14, scrollbarWidth);
    const onVerticalScrollbar = event.clientX >= rect.right - scrollbarHitWidth;
    if (onVerticalScrollbar) return;
    event.preventDefault();
  }

  function selectCompareLayout(layout: PreviewCompareLayout) {
    setCompareLayout(layout);
  }

  function updateCustomGridSize(value: number) {
    const nextSize = Math.min(8, Math.max(2, Math.floor(Number(value) || 2)));
    setCustomGridSize(nextSize);
    setCompareLayout("custom");
  }

  function getCompareGridClassName(): string {
    return compareLayout === "custom" ? "grid-custom" : compareLayout;
  }

  function handlePointerDownForImage(event: PointerEvent<HTMLElement>, imageKey: string) {
    if (event.button !== 0) return;
    event.preventDefault();
    setActivePreviewId(imageKey);
    event.currentTarget.setPointerCapture(event.pointerId);
    const viewState = getViewState(imageKey);
    dragRef.current = {
      imageKey,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      panX: viewState.pan.x,
      panY: viewState.pan.y
    };
    setPanningImageKey(imageKey);
  }

  function handlePointerMoveForImage(event: PointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    updateViewState(drag.imageKey, (current) => ({
      zoom: current.zoom,
      pan: {
        x: drag.panX + event.clientX - drag.startX,
        y: drag.panY + event.clientY - drag.startY
      }
    }));
  }

  function stopPanningForImage(event: PointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    setPanningImageKey(null);
  }

  function getPreviewImageStyle(image: PreviewCompareItem, active: boolean) {
    const viewState = getViewState(image.id);
    return {
      filter: active ? imageFilter : undefined,
      transform: `translate3d(${viewState.pan.x}px, ${viewState.pan.y}px, 0) scale(${viewState.zoom})`
    };
  }

  function handleCompareGridDoubleClick(event: MouseEvent<HTMLElement>) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const item = target.closest("[data-preview-key]");
    const imageKey = item?.getAttribute("data-preview-key");
    if (imageKey) {
      resetView(imageKey);
    }
  }

  function resetEdit() {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
  }

  async function saveOriginal() {
    setBusy(true);
    setMessage("");
    try {
      const targetDir = props.defaultExportDir || (await props.resolveDefaultExportDir());
      if (activePreviewImage.filePath) {
        const response = await window.productStudio.exportImages({
          imagePaths: [activePreviewImage.filePath],
          format: props.exportFormat,
          targetDir
        });
        const savedPath = response.exportedPaths[0] ?? targetDir;
        props.onSaved(savedPath);
        setMessage(savedPath);
        return;
      }
      await saveEdited();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : uiText.generationFailed);
    } finally {
      setBusy(false);
    }
  }

  async function saveEdited() {
    setBusy(true);
    setMessage("");
    try {
      const targetDir = props.defaultExportDir || (await props.resolveDefaultExportDir());
      const dataUrl = await renderEditedDataUrl(activePreviewImage.src, imageFilter, props.exportFormat);
      const response = await window.productStudio.saveEditedImage({
        dataUrl,
        targetDir,
        fileName: buildEditedFileName(activePreviewImage.fileName, props.exportFormat)
      });
      props.onSaved(response.imagePath);
      setMessage(response.imagePath);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : uiText.generationFailed);
    } finally {
      setBusy(false);
    }
  }

  function openComparisonLibrary() {
    const preferredSource: ComparisonLibrarySource = props.libraryImages.some((image) => image.source === "current")
      ? "current"
      : props.libraryImages.some((image) => image.source === "history")
        ? "history"
        : "gallery";
    setComparisonLibraryTab(preferredSource);
    setSelectedLibraryIds([]);
    setComparisonLibraryOpen(true);
    setMessage("");
  }

  function toggleLibraryImage(image: ComparisonLibraryImage) {
    const imageKey = image.filePath || image.src;
    if (previewImageKeys.has(imageKey)) return;
    setSelectedLibraryIds((current) =>
      current.includes(image.libraryId)
        ? current.filter((libraryId) => libraryId !== image.libraryId)
        : [...current, image.libraryId]
    );
  }

  function addSelectedLibraryImages() {
    const createdAt = Date.now();
    const existingKeys = new Set(previewItems.map((item) => item.filePath || item.src));
    const nextImages = selectedLibraryImages
      .filter((image) => !existingKeys.has(image.filePath || image.src))
      .map((image, index) =>
        createPreviewCompareItem(
          normalizePreviewImageName(image, image.title),
          `library:${image.libraryId}:${createdAt}:${index}`
        )
      );
    if (nextImages.length === 0) {
      setMessage("请选择尚未加入对比的图片");
      return;
    }
    setPreviewItems((current) => [...current, ...nextImages]);
    setActivePreviewId(nextImages[0].id);
    setCompareModeEnabled(true);
    setComparisonLibraryOpen(false);
    setSelectedLibraryIds([]);
    setMessage(`已从软件图库添加 ${nextImages.length} 张对比图`);
  }

  async function addComparisonImagesFromFiles() {
    setBusy(true);
    setMessage("");
    try {
      const imported = await window.productStudio.selectImages();
      if (imported.length === 0) {
        setMessage(uiText.imageCanceled);
        return;
      }
      const createdAt = Date.now();
      const nextImages = imported.map((image, index) => {
        const originalFileName = getDisplayFileName(image.sourceImagePath, `comparison-${previewItems.length + index + 1}.png`);
        return createPreviewCompareItem(
          {
            src: image.previewDataUrl,
            filePath: image.sourceImagePath,
            title: originalFileName,
            subtitle: `${image.dimensions.width} x ${image.dimensions.height}`,
            fileName: originalFileName
          },
          `compare:${image.sourceImagePath}:${createdAt}:${index}`
        );
      });
      setPreviewItems((current) => [...current, ...nextImages]);
      if (nextImages[0]) {
        setActivePreviewId(nextImages[0].id);
      }
      setCompareModeEnabled(true);
      setMessage(`已添加 ${imported.length} 张对比图`);
      setComparisonLibraryOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : uiText.importFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop preview-backdrop">
      <div className="preview-dialog">
        <header>
          <div>
            <h2>{uiText.previewImage}</h2>
          </div>
          <div className="preview-toolbar">
            <button className="icon-button" onClick={() => zoomFromCenter(-0.2)} title={uiText.zoomOut}>
              <ZoomOut size={16} />
            </button>
            <span>{Math.round(activeViewState.zoom * 100)}%</span>
            <button className="icon-button" onClick={() => zoomFromCenter(0.2)} title={uiText.zoomIn}>
              <ZoomIn size={16} />
            </button>
            <button className="icon-button" onClick={() => resetView()} title={uiText.resetView}>
              <RotateCcw size={16} />
            </button>
            {showCompareGrid ? (
              <div className="preview-layout-control" aria-label="对比图显示模式">
                <button
                  className={compareLayout === "adaptive" ? "active preview-layout-main" : "preview-layout-main"}
                  onClick={() => selectCompareLayout("adaptive")}
                  title="自适应对比"
                >
                  <Rows2 size={15} />
                  自适应
                </button>
                <details className="preview-layout-menu">
                  <summary title="展开布局选项">
                    <ChevronDown size={15} />
                  </summary>
                  <div className="preview-layout-menu-panel">
                    <button onClick={() => selectCompareLayout("grid-2x2")}>
                      <LayoutGrid size={14} />
                      2x2
                    </button>
                    <button onClick={() => selectCompareLayout("grid-3x3")}>
                      <LayoutGrid size={14} />
                      3x3
                    </button>
                    <button onClick={() => selectCompareLayout("grid-4x4")}>
                      <LayoutGrid size={14} />
                      4x4
                    </button>
                    <label>
                      <span>自定义</span>
                      <input
                        type="number"
                        min={2}
                        max={8}
                        value={customGridSize}
                        onChange={(event) => updateCustomGridSize(Number(event.target.value))}
                      />
                    </label>
                  </div>
                </details>
              </div>
            ) : null}
            <button className={`secondary-button ${editing ? "active" : ""}`} onClick={() => setEditing((value) => !value)}>
              <Edit3 size={16} />
              {uiText.editImage}
            </button>
            <button className="secondary-button" onClick={openComparisonLibrary} disabled={busy}>
              <ImagePlus size={16} />
              添加对比图
            </button>
            <button className="secondary-button" onClick={() => void saveOriginal()} disabled={busy}>
              <Download size={16} />
              {uiText.saveImage}
            </button>
            <button className="primary-button" onClick={() => void saveEdited()} disabled={busy}>
              {busy ? <Loader2 className="spin" size={17} /> : <Save size={17} />}
              {uiText.saveEdited}
            </button>
            <button className="icon-button" onClick={props.onClose} title={uiText.close}>
              <X size={16} />
            </button>
          </div>
        </header>
        {editing ? (
          <section className="preview-edit-panel">
            <RangeControl label={uiText.brightness} value={brightness} min={60} max={140} onChange={setBrightness} />
            <RangeControl label={uiText.contrast} value={contrast} min={60} max={150} onChange={setContrast} />
            <RangeControl label={uiText.saturation} value={saturation} min={40} max={160} onChange={setSaturation} />
            <button className="secondary-button" onClick={resetEdit}>
              <RotateCcw size={15} />
              {uiText.resetEdit}
            </button>
          </section>
        ) : null}
        {showCompareGrid ? (
          <section
            ref={compareGridRef}
            className={`preview-compare-grid ${getCompareGridClassName()}`}
            style={compareLayout === "custom" ? { gridTemplateColumns: `repeat(${customGridSize}, minmax(0, 1fr))` } : undefined}
            aria-label="图片对比"
            onDoubleClick={handleCompareGridDoubleClick}
            onWheel={handleCompareGridWheel}
          >
            {previewItems.map((image, index) => {
              const active = activePreviewId === image.id;
              return (
                <article
                  key={image.id}
                  data-preview-key={image.id}
                  className={`preview-compare-card ${active ? "active" : ""} ${draggedPreviewId === image.id ? "dragging" : ""} ${dragOverPreviewId === image.id ? "drag-over" : ""}`}
                  draggable
                  onClick={() => selectPreviewItem(image.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      selectPreviewItem(image.id);
                    }
                  }}
                  onDragStart={(event) => handlePreviewDragStart(event, image.id)}
                  onDragOver={(event) => handlePreviewDragOver(event, image.id)}
                  onDrop={(event) => handlePreviewDrop(event, image.id)}
                  onDragEnd={handlePreviewDragEnd}
                  role="button"
                  tabIndex={0}
                  title={image.title}
                >
                  <div className="preview-compare-actions">
                    <span className="preview-drag-indicator" title="拖动卡片外框排序">
                      <GripVertical size={15} />
                    </span>
                    <span className="preview-order-badge">{index + 1}</span>
                  </div>
                  <button
                    className="preview-delete-button"
                    onClick={(event) => {
                      event.stopPropagation();
                      deletePreviewItem(image.id);
                    }}
                    disabled={previewItems.length <= 1}
                    title="删除对比图"
                    aria-label="删除对比图"
                  >
                    <X size={15} />
                  </button>
                  <span
                    className={`preview-compare-image ${panningImageKey === image.id ? "panning" : ""}`}
                    onWheel={(event) => handleWheelForImage(event, image.id)}
                    onPointerDown={(event) => handlePointerDownForImage(event, image.id)}
                    onPointerMove={handlePointerMoveForImage}
                    onPointerUp={stopPanningForImage}
                    onPointerCancel={stopPanningForImage}
                    onDragStart={(event) => event.preventDefault()}
                  >
                    <img
                      src={image.src}
                      alt={image.title}
                      draggable={false}
                      onDragStart={(event) => event.preventDefault()}
                      style={getPreviewImageStyle(image, active)}
                    />
                  </span>
                  <span className="preview-compare-meta">
                    <strong>{image.title}</strong>
                    {image.subtitle ? <small>{image.subtitle}</small> : null}
                  </span>
                </article>
              );
            })}
          </section>
        ) : (
          <div
            className={`preview-stage ${panningImageKey === activePreviewKey ? "panning" : ""}`}
            onWheel={(event) => handleWheelForImage(event, activePreviewKey)}
            onPointerDown={(event) => handlePointerDownForImage(event, activePreviewKey)}
            onPointerMove={handlePointerMoveForImage}
            onPointerUp={stopPanningForImage}
            onPointerCancel={stopPanningForImage}
            onDoubleClick={() => resetView()}
            role="presentation"
          >
            <img
              src={activePreviewImage.src}
              alt={activePreviewImage.title}
              draggable={false}
              onDragStart={(event) => event.preventDefault()}
              style={{
                filter: imageFilter,
                transform: `translate3d(${activeViewState.pan.x}px, ${activeViewState.pan.y}px, 0) scale(${activeViewState.zoom})`
              }}
            />
          </div>
        )}
        <footer>{message || uiText.previewInteractionHint}</footer>
        {comparisonLibraryOpen ? (
          <div className="compare-library-backdrop" role="presentation">
            <section className="compare-library-dialog" role="dialog" aria-modal="true" aria-label="选择对比图片">
              <header>
                <div>
                  <span className="compare-library-kicker">图片来源</span>
                  <h3>选择已经生成的图片</h3>
                  <p>直接使用本次结果、历史作品或个人图库，不需要再次从文件夹寻找。</p>
                </div>
                <button
                  className="icon-button"
                  onClick={() => {
                    setComparisonLibraryOpen(false);
                    setSelectedLibraryIds([]);
                  }}
                  title={uiText.close}
                >
                  <X size={16} />
                </button>
              </header>

              <nav className="compare-library-tabs" aria-label="对比图片来源">
                {([
                  { id: "current", label: "本次结果", icon: <Sparkles size={15} /> },
                  { id: "history", label: "历史生成", icon: <History size={15} /> },
                  { id: "gallery", label: "个人图库", icon: <Images size={15} /> }
                ] as Array<{ id: ComparisonLibrarySource; label: string; icon: JSX.Element }>).map((tab) => {
                  const count = props.libraryImages.filter((image) => image.source === tab.id).length;
                  return (
                    <button
                      key={tab.id}
                      className={comparisonLibraryTab === tab.id ? "active" : ""}
                      onClick={() => setComparisonLibraryTab(tab.id)}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                      <small>{count}</small>
                    </button>
                  );
                })}
              </nav>

              <div className="compare-library-grid">
                {visibleLibraryImages.length === 0 ? (
                  <div className="compare-library-empty">
                    <Images size={30} />
                    <strong>这里暂时没有图片</strong>
                    <span>生成图片或收藏到个人图库后，就能直接用于对比。</span>
                  </div>
                ) : (
                  visibleLibraryImages.map((image) => {
                    const imageKey = image.filePath || image.src;
                    const alreadyAdded = previewImageKeys.has(imageKey);
                    const selected = selectedLibraryIds.includes(image.libraryId);
                    return (
                      <button
                        key={image.libraryId}
                        className={`compare-library-card ${selected ? "selected" : ""} ${alreadyAdded ? "added" : ""}`}
                        onClick={() => toggleLibraryImage(image)}
                        disabled={alreadyAdded}
                        title={alreadyAdded ? "已在当前对比中" : image.title}
                      >
                        <span className="compare-library-image">
                          <img src={image.src} alt={image.title} />
                          <i>{alreadyAdded ? <Check size={15} /> : selected ? <Check size={15} /> : null}</i>
                        </span>
                        <span className="compare-library-meta">
                          <strong>{image.title}</strong>
                          <small>{image.subtitle || new Date(image.createdAt).toLocaleString()}</small>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              <footer>
                <button className="secondary-button" onClick={() => void addComparisonImagesFromFiles()} disabled={busy}>
                  <FolderOpen size={16} />
                  从电脑选择
                </button>
                <span>已选择 {selectedLibraryImages.length} 张</span>
                <button
                  className="primary-button"
                  onClick={addSelectedLibraryImages}
                  disabled={selectedLibraryImages.length === 0}
                >
                  <ImagePlus size={16} />
                  添加到对比
                </button>
              </footer>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function VideoPreviewDialog(props: {
  video: PreviewVideo;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop preview-backdrop">
      <section className="video-preview-dialog" role="dialog" aria-modal="true" aria-label="视频预览">
        <header>
          <div>
            <strong>{props.video.title}</strong>
            {props.video.subtitle ? <span>{props.video.subtitle}</span> : null}
          </div>
          <button className="icon-button" onClick={props.onClose} title={uiText.close}>
            <X size={18} />
          </button>
        </header>
        <video src={props.video.src} controls autoPlay />
        <footer>
          <span>{props.video.fileName ?? getDisplayFileName(props.video.filePath, "video.mp4")}</span>
        </footer>
      </section>
    </div>
  );
}

function DeleteResultDialog(props: {
  target: ResultDeleteTarget;
  onCancel: () => void;
  onConfirm: (scope: ResultDeleteScope) => void;
}) {
  const [scope, setScope] = useState<ResultDeleteScope>("current");
  const mediaLabel = props.target.mediaType === "video" ? "视频" : "图片";
  const canDeleteHistory = Boolean(props.target.jobId);

  return (
    <div className="modal-backdrop">
      <section className="delete-result-dialog" role="dialog" aria-modal="true" aria-label="删除结果确认">
        <header>
          <span className="delete-result-icon">
            <CircleAlert size={28} />
          </span>
          <div>
            <strong>删除这{props.target.mediaType === "video" ? "个" : "张"}{mediaLabel}？</strong>
            <p>{props.target.title}</p>
          </div>
          <button className="icon-button delete-dialog-close" onClick={props.onCancel} title="关闭" aria-label="关闭">
            <X size={22} />
          </button>
        </header>
        <div className="delete-result-intro">
          <p>删除后不会影响本地{mediaLabel}文件。</p>
          <strong>请选择删除范围：</strong>
        </div>
        <div className="delete-scope-options" role="radiogroup" aria-label="删除范围">
          <label
            className={`delete-scope-option ${scope === "current" ? "active" : ""}`}
          >
            <input
              type="radio"
              name="delete-result-scope"
              value="current"
              checked={scope === "current"}
              onChange={() => setScope("current")}
            />
            <span className="delete-scope-copy">
              <strong>仅从当前结果移除</strong>
              <small>{mediaLabel}不再显示在本次生成结果中。</small>
            </span>
            <ImageOff size={42} strokeWidth={1.6} />
          </label>
          <label
            className={`delete-scope-option history-scope ${scope === "history" ? "active" : ""}`}
            aria-disabled={!canDeleteHistory}
          >
            <input
              type="radio"
              name="delete-result-scope"
              value="history"
              checked={scope === "history"}
              disabled={!canDeleteHistory}
              onChange={() => setScope("history")}
            />
            <span className="delete-scope-copy">
              <strong>同时从历史作品中删除</strong>
              <small>{canDeleteHistory ? `${mediaLabel}会从关联的历史作品记录中移除。` : "当前结果没有关联的历史作品记录。"}</small>
              {canDeleteHistory ? (
                <em>
                  <CircleAlert size={15} />
                  此操作会修改历史作品记录，之后可能无法在历史中找回。
                </em>
              ) : null}
            </span>
            <span className="delete-history-icon">
              <History size={36} strokeWidth={1.5} />
              <Trash2 size={21} />
            </span>
          </label>
        </div>
        <footer>
          <button className="secondary-button" onClick={props.onCancel}>
            取消
          </button>
          <button className="primary-button danger-action" onClick={() => props.onConfirm(scope)}>
            确认删除
          </button>
        </footer>
      </section>
    </div>
  );
}

function RangeControl(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="range-control">
      <span>{props.label}</span>
      <input
        type="range"
        min={props.min}
        max={props.max}
        value={props.value}
        onChange={(event) => props.onChange(Number(event.target.value))}
      />
      <strong>{props.value}%</strong>
    </label>
  );
}

async function renderEditedDataUrl(src: string, filter: string, format: ExportFormat): Promise<string> {
  const image = await loadImage(src);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas is unavailable.");
  }
  context.filter = filter;
  context.drawImage(image, 0, 0, width, height);
  const mimeType = format === "jpg" ? "image/jpeg" : `image/${format}`;
  return canvas.toDataURL(mimeType, 0.95);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(uiText.importFailed));
    image.src = src;
  });
}

function buildEditedFileName(fileName: string | undefined, format: ExportFormat): string {
  const base = (fileName || "product-shot").replace(/\.[a-z0-9]+$/i, "");
  return `${base}-edited.${format}`;
}

function getDisplayFileName(pathOrName: string | undefined, fallback: string): string {
  const trimmed = pathOrName?.trim();
  if (!trimmed) return fallback;
  return trimmed.split(/[\\/]/).filter(Boolean).pop() || fallback;
}

function normalizePreviewImageName(image: PreviewImage, fallback: string): PreviewImage {
  const originalName = getDisplayFileName(image.filePath || image.fileName, fallback);
  return {
    ...image,
    title: originalName,
    fileName: getDisplayFileName(image.fileName || image.filePath, originalName)
  };
}

function createResultPreviewImage(result: ProductShotResult): PreviewImage {
  return {
    src: window.productStudio.toFileUrl(result.imagePath),
    filePath: result.imagePath,
    title: getPresetName(result.presetId),
    subtitle: `${uiText.usedModel}: ${getModelDisplayName(result.providerId, result.modelId)}`,
    fileName: getDisplayFileName(result.imagePath, `${result.presetId}-${result.modelId}.png`)
  };
}

function createResultPreviewVideo(result: VideoGenerationResult): PreviewVideo {
  return {
    src: window.productStudio.toFileUrl(result.videoPath),
    filePath: result.videoPath,
    title: getVideoModelDisplayName(result.providerId, result.modelId),
    subtitle: `${result.aspectRatio} / ${result.durationSeconds}s / ${result.resolution}`,
    fileName: getDisplayFileName(result.videoPath, `${result.modelId}.mp4`)
  };
}

function createGalleryPreviewImage(item: PersonalGalleryItem): PreviewImage {
  return {
    src: window.productStudio.toFileUrl(item.imagePath),
    filePath: item.imagePath,
    title: item.title,
    subtitle: item.modelId && item.providerId
      ? `${uiText.usedModel}: ${getModelDisplayName(item.providerId, item.modelId)}`
      : uiText.galleryPage,
    fileName: getDisplayFileName(item.imagePath, `${item.title}.png`)
  };
}

function createGalleryPreviewVideo(item: PersonalGalleryItem): PreviewVideo {
  return {
    src: window.productStudio.toFileUrl(item.imagePath),
    filePath: item.imagePath,
    title: item.title,
    subtitle: item.modelId && item.providerId
      ? `${uiText.usedModel}: ${getVideoModelDisplayName(item.providerId, item.modelId)}`
      : uiText.galleryPage,
    fileName: getDisplayFileName(item.imagePath, `${item.title}.mp4`)
  };
}

function getGalleryMediaType(item: PersonalGalleryItem): MediaType {
  return item.mediaType ?? "image";
}

function buildComparisonLibraryImages(
  currentResults: ProductShotResult[],
  jobs: StudioJob[],
  galleryItems: PersonalGalleryItem[]
): ComparisonLibraryImage[] {
  const current = currentResults.map((result, index) =>
    createComparisonLibraryImage(
      createResultPreviewImage(result),
      "current",
      `current:${result.imagePath}:${index}`,
      result.createdAt
    )
  );
  const historyImages = jobs
    .filter(isImageJob)
    .flatMap((job) =>
      job.results.map((result, index) =>
        createComparisonLibraryImage(
          createResultPreviewImage(result),
          "history",
          `history:${job.id}:${result.imagePath}:${index}`,
          result.createdAt || job.createdAt
        )
      )
    )
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const gallery = galleryItems
    .filter((item) => getGalleryMediaType(item) === "image")
    .map((item) =>
      createComparisonLibraryImage(
        createGalleryPreviewImage(item),
        "gallery",
        `gallery:${item.id}`,
        item.createdAt
      )
    );
  return [...current, ...historyImages, ...gallery];
}

function createComparisonLibraryImage(
  image: PreviewImage,
  source: ComparisonLibrarySource,
  libraryId: string,
  createdAt: string
): ComparisonLibraryImage {
  return {
    ...image,
    libraryId,
    source,
    createdAt
  };
}

function isPreviewInteractiveDragTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest("button, input, textarea, select, .preview-compare-image"));
}

function PersonalGalleryPage(props: {
  items: PersonalGalleryItem[];
  selectedIds: string[];
  onSelectedIdsChange: (itemIds: string[]) => void;
  onPreview: (item: PersonalGalleryItem) => void;
  onCompare: (items: PersonalGalleryItem[]) => void;
  onReorder: (items: PersonalGalleryItem[]) => void;
  onRemove: (itemId: string) => void;
  onGalleryItemAdded: (item: PersonalGalleryItem) => void;
}) {
  const [viewMode, setViewMode] = useState<GalleryViewMode>("works");
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
  const selectedItems = props.items.filter((item) => props.selectedIds.includes(item.id));
  const selectedImageItems = selectedItems.filter((item) => getGalleryMediaType(item) === "image");
  const allSelected = props.items.length > 0 && props.items.every((item) => props.selectedIds.includes(item.id));

  function toggleSelected(itemId: string) {
    props.onSelectedIdsChange(
      props.selectedIds.includes(itemId)
        ? props.selectedIds.filter((selectedId) => selectedId !== itemId)
        : [...props.selectedIds, itemId]
    );
  }

  function reorder(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;
    const sourceIndex = props.items.findIndex((item) => item.id === sourceId);
    const targetIndex = props.items.findIndex((item) => item.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const nextItems = [...props.items];
    const [movedItem] = nextItems.splice(sourceIndex, 1);
    nextItems.splice(targetIndex, 0, movedItem);
    props.onReorder(nextItems);
  }

  function moveItem(itemId: string, direction: -1 | 1) {
    const currentIndex = props.items.findIndex((item) => item.id === itemId);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= props.items.length) return;
    reorder(itemId, props.items[targetIndex].id);
  }

  function startDrag(event: DragEvent<HTMLElement>, itemId: string) {
    if (event.target instanceof Element && event.target.closest("button, input, label")) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", itemId);
    setDraggedItemId(itemId);
  }

  function dropItem(event: DragEvent<HTMLElement>, targetId: string) {
    event.preventDefault();
    const sourceId = draggedItemId || event.dataTransfer.getData("text/plain");
    setDraggedItemId(null);
    setDragOverItemId(null);
    if (sourceId) reorder(sourceId, targetId);
  }

  return (
    <main className="page-workspace gallery-page">
      <header className="page-header gallery-page-header">
        <div>
          <h2>{uiText.galleryPage}</h2>
          <p>{viewMode === "works" ? `${props.items.length} 个收藏 / 电商发布顺序` : "自由画布 / 本地项目与图库素材"}</p>
        </div>
        <div className="gallery-toolbar">
          <div className="gallery-mode-switch" role="tablist" aria-label="个人图库视图">
            <button
              className={viewMode === "works" ? "active" : ""}
              onClick={() => setViewMode("works")}
              type="button"
            >
              <Images size={15} />
              图库作品
            </button>
            <button
              className={viewMode === "canvas" ? "active" : ""}
              onClick={() => setViewMode("canvas")}
              type="button"
            >
              <PenLine size={15} />
              自由画布
            </button>
          </div>
          {viewMode === "works" && props.items.length > 0 ? (
            <button
              className="secondary-button"
              onClick={() => props.onSelectedIdsChange(allSelected ? [] : props.items.map((item) => item.id))}
            >
              {allSelected ? <X size={15} /> : <Check size={15} />}
              {allSelected ? "取消全选" : "全选"}
            </button>
          ) : null}
          {viewMode === "works" && props.selectedIds.length > 0 ? (
            <button className="secondary-button" onClick={() => props.onSelectedIdsChange([])}>
              <X size={15} />
              清除选择
            </button>
          ) : null}
          {viewMode === "works" ? (
            <button
              className="primary-button"
              disabled={selectedImageItems.length < 2}
              onClick={() => props.onCompare(selectedImageItems)}
            >
              <LayoutGrid size={16} />
              对比 {selectedImageItems.length > 0 ? selectedImageItems.length : ""}
            </button>
          ) : null}
        </div>
      </header>

      {viewMode === "canvas" ? (
        <FreeCanvasWorkspace
          galleryItems={props.items}
          onGalleryItemAdded={props.onGalleryItemAdded}
          onExit={() => setViewMode("works")}
        />
      ) : props.items.length === 0 ? (
        <section className="gallery-empty">
          <Images size={32} />
          <h3>个人图库还是空的</h3>
          <p>可从生成结果或个人中心的历史作品加入图片和视频。</p>
        </section>
      ) : (
        <section className="gallery-grid" aria-label={uiText.galleryPage}>
          {props.items.map((item, index) => {
            const selected = props.selectedIds.includes(item.id);
            const mediaType = getGalleryMediaType(item);
            return (
              <article
                key={item.id}
                className={`gallery-card ${selected ? "selected" : ""} ${draggedItemId === item.id ? "dragging" : ""} ${dragOverItemId === item.id ? "drag-over" : ""}`}
                draggable
                onDragStart={(event) => startDrag(event, item.id)}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setDragOverItemId(item.id);
                }}
                onDrop={(event) => dropItem(event, item.id)}
                onDragEnd={() => {
                  setDraggedItemId(null);
                  setDragOverItemId(null);
                }}
              >
                <div className="gallery-card-topline">
                  <span className="gallery-order">{index + 1}</span>
                  <span className="gallery-drag-handle" title="调整顺序">
                    <GripVertical size={16} />
                  </span>
                  <label className="gallery-select" title="选择用于对比">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleSelected(item.id)}
                      aria-label={`选择 ${item.title}`}
                    />
                  </label>
                </div>
                <button className="gallery-image-button" onClick={() => props.onPreview(item)}>
                  {mediaType === "video" ? (
                    <>
                      <video src={window.productStudio.toFileUrl(item.imagePath)} muted preload="metadata" />
                      <span className="gallery-video-badge">
                        <Video size={14} />
                      </span>
                    </>
                  ) : (
                    <img src={window.productStudio.toFileUrl(item.imagePath)} alt={item.title} />
                  )}
                </button>
                <div className="gallery-card-meta">
                  <strong title={item.title}>{item.title}</strong>
                  <span title={item.modelId}>
                    {item.modelId && item.providerId
                      ? mediaType === "video"
                        ? getVideoModelDisplayName(item.providerId, item.modelId)
                        : getModelDisplayName(item.providerId, item.modelId)
                      : mediaType === "video"
                        ? "已收藏视频"
                        : "已收藏图片"}
                  </span>
                </div>
                <div className="gallery-card-actions">
                  <button
                    className="icon-button"
                    onClick={() => moveItem(item.id, -1)}
                    disabled={index === 0}
                    title="前移"
                  >
                    <ArrowLeft size={15} />
                  </button>
                  <button
                    className="icon-button"
                    onClick={() => moveItem(item.id, 1)}
                    disabled={index === props.items.length - 1}
                    title="后移"
                  >
                    <ArrowRight size={15} />
                  </button>
                  <button
                    className="icon-button danger"
                    onClick={() => props.onRemove(item.id)}
                    title="移出个人图库"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}

function FreeCanvasWorkspace(props: {
  galleryItems: PersonalGalleryItem[];
  onGalleryItemAdded: (item: PersonalGalleryItem) => void;
  onExit: () => void;
}) {
  const visibleStageRef = useRef<Konva.Stage>(null);
  const exportStageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragSnapshotRef = useRef<Record<string, { x: number; y: number }> | null>(null);
  const clipboardRef = useRef<CanvasNode[]>([]);
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null);
  const [stageSize, setStageSize] = useState({ width: 900, height: 620 });
  const [projects, setProjects] = useState<CanvasProjectSummary[]>([]);
  const [activeProject, setActiveProject] = useState<CanvasDraftProject>(() => createDraftCanvasProject());
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [tool, setTool] = useState<CanvasTool>("select");
  const [zoom, setZoom] = useState(0.55);
  const [pan, setPan] = useState({ x: 160, y: 60 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<{ x: number; y: number } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [undoStack, setUndoStack] = useState<CanvasSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<CanvasSnapshot[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("png");
  const [brushColor, setBrushColor] = useState("#8f5728");
  const [brushSize, setBrushSize] = useState(10);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [selectionBox, setSelectionBox] = useState<CanvasSelectionBox | null>(null);
  const [contextMenu, setContextMenu] = useState<CanvasContextMenuState>(null);
  const [isSpacePanning, setIsSpacePanning] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [aiPrompt, setAiPrompt] = useState("商品主图，柔和棚拍光线，高级质感");
  const canvasApiReady =
    typeof window.productStudio.listCanvasProjects === "function" &&
    typeof window.productStudio.saveCanvasProject === "function" &&
    typeof window.productStudio.exportCanvasImage === "function";
  const imageGalleryItems = props.galleryItems.filter((item) => getGalleryMediaType(item) === "image");
  const selectedNodes = activeProject.nodes.filter((node) => selectedIds.includes(node.id));
  const singleSelectedNode = selectedNodes.length === 1 ? selectedNodes[0] : null;

  useEffect(() => {
    if (!canvasApiReady) {
      setMessage("自由画布接口还未加载。请重新构建主进程并重启软件。");
      return;
    }
    let mounted = true;
    window.productStudio
      .listCanvasProjects()
      .then((items) => {
        if (mounted) setProjects(items);
      })
      .catch((error) => {
        if (mounted) setMessage(error instanceof Error ? error.message : "读取画布项目失败。");
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const resize = () => {
      setStageSize({
        width: Math.max(420, viewport.clientWidth),
        height: Math.max(420, viewport.clientHeight)
      });
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const stage = visibleStageRef.current;
    const transformer = transformerRef.current;
    if (!stage || !transformer) return;
    const selectedKonvaNodes = selectedIds
      .map((nodeId) => stage.findOne(`#canvas-node-${nodeId}`))
      .filter((node): node is Konva.Node => Boolean(node));
    transformer.nodes(selectedKonvaNodes);
    transformer.getLayer()?.batchDraw();
  }, [activeProject.nodes, selectedIds]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isCanvasTypingTarget(event.target)) return;
      const key = event.key.toLowerCase();
      if (event.code === "Space") {
        event.preventDefault();
        setIsSpacePanning(true);
      } else if ((event.ctrlKey || event.metaKey) && key === "z") {
        event.preventDefault();
        undoCanvas();
      } else if ((event.ctrlKey || event.metaKey) && (key === "y" || (event.shiftKey && key === "z"))) {
        event.preventDefault();
        redoCanvas();
      } else if ((event.ctrlKey || event.metaKey) && key === "c") {
        event.preventDefault();
        copySelectedNodes();
      } else if ((event.ctrlKey || event.metaKey) && key === "v") {
        event.preventDefault();
        pasteNodes();
      } else if ((event.ctrlKey || event.metaKey) && key === "d") {
        event.preventDefault();
        duplicateSelectedNodes();
      } else if ((event.ctrlKey || event.metaKey) && key === "a") {
        event.preventDefault();
        setSelectedIds(activeProject.nodes.filter((node) => node.visible && !node.locked).map((node) => node.id));
      } else if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelectedNodes();
      } else if (event.key === "Escape") {
        setSelectedIds([]);
        setContextMenu(null);
        setSelectionBox(null);
      } else if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        setZoom((value) => clamp(value + 0.1, 0.18, 2.6));
      } else if (event.key === "-") {
        event.preventDefault();
        setZoom((value) => clamp(value - 0.1, 0.18, 2.6));
      }
    }
    function handleKeyUp(event: KeyboardEvent) {
      if (event.code === "Space") {
        setIsSpacePanning(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  });

  function refreshProjects(nextActive?: CanvasProject) {
    if (!canvasApiReady) {
      setMessage("自由画布接口还未加载。请重新构建主进程并重启软件。");
      return Promise.resolve();
    }
    return window.productStudio.listCanvasProjects().then((items) => {
      setProjects(items);
      if (nextActive) {
        setActiveProject(nextActive);
        setDirty(false);
      }
    });
  }

  function rememberSnapshot() {
    setUndoStack((current) => [...current.slice(-39), snapshotProject(activeProject)]);
    setRedoStack([]);
    setDirty(true);
  }

  function replaceNodes(nextNodes: CanvasNode[]) {
    setActiveProject((current) => ({ ...current, nodes: nextNodes, updatedAt: new Date().toISOString() }));
  }

  function commitNodes(updater: (nodes: CanvasNode[]) => CanvasNode[]) {
    rememberSnapshot();
    replaceNodes(updater(activeProject.nodes));
  }

  function updateProjectPatch(patch: Partial<Pick<CanvasProject, "title" | "width" | "height" | "background">>) {
    rememberSnapshot();
    setActiveProject((current) => ({ ...current, ...patch, updatedAt: new Date().toISOString() }));
  }

  function updateNode(nodeId: string, patch: Partial<CanvasNode>) {
    replaceNodes(
      activeProject.nodes.map((node) =>
        node.id === nodeId ? normalizeCanvasNode({ ...node, ...patch } as CanvasNode, snapToGrid) : node
      )
    );
    setDirty(true);
  }

  async function openProject(projectId: string) {
    if (!canvasApiReady) {
      setMessage("自由画布接口还未加载。请重新构建主进程并重启软件。");
      return;
    }
    if (dirty) {
      setMessage("当前画布有未保存更改，请先保存再切换项目。");
      return;
    }
    setBusy(true);
    try {
      const project = await window.productStudio.getCanvasProject(projectId);
      if (!project) {
        setMessage("画布项目不存在。");
        return;
      }
      setActiveProject(project);
      setZoom(project.viewport?.zoom ?? 0.55);
      setPan({ x: project.viewport?.panX ?? 160, y: project.viewport?.panY ?? 60 });
      setShowGrid(project.gridEnabled ?? true);
      setSnapToGrid(project.snapEnabled ?? true);
      setSelectedIds((project.selectedNodeIds ?? []).filter((nodeId) => project.nodes.some((node) => node.id === nodeId)));
      setUndoStack([]);
      setRedoStack([]);
      setDirty(false);
      setMessage("已打开画布项目。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "打开画布项目失败。");
    } finally {
      setBusy(false);
    }
  }

  function createProject() {
    if (dirty) {
      setMessage("当前画布有未保存更改，请先保存再新建。");
      return;
    }
    setActiveProject(createDraftCanvasProject());
    setSelectedIds([]);
    setZoom(0.55);
    setPan({ x: 160, y: 60 });
    setShowGrid(true);
    setSnapToGrid(true);
    setUndoStack([]);
    setRedoStack([]);
    setDirty(false);
    setMessage("已新建空白自由画布。");
  }

  async function saveProject() {
    if (!canvasApiReady) {
      setMessage("自由画布接口还未加载。请重新构建主进程并重启软件。");
      return;
    }
    setBusy(true);
    try {
      const thumbnailDataUrl = createCanvasDataUrl("png", 0.18);
      const saved = await window.productStudio.saveCanvasProject({
        id: activeProject.draft ? undefined : activeProject.id,
        title: activeProject.title,
        width: activeProject.width,
        height: activeProject.height,
        background: activeProject.background,
        nodes: activeProject.nodes,
        viewport: { zoom, panX: pan.x, panY: pan.y },
        gridEnabled: showGrid,
        snapEnabled: snapToGrid,
        selectedNodeIds: selectedIds,
        thumbnailDataUrl
      });
      await refreshProjects(saved);
      setActiveProject({ ...saved, draft: false });
      setMessage("自由画布已保存。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存自由画布失败。");
    } finally {
      setBusy(false);
    }
  }

  async function duplicateProject(projectId: string) {
    if (!canvasApiReady) {
      setMessage("自由画布接口还未加载。请重新构建主进程并重启软件。");
      return;
    }
    setBusy(true);
    try {
      const duplicated = await window.productStudio.duplicateCanvasProject(projectId);
      await refreshProjects(duplicated);
      setMessage("已复制画布项目。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "复制画布项目失败。");
    } finally {
      setBusy(false);
    }
  }

  async function deleteProject(projectId: string) {
    if (!canvasApiReady) {
      setMessage("自由画布接口还未加载。请重新构建主进程并重启软件。");
      return;
    }
    setBusy(true);
    try {
      await window.productStudio.deleteCanvasProject(projectId);
      await refreshProjects();
      if (activeProject.id === projectId) {
        setActiveProject(createDraftCanvasProject());
        setSelectedIds([]);
        setDirty(false);
      }
      setMessage("画布项目已删除。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "删除画布项目失败。");
    } finally {
      setBusy(false);
    }
  }

  async function addLocalImage(point?: { x: number; y: number }) {
    try {
      const imported = await window.productStudio.selectImage();
      if (!imported) return;
      if (point) {
        addImageNodeAtPoint(imported.sourceImagePath, imported.dimensions.width, imported.dimensions.height, "本地图片", point);
        return;
      }
      addImageNode(imported.sourceImagePath, imported.dimensions.width, imported.dimensions.height, "本地图片");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "导入图片失败。");
    }
  }

  function getDropCanvasPoint(event: DragEvent<HTMLElement>) {
    const viewport = viewportRef.current;
    if (!viewport) {
      return { x: activeProject.width / 2, y: activeProject.height / 2 };
    }
    const rect = viewport.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left - pan.x) / zoom,
      y: (event.clientY - rect.top - pan.y) / zoom
    };
  }

  async function importDroppedImageFile(file: File, point: { x: number; y: number }) {
    const filePath = window.productStudio.getFilePath(file);
    if (!filePath) {
      setMessage("无法读取拖入图片路径，请使用左侧导入按钮。");
      return;
    }
    const imported = await window.productStudio.importImage(filePath);
    addImageNodeAtPoint(
      imported.sourceImagePath,
      imported.dimensions.width,
      imported.dimensions.height,
      file.name || "拖入图片",
      point
    );
  }

  async function handleCanvasDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const point = getDropCanvasPoint(event);
    const galleryPayload = event.dataTransfer.getData("application/x-product-shot-gallery-image");
    if (galleryPayload) {
      try {
        const item = JSON.parse(galleryPayload) as Pick<PersonalGalleryItem, "imagePath" | "title">;
        addImageNodeAtPoint(item.imagePath, 900, 900, item.title || "图库图片", point);
        return;
      } catch {
        setMessage("图库图片拖入失败。");
        return;
      }
    }

    const imageFiles = Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      setMessage("请拖入 PNG、JPG 或 WebP 图片。");
      return;
    }
    try {
      await Promise.all(
        imageFiles.map((file, index) =>
          importDroppedImageFile(file, { x: point.x + index * 28, y: point.y + index * 28 })
        )
      );
      setMessage(`已拖入 ${imageFiles.length} 张图片。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "拖入图片失败。");
    }
  }

  function addGalleryImage(item: PersonalGalleryItem) {
    addImageNode(item.imagePath, 900, 900, item.title);
  }

  function addImageNode(sourcePath: string, naturalWidth: number, naturalHeight: number, name: string) {
    const maxWidth = Math.min(420, activeProject.width * 0.55);
    const ratio = naturalWidth > 0 && naturalHeight > 0 ? naturalHeight / naturalWidth : 1;
    const width = maxWidth;
    const height = Math.max(80, width * ratio);
    commitNodes((nodes) => [
      ...nodes,
      {
        id: createCanvasId(),
        type: "image",
        name,
        x: activeProject.width / 2 - width / 2,
        y: activeProject.height / 2 - height / 2,
        width,
        height,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        sourcePath,
        naturalWidth,
        naturalHeight
      }
    ]);
  }

  function addImageNodeAtPoint(sourcePath: string, naturalWidth: number, naturalHeight: number, name: string, point: { x: number; y: number }) {
    const maxWidth = Math.min(420, activeProject.width * 0.55);
    const ratio = naturalWidth > 0 && naturalHeight > 0 ? naturalHeight / naturalWidth : 1;
    const width = maxWidth;
    const height = Math.max(80, width * ratio);
    commitNodes((nodes) => [
      ...nodes,
      {
        id: createCanvasId(),
        type: "image",
        name,
        x: point.x - width / 2,
        y: point.y - height / 2,
        width,
        height,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        sourcePath,
        naturalWidth,
        naturalHeight
      }
    ]);
  }

  function addTextNode(point?: { x: number; y: number }) {
    const x = point?.x ?? activeProject.width / 2 - 160;
    const y = point?.y ?? activeProject.height / 2 - 40;
    commitNodes((nodes) => [
      ...nodes,
      {
        id: createCanvasId(),
        type: "text",
        name: "文字",
        x,
        y,
        width: 320,
        height: 80,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        text: "双击编辑文字",
        fontFamily: "Microsoft YaHei",
        fontSize: 44,
        fontStyle: "bold",
        align: "center",
        fill: "#2f241b",
        stroke: "#ffffff",
        strokeWidth: 0,
        shadowColor: "#7b4b26",
        shadowBlur: 0
      }
    ]);
  }

  function addShapeNode(shapeType: CanvasShapeNode["shapeType"], point?: { x: number; y: number }) {
    const x = point?.x ?? activeProject.width / 2 - 120;
    const y = point?.y ?? activeProject.height / 2 - 90;
    commitNodes((nodes) => [
      ...nodes,
      {
        id: createCanvasId(),
        type: "shape",
        shapeType,
        name: shapeType === "circle" ? "圆形" : shapeType === "arrow" ? "箭头" : shapeType === "line" ? "线条" : "矩形",
        x,
        y,
        width: shapeType === "line" || shapeType === "arrow" ? 260 : 240,
        height: shapeType === "line" || shapeType === "arrow" ? 0 : 180,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        fill: shapeType === "line" || shapeType === "arrow" ? "transparent" : "#f4d7ad",
        stroke: "#b66c32",
        strokeWidth: 4,
        cornerRadius: shapeType === "rect" ? 18 : 999
      }
    ]);
  }

  function addNoteNode(point?: { x: number; y: number }) {
    const x = point?.x ?? activeProject.width / 2 - 150;
    const y = point?.y ?? activeProject.height / 2 - 100;
    commitNodes((nodes) => [
      ...nodes,
      {
        id: createCanvasId(),
        type: "note",
        name: "便签",
        x,
        y,
        width: 300,
        height: 200,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        text: "输入想法、提示词或制作备注",
        fill: "#fff1cc",
        stroke: "#d39a4c",
        strokeWidth: 2,
        fontSize: 26,
        fontFamily: "Microsoft YaHei"
      }
    ]);
  }

  function addConnectorNode(point?: { x: number; y: number }) {
    const x = point?.x ?? activeProject.width / 2 - 140;
    const y = point?.y ?? activeProject.height / 2 - 70;
    commitNodes((nodes) => [
      ...nodes,
      {
        id: createCanvasId(),
        type: "connector",
        name: "连接线",
        x,
        y,
        width: 280,
        height: 140,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        stroke: "#b66c32",
        strokeWidth: 5,
        label: ""
      }
    ]);
  }

  function addAiTaskNode(point?: { x: number; y: number }) {
    const x = point?.x ?? activeProject.width / 2 - 190;
    const y = point?.y ?? activeProject.height / 2 - 115;
    commitNodes((nodes) => [
      ...nodes,
      {
        id: createCanvasId(),
        type: "aiTask",
        name: "AI 任务",
        x,
        y,
        width: 380,
        height: 230,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        prompt: aiPrompt,
        status: "draft",
        sourceNodeIds: selectedIds
      }
    ]);
  }

  function duplicateSelectedNodes() {
    if (selectedNodes.length === 0) {
      setMessage("请先选择要复制的元素。");
      return;
    }
    const duplicated = selectedNodes.map((node) => ({
      ...node,
      id: createCanvasId(),
      name: `${node.name} 副本`,
      x: node.x + 32,
      y: node.y + 32,
      groupId: undefined
    })) as CanvasNode[];
    commitNodes((nodes) => [...nodes, ...duplicated]);
    setSelectedIds(duplicated.map((node) => node.id));
  }

  function fitCanvasToView() {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const nextZoom = clamp(
      Math.min((viewport.clientWidth - 120) / activeProject.width, (viewport.clientHeight - 120) / activeProject.height),
      0.18,
      1.6
    );
    setZoom(nextZoom);
    setPan({
      x: (viewport.clientWidth - activeProject.width * nextZoom) / 2,
      y: (viewport.clientHeight - activeProject.height * nextZoom) / 2
    });
  }

  function handleStageMouseDown(event: Konva.KonvaEventObject<globalThis.MouseEvent>) {
    const stage = visibleStageRef.current;
    if (!stage) return;
    setContextMenu(null);
    if (tool === "pan" || isSpacePanning || event.evt.button === 1) {
      const pointer = stage.getPointerPosition();
      if (pointer) {
        setIsPanning(true);
        setLastPanPoint(pointer);
      }
      return;
    }
    const isStageClick = event.target === stage || event.target.name() === "canvas-background";
    const point = getCanvasPoint(stage, pan, zoom);
    if (!point) return;
    if (tool === "text") {
      addTextNode(point);
      setTool("select");
      return;
    }
    if (tool === "note") {
      addNoteNode(point);
      setTool("select");
      return;
    }
    if (tool === "rect" || tool === "circle" || tool === "line" || tool === "arrow") {
      addShapeNode(tool, point);
      setTool("select");
      return;
    }
    if (tool === "connector") {
      addConnectorNode(point);
      setTool("select");
      return;
    }
    if (tool === "aiTask") {
      addAiTaskNode(point);
      setTool("select");
      return;
    }
    if (tool === "brush" || tool === "eraser") {
      rememberSnapshot();
      setIsDrawing(true);
      const drawNode: CanvasNode = {
        id: createCanvasId(),
        type: "freehand",
        name: tool === "eraser" ? "橡皮擦" : "画笔",
        x: 0,
        y: 0,
        width: activeProject.width,
        height: activeProject.height,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        points: [point.x, point.y],
        stroke: tool === "eraser" ? "#ffffff" : brushColor,
        strokeWidth: brushSize,
        compositeOperation: tool === "eraser" ? "destination-out" : "source-over"
      };
      replaceNodes([...activeProject.nodes, drawNode]);
      return;
    }
    if (isStageClick) {
      if (!event.evt.shiftKey && !event.evt.ctrlKey && !event.evt.metaKey) {
        setSelectedIds([]);
      }
      selectionStartRef.current = point;
      setSelectionBox({ x: point.x, y: point.y, width: 0, height: 0 });
    }
  }

  function handleStageMouseMove() {
    const stage = visibleStageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    if (isPanning && lastPanPoint) {
      setPan((current) => ({
        x: current.x + pointer.x - lastPanPoint.x,
        y: current.y + pointer.y - lastPanPoint.y
      }));
      setLastPanPoint(pointer);
      return;
    }
    if (selectionStartRef.current) {
      const point = getCanvasPoint(stage, pan, zoom);
      if (!point) return;
      const start = selectionStartRef.current;
      setSelectionBox(normalizeSelectionBox(start, point));
      return;
    }
    if (!isDrawing) return;
    const point = getCanvasPoint(stage, pan, zoom);
    if (!point) return;
    setActiveProject((current) => {
      const nextNodes = current.nodes.map((node, index) => {
        if (index !== current.nodes.length - 1 || (node.type !== "draw" && node.type !== "freehand")) return node;
        return { ...node, points: [...node.points, point.x, point.y] };
      });
      return { ...current, nodes: nextNodes, updatedAt: new Date().toISOString() };
    });
    setDirty(true);
  }

  function handleStageMouseUp(event?: Konva.KonvaEventObject<globalThis.MouseEvent>) {
    setIsPanning(false);
    setLastPanPoint(null);
    setIsDrawing(false);
    if (selectionStartRef.current && selectionBox) {
      const hasArea = Math.abs(selectionBox.width) > 8 || Math.abs(selectionBox.height) > 8;
      if (hasArea) {
        const matches = activeProject.nodes
          .filter((node) => node.visible && !node.locked && rectanglesIntersect(selectionBox, getCanvasNodeBounds(node)))
          .map((node) => node.id);
        if (event?.evt.shiftKey || event?.evt.ctrlKey || event?.evt.metaKey) {
          setSelectedIds((current) => Array.from(new Set([...current, ...matches])));
        } else {
          setSelectedIds(matches);
        }
      }
    }
    selectionStartRef.current = null;
    setSelectionBox(null);
  }

  function handleWheel(event: Konva.KonvaEventObject<globalThis.WheelEvent>) {
    event.evt.preventDefault();
    const stage = visibleStageRef.current;
    const pointer = stage?.getPointerPosition();
    if (!pointer) return;
    const scaleBy = 1.06;
    const oldZoom = zoom;
    const nextZoom = clamp(event.evt.deltaY > 0 ? oldZoom / scaleBy : oldZoom * scaleBy, 0.18, 2.6);
    const mousePointTo = {
      x: (pointer.x - pan.x) / oldZoom,
      y: (pointer.y - pan.y) / oldZoom
    };
    setZoom(nextZoom);
    setPan({
      x: pointer.x - mousePointTo.x * nextZoom,
      y: pointer.y - mousePointTo.y * nextZoom
    });
  }

  function handleStageContextMenu(event: Konva.KonvaEventObject<globalThis.PointerEvent>) {
    event.evt.preventDefault();
    const stage = visibleStageRef.current;
    if (!stage) return;
    const point = getCanvasPoint(stage, pan, zoom);
    const nodeId = getCanvasNodeIdFromKonvaNode(event.target);
    if (nodeId && !selectedIds.includes(nodeId)) {
      const node = activeProject.nodes.find((item) => item.id === nodeId);
      if (node) handleNodeSelect(node, false);
    }
    setContextMenu({
      x: event.evt.clientX,
      y: event.evt.clientY,
      canvasX: point?.x ?? activeProject.width / 2,
      canvasY: point?.y ?? activeProject.height / 2
    });
  }

  function lockSelectedNodes(locked: boolean) {
    if (selectedIds.length === 0) return;
    commitNodes((nodes) => nodes.map((node) => (selectedIds.includes(node.id) ? { ...node, locked } : node)));
  }

  function hideSelectedNodes() {
    if (selectedIds.length === 0) return;
    commitNodes((nodes) => nodes.map((node) => (selectedIds.includes(node.id) ? { ...node, visible: false } : node)));
    setSelectedIds([]);
  }

  function handleNodeSelect(node: CanvasNode, additive: boolean) {
    if (node.locked) return;
    const groupIds = node.groupId ? activeProject.nodes.filter((item) => item.groupId === node.groupId).map((item) => item.id) : [node.id];
    setSelectedIds((current) => {
      if (additive) {
        const next = new Set(current);
        groupIds.forEach((id) => next.add(id));
        return Array.from(next);
      }
      return groupIds;
    });
  }

  function handleNodeDragStart() {
    rememberSnapshot();
    dragSnapshotRef.current = Object.fromEntries(activeProject.nodes.map((node) => [node.id, { x: node.x, y: node.y }]));
  }

  function handleNodeDragMove(nodeId: string, nextPosition: { x: number; y: number }) {
    const snapshot = dragSnapshotRef.current;
    if (!snapshot) return;
    const origin = snapshot[nodeId];
    if (!origin) return;
    const dx = nextPosition.x - origin.x;
    const dy = nextPosition.y - origin.y;
    const selectedSet = new Set(selectedIds.includes(nodeId) ? selectedIds : [nodeId]);
    replaceNodes(
      activeProject.nodes.map((node) => {
        if (!selectedSet.has(node.id)) return node;
        const start = snapshot[node.id] ?? { x: node.x, y: node.y };
        return normalizeCanvasNode({ ...node, x: start.x + dx, y: start.y + dy } as CanvasNode, snapToGrid);
      })
    );
  }

  function handleNodeDragEnd() {
    dragSnapshotRef.current = null;
  }

  function deleteSelectedNodes() {
    if (selectedIds.length === 0) return;
    commitNodes((nodes) => nodes.filter((node) => !selectedIds.includes(node.id)));
    setSelectedIds([]);
  }

  function copySelectedNodes() {
    clipboardRef.current = selectedNodes.map((node) => ({ ...node }));
    setMessage(clipboardRef.current.length > 0 ? `已复制 ${clipboardRef.current.length} 个元素。` : "请先选择元素。");
  }

  function pasteNodes() {
    if (clipboardRef.current.length === 0) return;
    const pasted = clipboardRef.current.map((node) => ({
      ...node,
      id: createCanvasId(),
      name: `${node.name} 副本`,
      x: node.x + 28,
      y: node.y + 28,
      groupId: undefined
    })) as CanvasNode[];
    commitNodes((nodes) => [...nodes, ...pasted]);
    setSelectedIds(pasted.map((node) => node.id));
  }

  function moveLayer(direction: "front" | "back" | "forward" | "backward") {
    if (selectedIds.length === 0) return;
    commitNodes((nodes) => reorderCanvasNodes(nodes, selectedIds, direction));
  }

  function alignSelected(kind: "left" | "center" | "right" | "top" | "middle" | "bottom") {
    if (selectedIds.length < 2) return;
    const bounds = selectedNodes.map(getCanvasNodeBounds);
    const left = Math.min(...bounds.map((item) => item.x));
    const top = Math.min(...bounds.map((item) => item.y));
    const right = Math.max(...bounds.map((item) => item.x + item.width));
    const bottom = Math.max(...bounds.map((item) => item.y + item.height));
    commitNodes((nodes) =>
      nodes.map((node) => {
        if (!selectedIds.includes(node.id)) return node;
        if (kind === "left") return { ...node, x: left };
        if (kind === "center") return { ...node, x: (left + right) / 2 - getCanvasNodeBounds(node).width / 2 };
        if (kind === "right") return { ...node, x: right - getCanvasNodeBounds(node).width };
        if (kind === "top") return { ...node, y: top };
        if (kind === "middle") return { ...node, y: (top + bottom) / 2 - getCanvasNodeBounds(node).height / 2 };
        return { ...node, y: bottom - getCanvasNodeBounds(node).height };
      })
    );
  }

  function groupSelectedNodes() {
    if (selectedIds.length < 2) return;
    const groupId = createCanvasId();
    commitNodes((nodes) => nodes.map((node) => (selectedIds.includes(node.id) ? { ...node, groupId } : node)));
  }

  function ungroupSelectedNodes() {
    if (selectedIds.length === 0) return;
    const selectedGroupIds = new Set(selectedNodes.map((node) => node.groupId).filter(Boolean));
    commitNodes((nodes) => nodes.map((node) => (node.groupId && selectedGroupIds.has(node.groupId) ? { ...node, groupId: undefined } : node)));
  }

  function undoCanvas() {
    setUndoStack((current) => {
      const previous = current[current.length - 1];
      if (!previous) return current;
      setRedoStack((redo) => [...redo, snapshotProject(activeProject)]);
      setActiveProject((project) => ({ ...project, ...previous, updatedAt: new Date().toISOString() }));
      setSelectedIds([]);
      setDirty(true);
      return current.slice(0, -1);
    });
  }

  function redoCanvas() {
    setRedoStack((current) => {
      const next = current[current.length - 1];
      if (!next) return current;
      setUndoStack((undo) => [...undo, snapshotProject(activeProject)]);
      setActiveProject((project) => ({ ...project, ...next, updatedAt: new Date().toISOString() }));
      setSelectedIds([]);
      setDirty(true);
      return current.slice(0, -1);
    });
  }

  function createCanvasDataUrl(format: ExportFormat, pixelRatio = 1) {
    const stage = exportStageRef.current;
    if (!stage) {
      throw new Error("Canvas is not ready.");
    }
    return stage.toDataURL({
      x: 0,
      y: 0,
      width: activeProject.width,
      height: activeProject.height,
      pixelRatio,
      mimeType: format === "jpg" ? "image/jpeg" : `image/${format}`,
      quality: 0.94
    });
  }

  async function exportCanvas() {
    if (!canvasApiReady) {
      setMessage("自由画布接口还未加载。请重新构建主进程并重启软件。");
      return;
    }
    setBusy(true);
    try {
      const imagePath = await window.productStudio.exportCanvasImage({
        dataUrl: createCanvasDataUrl(exportFormat),
        title: activeProject.title,
        format: exportFormat
      });
      setMessage(`已导出：${imagePath.imagePath}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "导出自由画布失败。");
    } finally {
      setBusy(false);
    }
  }

  async function addRenderToGallery() {
    if (!canvasApiReady || typeof window.productStudio.addCanvasRenderToGallery !== "function") {
      setMessage("自由画布接口还未加载。请重新构建主进程并重启软件。");
      return;
    }
    setBusy(true);
    try {
      const item = await window.productStudio.addCanvasRenderToGallery({
        dataUrl: createCanvasDataUrl(exportFormat),
        title: activeProject.title || "自由画布作品",
        format: exportFormat
      });
      props.onGalleryItemAdded(item);
      setMessage("当前画布已加入个人图库。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "加入个人图库失败。");
    } finally {
      setBusy(false);
    }
  }

  const canvasTransform = { x: pan.x, y: pan.y, scaleX: zoom, scaleY: zoom };
  const layerNodes = activeProject.nodes.filter((node) => node.visible);
  const workspaceClassName = [
    "canvas-workspace",
    leftPanelOpen ? "canvas-left-open" : "canvas-left-closed",
    rightPanelOpen ? "canvas-right-open" : "canvas-right-closed"
  ].join(" ");

  return (
    <section className={workspaceClassName}>
      <aside className={`canvas-side-panel canvas-projects-panel ${leftPanelOpen ? "" : "collapsed"}`}>
        <div className="canvas-panel-heading">
          <strong>画布项目</strong>
          <button className="icon-button" onClick={createProject} title="新建画布" disabled={busy}>
            <Plus size={15} />
          </button>
        </div>
        <div className="canvas-project-list">
          {projects.length === 0 ? (
            <div className="canvas-empty-note">暂无已保存项目。保存当前画布后会出现在这里。</div>
          ) : (
            projects.map((project) => (
              <article
                key={project.id}
                className={`canvas-project-card ${activeProject.id === project.id ? "active" : ""}`}
              >
                <button onClick={() => void openProject(project.id)} disabled={busy}>
                  {project.thumbnailPath ? (
                    <img src={window.productStudio.toFileUrl(project.thumbnailPath)} alt={project.title} />
                  ) : (
                    <span className="canvas-project-placeholder">
                      <PenLine size={20} />
                    </span>
                  )}
                  <span>
                    <strong>{project.title}</strong>
                    <small>
                      {project.width} x {project.height}
                    </small>
                  </span>
                </button>
                <div className="canvas-project-actions">
                  <button className="icon-button" onClick={() => void duplicateProject(project.id)} title="复制项目">
                    <Copy size={14} />
                  </button>
                  <button className="icon-button danger" onClick={() => void deleteProject(project.id)} title="删除项目">
                    <Trash2 size={14} />
                  </button>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="canvas-panel-heading">
          <strong>工具</strong>
        </div>
        <div className="canvas-tool-grid">
          {[
            { id: "select", label: "选择", icon: <MousePointer2 size={16} /> },
            { id: "pan", label: "拖动", icon: <Move size={16} /> },
            { id: "text", label: "文字", icon: <Edit3 size={16} /> },
            { id: "note", label: "便签", icon: <RectangleVertical size={16} /> },
            { id: "rect", label: "矩形", icon: <Square size={16} /> },
            { id: "circle", label: "圆形", icon: <CircleAlert size={16} /> },
            { id: "line", label: "线条", icon: <RectangleHorizontal size={16} /> },
            { id: "arrow", label: "箭头", icon: <ArrowRight size={16} /> },
            { id: "connector", label: "连接", icon: <MapPin size={16} /> },
            { id: "brush", label: "画笔", icon: <Brush size={16} /> },
            { id: "eraser", label: "橡皮", icon: <Eraser size={16} /> },
            { id: "aiTask", label: "AI节点", icon: <Sparkles size={16} /> }
          ].map((item) => (
            <button
              key={item.id}
              className={tool === item.id ? "active" : ""}
              onClick={() => setTool(item.id as CanvasTool)}
              type="button"
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <div className="canvas-ai-seed">
          <label>
            AI 节点提示词
            <textarea value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} />
          </label>
          <button className="secondary-button" type="button" onClick={() => addAiTaskNode()}>
            <Sparkles size={14} />
            插入任务节点
          </button>
        </div>

        <div className="canvas-panel-heading">
          <strong>图库素材</strong>
          <button className="icon-button" onClick={() => void addLocalImage()} title="导入本地图片">
            <ImagePlus size={15} />
          </button>
        </div>
        <div className="canvas-asset-list">
          {imageGalleryItems.length === 0 ? (
            <div className="canvas-empty-note">个人图库中暂无图片素材。</div>
          ) : (
            imageGalleryItems.slice(0, 30).map((item) => (
              <button
                key={item.id}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "copy";
                  event.dataTransfer.setData(
                    "application/x-product-shot-gallery-image",
                    JSON.stringify({ imagePath: item.imagePath, title: item.title })
                  );
                }}
                onClick={() => addGalleryImage(item)}
                title={`插入 ${item.title}`}
              >
                <img src={window.productStudio.toFileUrl(item.imagePath)} alt={item.title} />
                <span>{item.title}</span>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="canvas-editor">
        <div className="canvas-topbar">
          <div className="canvas-title-strip">
            <button className="icon-button" onClick={() => setLeftPanelOpen((value) => !value)} title={leftPanelOpen ? "收起素材面板" : "展开素材面板"}>
              <Layers size={15} />
            </button>
            <input
              className="canvas-title-input"
              value={activeProject.title}
              onChange={(event) => {
                setActiveProject((current) => ({ ...current, title: event.target.value }));
                setDirty(true);
              }}
              aria-label="画布标题"
            />
            <button className="icon-button" onClick={() => setRightPanelOpen((value) => !value)} title={rightPanelOpen ? "收起属性面板" : "展开属性面板"}>
              <Settings size={15} />
            </button>
          </div>
          <div className="canvas-topbar-actions">
            <button className="secondary-button" onClick={props.onExit} type="button">
              <ArrowLeft size={15} />
              退出画布
            </button>
            <button className="secondary-button" onClick={undoCanvas} disabled={undoStack.length === 0 || busy}>
              <RotateCcw size={15} />
              撤销
            </button>
            <button className="secondary-button" onClick={redoCanvas} disabled={redoStack.length === 0 || busy}>
              <Redo2 size={15} />
              重做
            </button>
            <button className="secondary-button" onClick={() => setZoom((value) => clamp(value - 0.1, 0.18, 2.2))}>
              <ZoomOut size={15} />
            </button>
            <span className="canvas-zoom-label">{Math.round(zoom * 100)}%</span>
            <button className="secondary-button" onClick={() => setZoom((value) => clamp(value + 0.1, 0.18, 2.6))}>
              <ZoomIn size={15} />
            </button>
            <button className="secondary-button" onClick={fitCanvasToView} type="button">
              适配
            </button>
            <button className="secondary-button" onClick={() => setZoom(1)} type="button">
              100%
            </button>
            <label className="canvas-inline-toggle">
              <input type="checkbox" checked={showGrid} onChange={(event) => setShowGrid(event.target.checked)} />
              网格
            </label>
            <label className="canvas-inline-toggle">
              <input type="checkbox" checked={snapToGrid} onChange={(event) => setSnapToGrid(event.target.checked)} />
              吸附
            </label>
            <select value={exportFormat} onChange={(event) => setExportFormat(event.target.value as ExportFormat)}>
              {canvasExportFormats.map((format) => (
                <option key={format} value={format}>
                  {format.toUpperCase()}
                </option>
              ))}
            </select>
            <button className="secondary-button" onClick={() => void exportCanvas()} disabled={busy}>
              <Download size={15} />
              导出
            </button>
            <button className="secondary-button" onClick={() => void addRenderToGallery()} disabled={busy}>
              <FolderPlus size={15} />
              加入图库
            </button>
            <button className="primary-button" onClick={() => void saveProject()} disabled={busy}>
              <Save size={15} />
              {dirty ? "保存*" : "保存"}
            </button>
          </div>
        </div>

        {message ? <div className="canvas-message">{message}</div> : null}

        <div
          className={`canvas-stage-shell ${isPanning || isSpacePanning || tool === "pan" ? "panning" : ""}`}
          ref={viewportRef}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
          }}
          onDrop={(event) => void handleCanvasDrop(event)}
        >
          <Stage
            ref={visibleStageRef}
            width={stageSize.width}
            height={stageSize.height}
            onMouseDown={handleStageMouseDown}
            onMouseMove={handleStageMouseMove}
            onMouseUp={handleStageMouseUp}
            onMouseLeave={handleStageMouseUp}
            onWheel={handleWheel}
            onContextMenu={handleStageContextMenu}
          >
            <Layer {...canvasTransform}>
              <Rect
                name="canvas-background"
                x={0}
                y={0}
                width={activeProject.width}
                height={activeProject.height}
                fill={activeProject.background}
                shadowColor="rgba(89, 57, 26, 0.28)"
                shadowBlur={24}
                shadowOffset={{ x: 0, y: 18 }}
              />
              {showGrid ? <CanvasGrid width={activeProject.width} height={activeProject.height} /> : null}
              {layerNodes.map((node) => (
                <CanvasNodeView
                  key={node.id}
                  node={node}
                  interactive
                  selected={selectedIds.includes(node.id)}
                  onSelect={(additive) => handleNodeSelect(node, additive)}
                  onChange={(patch) => updateNode(node.id, patch)}
                  onDragStart={handleNodeDragStart}
                  onDragMove={(position) => handleNodeDragMove(node.id, position)}
                  onDragEnd={handleNodeDragEnd}
                />
              ))}
              {selectionBox ? (
                <Rect
                  x={selectionBox.x}
                  y={selectionBox.y}
                  width={selectionBox.width}
                  height={selectionBox.height}
                  fill="rgba(217, 161, 90, 0.14)"
                  stroke="#b66c32"
                  strokeWidth={1}
                  dash={[10, 6]}
                  listening={false}
                />
              ) : null}
              <Transformer
                ref={transformerRef}
                rotateEnabled
                enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right", "middle-left", "middle-right"]}
                boundBoxFunc={(_oldBox, newBox) => (newBox.width < 12 || newBox.height < 12 ? _oldBox : newBox)}
              />
            </Layer>
          </Stage>
          {activeProject.nodes.length === 0 ? (
            <div className="canvas-empty-overlay">
              <strong>把图片拖到这里开始</strong>
              <span>也可以从左侧图库、工具栏或右键菜单添加文字、便签、形状和 AI 任务节点。</span>
            </div>
          ) : null}
          {contextMenu ? (
            <div className="canvas-context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
              <button onClick={() => { addTextNode({ x: contextMenu.canvasX, y: contextMenu.canvasY }); setContextMenu(null); }}>添加文字</button>
              <button onClick={() => { addNoteNode({ x: contextMenu.canvasX, y: contextMenu.canvasY }); setContextMenu(null); }}>添加便签</button>
              <button onClick={() => { addConnectorNode({ x: contextMenu.canvasX, y: contextMenu.canvasY }); setContextMenu(null); }}>添加连接线</button>
              <button onClick={() => { addAiTaskNode({ x: contextMenu.canvasX, y: contextMenu.canvasY }); setContextMenu(null); }}>添加 AI 节点</button>
              <button onClick={() => { void addLocalImage({ x: contextMenu.canvasX, y: contextMenu.canvasY }); setContextMenu(null); }}>导入图片到这里</button>
              <hr />
              <button onClick={() => { duplicateSelectedNodes(); setContextMenu(null); }} disabled={selectedIds.length === 0}>复制所选</button>
              <button onClick={() => { moveLayer("front"); setContextMenu(null); }} disabled={selectedIds.length === 0}>置顶</button>
              <button onClick={() => { moveLayer("back"); setContextMenu(null); }} disabled={selectedIds.length === 0}>置底</button>
              <button onClick={() => { lockSelectedNodes(true); setContextMenu(null); }} disabled={selectedIds.length === 0}>锁定</button>
              <button onClick={() => { hideSelectedNodes(); setContextMenu(null); }} disabled={selectedIds.length === 0}>隐藏</button>
              <button className="danger" onClick={() => { deleteSelectedNodes(); setContextMenu(null); }} disabled={selectedIds.length === 0}>删除</button>
            </div>
          ) : null}
        </div>
      </section>

      <aside className={`canvas-side-panel canvas-inspector-panel ${rightPanelOpen ? "" : "collapsed"}`}>
        <CanvasLayerPanel
          nodes={activeProject.nodes}
          selectedIds={selectedIds}
          onSelect={(nodeId) => setSelectedIds([nodeId])}
          onToggle={(nodeId, patch) => {
            rememberSnapshot();
            updateNode(nodeId, patch);
          }}
          onReorder={moveLayer}
        />

        <div className="canvas-panel-heading">
          <strong>属性</strong>
        </div>
        <CanvasInspector
          project={activeProject}
          selectedNode={singleSelectedNode}
          selectedCount={selectedIds.length}
          brushColor={brushColor}
          brushSize={brushSize}
          onProjectChange={updateProjectPatch}
          onBrushColorChange={setBrushColor}
          onBrushSizeChange={setBrushSize}
          onNodeCommit={(patch) => {
            if (!singleSelectedNode) return;
            rememberSnapshot();
            updateNode(singleSelectedNode.id, patch);
          }}
          onDelete={deleteSelectedNodes}
          onCopy={copySelectedNodes}
          onPaste={pasteNodes}
          onGroup={groupSelectedNodes}
          onUngroup={ungroupSelectedNodes}
          onAlign={alignSelected}
          onLayerMove={moveLayer}
        />
      </aside>

      <div className="canvas-export-stage" aria-hidden="true">
        <Stage ref={exportStageRef} width={activeProject.width} height={activeProject.height}>
          <Layer>
            <Rect x={0} y={0} width={activeProject.width} height={activeProject.height} fill={activeProject.background} />
            {activeProject.nodes
              .filter((node) => node.visible)
              .map((node) => (
                <CanvasNodeView
                  key={`export-${node.id}`}
                  node={node}
                  interactive={false}
                  selected={false}
                  onSelect={() => undefined}
                  onChange={() => undefined}
                  onDragStart={() => undefined}
                  onDragMove={() => undefined}
                  onDragEnd={() => undefined}
                />
              ))}
          </Layer>
        </Stage>
      </div>
    </section>
  );
}

function CanvasGrid(props: { width: number; height: number }) {
  const lines: JSX.Element[] = [];
  const step = 80;
  for (let x = step; x < props.width; x += step) {
    lines.push(<Line key={`x-${x}`} points={[x, 0, x, props.height]} stroke="rgba(185, 145, 97, 0.18)" strokeWidth={1} listening={false} />);
  }
  for (let y = step; y < props.height; y += step) {
    lines.push(<Line key={`y-${y}`} points={[0, y, props.width, y]} stroke="rgba(185, 145, 97, 0.18)" strokeWidth={1} listening={false} />);
  }
  return <>{lines}</>;
}

function CanvasNodeView(props: {
  node: CanvasNode;
  interactive: boolean;
  selected: boolean;
  onSelect: (additive: boolean) => void;
  onChange: (patch: Partial<CanvasNode>) => void;
  onDragStart: () => void;
  onDragMove: (position: { x: number; y: number }) => void;
  onDragEnd: () => void;
}) {
  const image = useCanvasImage(
    props.node.type === "image" || props.node.type === "aiResult"
      ? window.productStudio.toFileUrl(props.node.sourcePath)
      : undefined
  );
  if (!props.node.visible) return null;

  const common = {
    id: `canvas-node-${props.node.id}`,
    x: props.node.x,
    y: props.node.y,
    width: props.node.width,
    height: props.node.height,
    rotation: props.node.rotation,
    opacity: props.node.opacity,
    draggable: props.interactive && !props.node.locked,
    onClick: (event: Konva.KonvaEventObject<globalThis.MouseEvent>) => {
      event.cancelBubble = true;
      props.onSelect(event.evt.shiftKey || event.evt.ctrlKey || event.evt.metaKey);
    },
    onTap: (event: Konva.KonvaEventObject<globalThis.MouseEvent>) => {
      event.cancelBubble = true;
      props.onSelect(false);
    },
    onDragStart: props.onDragStart,
    onDragMove: (event: Konva.KonvaEventObject<globalThis.DragEvent>) => props.onDragMove({ x: event.target.x(), y: event.target.y() }),
    onDragEnd: props.onDragEnd,
    onTransformStart: props.onDragStart,
    onTransformEnd: (event: Konva.KonvaEventObject<globalThis.Event>) => {
      const target = event.target;
      const scaleX = target.scaleX();
      const scaleY = target.scaleY();
      target.scaleX(1);
      target.scaleY(1);
      props.onChange({
        x: target.x(),
        y: target.y(),
        width: Math.max(12, props.node.width * scaleX),
        height: Math.max(12, props.node.height * scaleY),
        rotation: target.rotation()
      } as Partial<CanvasNode>);
      props.onDragEnd();
    }
  };

  if (props.node.type === "image" || props.node.type === "aiResult") {
    return image ? (
      <KonvaImage {...common} image={image} />
    ) : (
      <Rect {...common} fill="#f4eadc" stroke="#c99f67" dash={[8, 7]} />
    );
  }

  if (props.node.type === "text") {
    return (
      <KonvaText
        {...common}
        text={props.node.text}
        fontFamily={props.node.fontFamily}
        fontSize={props.node.fontSize}
        fontStyle={props.node.fontStyle}
        align={props.node.align}
        fill={props.node.fill}
        stroke={props.node.stroke}
        strokeWidth={props.node.strokeWidth}
        shadowColor={props.node.shadowColor}
        shadowBlur={props.node.shadowBlur}
        verticalAlign="middle"
      />
    );
  }

  if (props.node.type === "note") {
    return (
      <Group {...common}>
        <Rect
          width={props.node.width}
          height={props.node.height}
          fill={props.node.fill}
          stroke={props.node.stroke}
          strokeWidth={props.node.strokeWidth}
          cornerRadius={18}
          shadowColor="rgba(116, 73, 32, 0.22)"
          shadowBlur={14}
          shadowOffset={{ x: 0, y: 8 }}
        />
        <KonvaText
          x={18}
          y={18}
          width={Math.max(20, props.node.width - 36)}
          height={Math.max(20, props.node.height - 36)}
          text={props.node.text}
          fontFamily={props.node.fontFamily}
          fontSize={props.node.fontSize}
          fill="#3d2a1e"
          lineHeight={1.28}
          verticalAlign="top"
        />
      </Group>
    );
  }

  if (props.node.type === "connector") {
    return (
      <Group {...common}>
        <KonvaArrow
          points={[0, 0, props.node.width, props.node.height]}
          stroke={props.node.stroke}
          fill={props.node.stroke}
          strokeWidth={props.node.strokeWidth}
          pointerLength={22}
          pointerWidth={22}
          dash={props.node.dash}
          lineCap="round"
          lineJoin="round"
        />
        {props.node.label ? (
          <KonvaText
            x={Math.min(0, props.node.width) + Math.abs(props.node.width) / 2 - 80}
            y={Math.min(0, props.node.height) + Math.abs(props.node.height) / 2 - 20}
            width={160}
            height={40}
            text={props.node.label}
            align="center"
            verticalAlign="middle"
            fontFamily="Microsoft YaHei"
            fontSize={22}
            fill="#4a3022"
          />
        ) : null}
      </Group>
    );
  }

  if (props.node.type === "aiTask") {
    return (
      <Group {...common}>
        <Rect
          width={props.node.width}
          height={props.node.height}
          fill="#fffaf3"
          stroke="#d69a49"
          strokeWidth={2}
          cornerRadius={20}
          shadowColor="rgba(119, 71, 27, 0.24)"
          shadowBlur={18}
          shadowOffset={{ x: 0, y: 10 }}
        />
        <Rect x={0} y={0} width={props.node.width} height={54} fill="#f1c47d" cornerRadius={[20, 20, 0, 0]} />
        <KonvaText x={18} y={14} width={props.node.width - 36} height={28} text="AI 生成任务" fontFamily="Microsoft YaHei" fontSize={22} fontStyle="bold" fill="#3b271a" />
        <KonvaText
          x={18}
          y={74}
          width={props.node.width - 36}
          height={props.node.height - 104}
          text={props.node.prompt || "在右侧属性里输入提示词"}
          fontFamily="Microsoft YaHei"
          fontSize={20}
          fill="#5b4635"
          lineHeight={1.28}
        />
        <KonvaText
          x={18}
          y={props.node.height - 32}
          width={props.node.width - 36}
          height={22}
          text={`状态：${getCanvasAiStatusLabel(props.node.status)}`}
          fontFamily="Microsoft YaHei"
          fontSize={15}
          fill="#9b6433"
        />
      </Group>
    );
  }

  if (props.node.type === "shape") {
    if (props.node.shapeType === "line") {
      return <Line {...common} points={[0, 0, props.node.width, props.node.height]} stroke={props.node.stroke} strokeWidth={props.node.strokeWidth} lineCap="round" />;
    }
    if (props.node.shapeType === "arrow") {
      return <KonvaArrow {...common} points={[0, 0, props.node.width, props.node.height]} stroke={props.node.stroke} fill={props.node.stroke} strokeWidth={props.node.strokeWidth} pointerLength={22} pointerWidth={22} />;
    }
    return (
      <Rect
        {...common}
        fill={props.node.fill}
        stroke={props.node.stroke}
        strokeWidth={props.node.strokeWidth}
        cornerRadius={props.node.shapeType === "circle" ? Math.max(props.node.width, props.node.height) : props.node.cornerRadius}
      />
    );
  }

  if (props.node.type === "draw" || props.node.type === "freehand") {
    return (
      <Line
        {...common}
        points={props.node.points}
        stroke={props.node.stroke}
        strokeWidth={props.node.strokeWidth}
        tension={0.35}
        lineCap="round"
        lineJoin="round"
        globalCompositeOperation={props.node.compositeOperation}
      />
    );
  }

  return null;
}

function CanvasLayerPanel(props: {
  nodes: CanvasNode[];
  selectedIds: string[];
  onSelect: (nodeId: string) => void;
  onToggle: (nodeId: string, patch: Partial<CanvasNode>) => void;
  onReorder: (direction: "front" | "back" | "forward" | "backward") => void;
}) {
  return (
    <section className="canvas-layer-panel">
      <div className="canvas-panel-heading">
        <strong>图层</strong>
        <div className="canvas-mini-actions">
          <button className="icon-button" onClick={() => props.onReorder("forward")} title="上移图层">
            <ChevronUp size={14} />
          </button>
          <button className="icon-button" onClick={() => props.onReorder("backward")} title="下移图层">
            <ChevronDown size={14} />
          </button>
        </div>
      </div>
      <div className="canvas-layer-list">
        {props.nodes.length === 0 ? (
          <div className="canvas-empty-note">还没有元素。用左侧工具添加图片、文字或形状。</div>
        ) : (
          [...props.nodes].reverse().map((node) => (
            <article key={node.id} className={`canvas-layer-row ${props.selectedIds.includes(node.id) ? "active" : ""}`}>
              <button onClick={() => props.onSelect(node.id)}>
                <Layers size={14} />
                <span>{node.name}</span>
              </button>
              <button className="icon-button" onClick={() => props.onToggle(node.id, { visible: !node.visible })} title={node.visible ? "隐藏" : "显示"}>
                {node.visible ? <Eye size={13} /> : <EyeOff size={13} />}
              </button>
              <button className="icon-button" onClick={() => props.onToggle(node.id, { locked: !node.locked })} title={node.locked ? "解锁" : "锁定"}>
                <KeyRound size={13} />
              </button>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function CanvasInspector(props: {
  project: CanvasProject;
  selectedNode: CanvasNode | null;
  selectedCount: number;
  brushColor: string;
  brushSize: number;
  onProjectChange: (patch: Partial<Pick<CanvasProject, "title" | "width" | "height" | "background">>) => void;
  onBrushColorChange: (value: string) => void;
  onBrushSizeChange: (value: number) => void;
  onNodeCommit: (patch: Partial<CanvasNode>) => void;
  onDelete: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onGroup: () => void;
  onUngroup: () => void;
  onAlign: (kind: "left" | "center" | "right" | "top" | "middle" | "bottom") => void;
  onLayerMove: (direction: "front" | "back" | "forward" | "backward") => void;
}) {
  const node = props.selectedNode;
  return (
    <div className="canvas-inspector">
      <div className="canvas-field-grid two">
        <label>
          宽度
          <input type="number" value={props.project.width} onChange={(event) => props.onProjectChange({ width: Number(event.target.value) })} />
        </label>
        <label>
          高度
          <input type="number" value={props.project.height} onChange={(event) => props.onProjectChange({ height: Number(event.target.value) })} />
        </label>
        <label>
          背景
          <input type="color" value={props.project.background} onChange={(event) => props.onProjectChange({ background: event.target.value })} />
        </label>
        <label>
          画笔
          <input type="color" value={props.brushColor} onChange={(event) => props.onBrushColorChange(event.target.value)} />
        </label>
        <label>
          画笔粗细
          <input type="number" min={1} max={80} value={props.brushSize} onChange={(event) => props.onBrushSizeChange(Number(event.target.value))} />
        </label>
      </div>

      <div className="canvas-action-grid">
        <button onClick={props.onCopy} disabled={props.selectedCount === 0}>
          <Copy size={14} />
          复制
        </button>
        <button onClick={props.onPaste}>
          <Plus size={14} />
          粘贴
        </button>
        <button onClick={props.onGroup} disabled={props.selectedCount < 2}>
          <LayoutGrid size={14} />
          组合
        </button>
        <button onClick={props.onUngroup} disabled={props.selectedCount === 0}>
          <Rows2 size={14} />
          解组
        </button>
        <button onClick={() => props.onLayerMove("front")} disabled={props.selectedCount === 0}>
          <ChevronUp size={14} />
          置顶
        </button>
        <button onClick={() => props.onLayerMove("back")} disabled={props.selectedCount === 0}>
          <ChevronDown size={14} />
          置底
        </button>
        <button className="danger" onClick={props.onDelete} disabled={props.selectedCount === 0}>
          <Trash2 size={14} />
          删除
        </button>
      </div>

      <div className="canvas-action-grid compact">
        {(["left", "center", "right", "top", "middle", "bottom"] as const).map((kind) => (
          <button key={kind} onClick={() => props.onAlign(kind)} disabled={props.selectedCount < 2}>
            {kind}
          </button>
        ))}
      </div>

      {!node ? (
        <div className="canvas-empty-note">选择一个元素后可编辑位置、尺寸、颜色、透明度和文字样式。</div>
      ) : (
        <>
          <div className="canvas-field-grid two">
            <label>
              X
              <input type="number" value={Math.round(node.x)} onChange={(event) => props.onNodeCommit({ x: Number(event.target.value) })} />
            </label>
            <label>
              Y
              <input type="number" value={Math.round(node.y)} onChange={(event) => props.onNodeCommit({ y: Number(event.target.value) })} />
            </label>
            <label>
              W
              <input type="number" value={Math.round(node.width)} onChange={(event) => props.onNodeCommit({ width: Number(event.target.value) })} />
            </label>
            <label>
              H
              <input type="number" value={Math.round(node.height)} onChange={(event) => props.onNodeCommit({ height: Number(event.target.value) })} />
            </label>
            <label>
              旋转
              <input type="number" value={Math.round(node.rotation)} onChange={(event) => props.onNodeCommit({ rotation: Number(event.target.value) })} />
            </label>
            <label>
              透明
              <input type="number" min={0} max={1} step={0.05} value={node.opacity} onChange={(event) => props.onNodeCommit({ opacity: Number(event.target.value) })} />
            </label>
          </div>

          {node.type === "text" ? (
            <CanvasTextInspector node={node} onChange={props.onNodeCommit} />
          ) : node.type === "shape" ? (
            <CanvasShapeInspector node={node} onChange={props.onNodeCommit} />
          ) : node.type === "note" ? (
            <CanvasNoteInspector node={node} onChange={props.onNodeCommit} />
          ) : node.type === "connector" ? (
            <CanvasConnectorInspector node={node} onChange={props.onNodeCommit} />
          ) : node.type === "aiTask" ? (
            <CanvasAiTaskInspector node={node} onChange={props.onNodeCommit} />
          ) : node.type === "draw" || node.type === "freehand" ? (
            <CanvasDrawInspector node={node} onChange={props.onNodeCommit} />
          ) : null}
        </>
      )}
    </div>
  );
}

function CanvasTextInspector(props: { node: CanvasTextNode; onChange: (patch: Partial<CanvasNode>) => void }) {
  return (
    <div className="canvas-field-grid">
      <label>
        文字
        <textarea value={props.node.text} onChange={(event) => props.onChange({ text: event.target.value } as Partial<CanvasNode>)} />
      </label>
      <div className="canvas-field-grid two">
        <label>
          字号
          <input type="number" min={8} max={220} value={props.node.fontSize} onChange={(event) => props.onChange({ fontSize: Number(event.target.value) } as Partial<CanvasNode>)} />
        </label>
        <label>
          字体
          <select value={props.node.fontFamily} onChange={(event) => props.onChange({ fontFamily: event.target.value } as Partial<CanvasNode>)}>
            <option value="Microsoft YaHei">微软雅黑</option>
            <option value="SimHei">黑体</option>
            <option value="SimSun">宋体</option>
            <option value="Arial">Arial</option>
          </select>
        </label>
        <label>
          颜色
          <input type="color" value={props.node.fill} onChange={(event) => props.onChange({ fill: event.target.value } as Partial<CanvasNode>)} />
        </label>
        <label>
          描边
          <input type="color" value={props.node.stroke} onChange={(event) => props.onChange({ stroke: event.target.value } as Partial<CanvasNode>)} />
        </label>
        <label>
          描边宽度
          <input type="number" min={0} max={24} value={props.node.strokeWidth} onChange={(event) => props.onChange({ strokeWidth: Number(event.target.value) } as Partial<CanvasNode>)} />
        </label>
        <label>
          阴影
          <input type="number" min={0} max={80} value={props.node.shadowBlur} onChange={(event) => props.onChange({ shadowBlur: Number(event.target.value) } as Partial<CanvasNode>)} />
        </label>
      </div>
      <div className="canvas-action-grid compact">
        <button className={props.node.fontStyle === "bold" ? "active" : ""} onClick={() => props.onChange({ fontStyle: props.node.fontStyle === "bold" ? "normal" : "bold" } as Partial<CanvasNode>)}>
          B
        </button>
        {(["left", "center", "right"] as const).map((align) => (
          <button key={align} className={props.node.align === align ? "active" : ""} onClick={() => props.onChange({ align } as Partial<CanvasNode>)}>
            {align}
          </button>
        ))}
      </div>
    </div>
  );
}

function CanvasShapeInspector(props: { node: CanvasShapeNode; onChange: (patch: Partial<CanvasNode>) => void }) {
  return (
    <div className="canvas-field-grid two">
      <label>
        填充
        <input type="color" value={props.node.fill === "transparent" ? "#ffffff" : props.node.fill} onChange={(event) => props.onChange({ fill: event.target.value } as Partial<CanvasNode>)} />
      </label>
      <label>
        描边
        <input type="color" value={props.node.stroke} onChange={(event) => props.onChange({ stroke: event.target.value } as Partial<CanvasNode>)} />
      </label>
      <label>
        线宽
        <input type="number" min={0} max={80} value={props.node.strokeWidth} onChange={(event) => props.onChange({ strokeWidth: Number(event.target.value) } as Partial<CanvasNode>)} />
      </label>
      <label>
        圆角
        <input type="number" min={0} max={999} value={props.node.cornerRadius} onChange={(event) => props.onChange({ cornerRadius: Number(event.target.value) } as Partial<CanvasNode>)} />
      </label>
    </div>
  );
}

function CanvasNoteInspector(props: { node: CanvasNoteNode; onChange: (patch: Partial<CanvasNode>) => void }) {
  return (
    <div className="canvas-field-grid">
      <label>
        便签内容
        <textarea value={props.node.text} onChange={(event) => props.onChange({ text: event.target.value } as Partial<CanvasNode>)} />
      </label>
      <div className="canvas-field-grid two">
        <label>
          背景
          <input type="color" value={props.node.fill} onChange={(event) => props.onChange({ fill: event.target.value } as Partial<CanvasNode>)} />
        </label>
        <label>
          描边
          <input type="color" value={props.node.stroke} onChange={(event) => props.onChange({ stroke: event.target.value } as Partial<CanvasNode>)} />
        </label>
        <label>
          字号
          <input type="number" min={10} max={96} value={props.node.fontSize} onChange={(event) => props.onChange({ fontSize: Number(event.target.value) } as Partial<CanvasNode>)} />
        </label>
        <label>
          线宽
          <input type="number" min={0} max={20} value={props.node.strokeWidth} onChange={(event) => props.onChange({ strokeWidth: Number(event.target.value) } as Partial<CanvasNode>)} />
        </label>
      </div>
    </div>
  );
}

function CanvasConnectorInspector(props: { node: CanvasConnectorNode; onChange: (patch: Partial<CanvasNode>) => void }) {
  return (
    <div className="canvas-field-grid">
      <label>
        标签
        <input value={props.node.label ?? ""} onChange={(event) => props.onChange({ label: event.target.value } as Partial<CanvasNode>)} />
      </label>
      <div className="canvas-field-grid two">
        <label>
          颜色
          <input type="color" value={props.node.stroke} onChange={(event) => props.onChange({ stroke: event.target.value } as Partial<CanvasNode>)} />
        </label>
        <label>
          线宽
          <input type="number" min={1} max={40} value={props.node.strokeWidth} onChange={(event) => props.onChange({ strokeWidth: Number(event.target.value) } as Partial<CanvasNode>)} />
        </label>
      </div>
    </div>
  );
}

function CanvasAiTaskInspector(props: { node: Extract<CanvasNode, { type: "aiTask" }>; onChange: (patch: Partial<CanvasNode>) => void }) {
  return (
    <div className="canvas-field-grid">
      <label>
        提示词
        <textarea value={props.node.prompt} onChange={(event) => props.onChange({ prompt: event.target.value } as Partial<CanvasNode>)} />
      </label>
      <label>
        负向提示词
        <textarea value={props.node.negativePrompt ?? ""} onChange={(event) => props.onChange({ negativePrompt: event.target.value } as Partial<CanvasNode>)} />
      </label>
      <label>
        状态
        <select value={props.node.status} onChange={(event) => props.onChange({ status: event.target.value as Extract<CanvasNode, { type: "aiTask" }>["status"] } as Partial<CanvasNode>)}>
          <option value="draft">草稿</option>
          <option value="ready">待生成</option>
          <option value="running">生成中</option>
          <option value="done">已完成</option>
          <option value="failed">失败</option>
        </select>
      </label>
      <div className="canvas-empty-note">AI 节点先作为本软件内部生成任务卡片保存，可和图库结果图一起编排；不会调用参考仓库的外部 API 封装。</div>
    </div>
  );
}

function CanvasDrawInspector(props: { node: Extract<CanvasNode, { type: "draw" }> | CanvasFreehandNode; onChange: (patch: Partial<CanvasNode>) => void }) {
  return (
    <div className="canvas-field-grid two">
      <label>
        颜色
        <input type="color" value={props.node.stroke} onChange={(event) => props.onChange({ stroke: event.target.value } as Partial<CanvasNode>)} />
      </label>
      <label>
        粗细
        <input type="number" min={1} max={100} value={props.node.strokeWidth} onChange={(event) => props.onChange({ strokeWidth: Number(event.target.value) } as Partial<CanvasNode>)} />
      </label>
    </div>
  );
}

function useCanvasImage(src?: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!src) {
      setImage(null);
      return;
    }
    let canceled = false;
    const nextImage = new window.Image();
    nextImage.crossOrigin = "anonymous";
    nextImage.onload = () => {
      if (!canceled) setImage(nextImage);
    };
    nextImage.onerror = () => {
      if (!canceled) setImage(null);
    };
    nextImage.src = src;
    return () => {
      canceled = true;
    };
  }, [src]);
  return image;
}

function createDraftCanvasProject(): CanvasDraftProject {
  const now = new Date().toISOString();
  return {
    id: `draft-${createCanvasId()}`,
    userId: "",
    title: "未命名自由画布",
    width: defaultCanvasSize.width,
    height: defaultCanvasSize.height,
    background: defaultCanvasBackground,
    nodes: [],
    viewport: { zoom: 0.55, panX: 160, panY: 60 },
    gridEnabled: true,
    snapEnabled: true,
    selectedNodeIds: [],
    createdAt: now,
    updatedAt: now,
    draft: true
  };
}

function snapshotProject(project: CanvasProject): CanvasSnapshot {
  return {
    background: project.background,
    nodes: project.nodes.map((node) => ({ ...node })),
    width: project.width,
    height: project.height
  };
}

function createCanvasId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getCanvasPoint(stage: Konva.Stage, pan: { x: number; y: number }, zoom: number) {
  const pointer = stage.getPointerPosition();
  if (!pointer) return null;
  return {
    x: (pointer.x - pan.x) / zoom,
    y: (pointer.y - pan.y) / zoom
  };
}

function normalizeCanvasNode(node: CanvasNode, snapToGrid: boolean): CanvasNode {
  if (!snapToGrid) return node;
  return {
    ...node,
    x: Math.round(node.x / 8) * 8,
    y: Math.round(node.y / 8) * 8
  };
}

function getCanvasNodeBounds(node: CanvasNode) {
  if ((node.type === "draw" || node.type === "freehand") && node.points.length >= 4) {
    const xs = node.points.filter((_, index) => index % 2 === 0);
    const ys = node.points.filter((_, index) => index % 2 === 1);
    const left = Math.min(...xs) - node.strokeWidth;
    const top = Math.min(...ys) - node.strokeWidth;
    const right = Math.max(...xs) + node.strokeWidth;
    const bottom = Math.max(...ys) + node.strokeWidth;
    return {
      x: left,
      y: top,
      width: Math.max(1, right - left),
      height: Math.max(1, bottom - top)
    };
  }
  return {
    x: node.x,
    y: node.y,
    width: Math.max(1, node.width),
    height: Math.max(1, node.height)
  };
}

function normalizeSelectionBox(start: { x: number; y: number }, end: { x: number; y: number }): CanvasSelectionBox {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y)
  };
}

function rectanglesIntersect(a: CanvasSelectionBox, b: CanvasSelectionBox) {
  return a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y;
}

function getCanvasNodeIdFromKonvaNode(node: Konva.Node) {
  let current: Konva.Node | null = node;
  while (current) {
    const id = current.id();
    if (id.startsWith("canvas-node-")) {
      return id.replace("canvas-node-", "");
    }
    current = current.getParent();
  }
  return null;
}

function getCanvasAiStatusLabel(status: Extract<CanvasNode, { type: "aiTask" }>["status"]) {
  const labels: Record<Extract<CanvasNode, { type: "aiTask" }>["status"], string> = {
    draft: "草稿",
    ready: "待生成",
    running: "生成中",
    done: "已完成",
    failed: "失败"
  };
  return labels[status] ?? "草稿";
}

function reorderCanvasNodes(
  nodes: CanvasNode[],
  selectedIds: string[],
  direction: "front" | "back" | "forward" | "backward"
) {
  const selectedSet = new Set(selectedIds);
  const moving = nodes.filter((node) => selectedSet.has(node.id));
  const remaining = nodes.filter((node) => !selectedSet.has(node.id));
  if (direction === "front") return [...remaining, ...moving];
  if (direction === "back") return [...moving, ...remaining];
  const next = [...nodes];
  if (direction === "forward") {
    for (let index = next.length - 2; index >= 0; index -= 1) {
      if (selectedSet.has(next[index].id) && !selectedSet.has(next[index + 1].id)) {
        [next[index], next[index + 1]] = [next[index + 1], next[index]];
      }
    }
  } else {
    for (let index = 1; index < next.length; index += 1) {
      if (selectedSet.has(next[index].id) && !selectedSet.has(next[index - 1].id)) {
        [next[index], next[index - 1]] = [next[index - 1], next[index]];
      }
    }
  }
  return next;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isCanvasTypingTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

function PersonalCenterPage(props: {
  session: AuthSession;
  wallet: WalletSummary | null;
  jobs: StudioJob[];
  trashedJobs: StudioJob[];
  transactions: WalletTransaction[];
  activeTab: PersonalCenterTab;
  providerId: ProviderId;
  modelId: string;
  onTabChange: (tab: PersonalCenterTab) => void;
  onRefresh: () => void;
  onTrash: (jobId: string) => void;
  onRestore: (jobId: string) => void;
  onDeleteForever: (jobId: string) => void;
  onSelectImage: (job: ProductShotJob) => void;
  onSelectVideo: (job: VideoGenerationJob) => void;
  galleryPaths: Set<string>;
  onAddToGallery: (job: StudioJob) => void;
  onExport: (job: StudioJob) => void;
  onRecharged: (wallet: WalletSummary) => void;
}) {
  const imageJobs = useMemo(() => props.jobs.filter(isImageJob), [props.jobs]);
  const videoJobs = useMemo(() => props.jobs.filter(isVideoJob), [props.jobs]);
  const generatedImages = useMemo(
    () =>
      imageJobs
        .flatMap((job) => job.results.map((result) => ({ job, result })))
        .sort((a, b) => Date.parse(b.result.createdAt || b.job.createdAt) - Date.parse(a.result.createdAt || a.job.createdAt)),
    [imageJobs]
  );
  const tabs: Array<{ id: PersonalCenterTab; label: string; icon: JSX.Element }> = [
    { id: "overview", label: uiText.accountOverview, icon: <User size={16} /> },
    { id: "history", label: uiText.historyPage, icon: <History size={16} /> },
    { id: "recharge", label: uiText.billingPage, icon: <CreditCard size={16} /> },
    { id: "transactions", label: uiText.rechargeDetails, icon: <Wallet size={16} /> },
    { id: "trash", label: `${uiText.recycleBin} ${props.trashedJobs.length}`, icon: <Trash2 size={16} /> }
  ];

  function selectJob(job: StudioJob) {
    if (isVideoJob(job)) {
      props.onSelectVideo(job);
      return;
    }
    props.onSelectImage(job);
  }

  return (
    <main className="page-workspace personal-page">
      <header className="page-header personal-page-header">
        <div>
          <h2>{uiText.personalCenter}</h2>
          <p>
            {props.session.username} / {uiText.walletBalance} {formatUsdCents(props.wallet?.balanceCents ?? 0)}
          </p>
        </div>
        <button className="secondary-button" onClick={props.onRefresh}>
          <RotateCcw size={16} />
          {uiText.refresh}
        </button>
      </header>

      <div className="personal-page-body">
        <nav className="personal-tabs" aria-label={uiText.personalCenter}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={props.activeTab === tab.id ? "active" : ""}
              onClick={() => props.onTabChange(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <section className="personal-panel">
          {props.activeTab === "overview" ? (
            <div className="personal-overview-grid">
              <section className="personal-summary">
                <div>
                  <span>{uiText.walletBalance}</span>
                  <strong>{formatUsdCents(props.wallet?.balanceCents ?? 0)}</strong>
                  <small>{uiText.walletUsed} {formatUsdCents(props.wallet?.usedCents ?? 0)}</small>
                </div>
                <div>
                  <span>{uiText.recharge}</span>
                  <strong>{formatUsdCents(props.wallet?.totalRechargedCents ?? 0)}</strong>
                  <small>{uiText.rechargeDetails} {props.transactions.length}</small>
                </div>
                <div>
                  <span>{uiText.allHistory}</span>
                  <strong>{props.jobs.length}</strong>
                  <small>{imageJobs.length} {uiText.imagePage} / {videoJobs.length} {uiText.videoPage}</small>
                </div>
                <div>
                  <span>{uiText.generatedImages}</span>
                  <strong>{generatedImages.length}</strong>
                  <small>{uiText.recycleBin} {props.trashedJobs.length}</small>
                </div>
              </section>
              <section className="personal-panel-card">
                <div className="section-title">
                  <span>{uiText.rechargeDetails}</span>
                  <button className="text-button dark" onClick={() => props.onTabChange("transactions")}>
                    {uiText.viewAllHistory}
                  </button>
                </div>
                <WalletTransactionList transactions={props.transactions.slice(0, 6)} compact />
              </section>
            </div>
          ) : props.activeTab === "history" ? (
            <PersonalHistoryList
              jobs={props.jobs}
              emptyText={uiText.noJobs}
              onSelect={selectJob}
              onTrash={props.onTrash}
              galleryPaths={props.galleryPaths}
              onAddToGallery={props.onAddToGallery}
              onExport={props.onExport}
            />
          ) : props.activeTab === "recharge" ? (
            <RechargeDialog
              providerId={props.providerId}
              modelId={props.modelId}
              embedded
              hideClose
              onClose={() => props.onTabChange("overview")}
              onRecharged={(wallet) => {
                props.onRecharged(wallet);
                props.onTabChange("transactions");
              }}
            />
          ) : props.activeTab === "transactions" ? (
            <WalletTransactionList transactions={props.transactions} />
          ) : (
            <PersonalTrashList
              jobs={props.trashedJobs}
              onRestore={props.onRestore}
              onDeleteForever={props.onDeleteForever}
            />
          )}
        </section>
      </div>
    </main>
  );
}

function PersonalHistoryList(props: {
  jobs: StudioJob[];
  emptyText: string;
  onSelect: (job: StudioJob) => void;
  onTrash: (jobId: string) => void;
  galleryPaths: Set<string>;
  onAddToGallery: (job: StudioJob) => void;
  onExport: (job: StudioJob) => void;
}) {
  return (
    <div className="history-dialog-list personal-history-list">
      {props.jobs.length === 0 ? (
        <div className="empty-results">{props.emptyText}</div>
      ) : (
        props.jobs.map((job) => (
          <article
            key={job.id}
            className={`history-dialog-item history-status-${job.status}`}
            onClick={() => props.onSelect(job)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                props.onSelect(job);
              }
            }}
            role="button"
            tabIndex={0}
          >
            <PersonalJobThumb job={job} />
            <div>
              <strong>{new Date(job.createdAt).toLocaleString()}</strong>
              <span>
                {isVideoJob(job) ? uiText.videoPage : uiText.imagePage} / {getProviderDisplayName(job.request.providerId)} /{" "}
                {isVideoJob(job)
                  ? getVideoModelDisplayName(job.request.providerId, job.request.modelId)
                  : getModelDisplayName(job.request.providerId, job.request.modelId)}
              </span>
              <small>
                {jobStatusLabels[job.status]} / {job.results.length} {isVideoJob(job) ? uiText.videoPage : uiText.historyResults}
                {job.errors.length ? ` / ${job.errors.length} ${uiText.errors}` : ""}
              </small>
            </div>
            <span className="history-row-actions">
              <button
                className={
                  job.results.length > 0 &&
                  job.results.every((result) => props.galleryPaths.has("videoPath" in result ? result.videoPath : result.imagePath))
                    ? "active"
                    : ""
                }
                title={
                  job.results.length === 0
                    ? "该历史任务没有可加入图库的作品"
                    : job.results.every((result) => props.galleryPaths.has("videoPath" in result ? result.videoPath : result.imagePath))
                      ? "已加入个人图库"
                      : `将该任务${isVideoJob(job) ? "视频" : "图片"}加入个人图库`
                }
                disabled={job.results.length === 0}
                onClick={(event) => {
                  event.stopPropagation();
                  props.onAddToGallery(job);
                }}
              >
                {job.results.length > 0 &&
                job.results.every((result) => props.galleryPaths.has("videoPath" in result ? result.videoPath : result.imagePath)) ? (
                  <Check size={16} />
                ) : (
                  <FolderPlus size={16} />
                )}
              </button>
              <button
                title={job.results.length > 0 ? `导出该历史任务的全部${isVideoJob(job) ? "视频" : "图片"}` : "该历史任务没有可导出的作品"}
                disabled={job.results.length === 0}
                onClick={(event) => {
                  event.stopPropagation();
                  props.onExport(job);
                }}
              >
                <Download size={16} />
              </button>
              <i
                title={uiText.moveToTrash}
                onClick={(event) => {
                  event.stopPropagation();
                  props.onTrash(job.id);
                }}
              >
                <Trash2 size={16} />
              </i>
            </span>
          </article>
        ))
      )}
    </div>
  );
}

function PersonalTrashList(props: {
  jobs: StudioJob[];
  onRestore: (jobId: string) => void;
  onDeleteForever: (jobId: string) => void;
}) {
  return (
    <div className="history-dialog-list personal-history-list">
      {props.jobs.length === 0 ? (
        <div className="empty-results">{uiText.recycleBin}</div>
      ) : (
        props.jobs.map((job) => (
          <div key={job.id} className="history-dialog-item trash-item">
            <PersonalJobThumb job={job} />
            <div>
              <strong>{new Date(job.createdAt).toLocaleString()}</strong>
              <span>
                {isVideoJob(job) ? uiText.videoPage : uiText.imagePage} / {getProviderDisplayName(job.request.providerId)} /{" "}
                {isVideoJob(job)
                  ? getVideoModelDisplayName(job.request.providerId, job.request.modelId)
                  : getModelDisplayName(job.request.providerId, job.request.modelId)}
              </span>
              <small>{jobStatusLabels[job.status]} / {job.results.length} {uiText.records}</small>
            </div>
            <span className="trash-actions">
              <button className="secondary-button" onClick={() => props.onRestore(job.id)}>
                {uiText.restore}
              </button>
              <button className="icon-button danger" onClick={() => props.onDeleteForever(job.id)} title={uiText.deleteForever}>
                <Trash2 size={16} />
              </button>
            </span>
          </div>
        ))
      )}
    </div>
  );
}

function PersonalJobThumb({ job }: { job: StudioJob }) {
  if (isImageJob(job) && job.results[0]) {
    return <img src={window.productStudio.toFileUrl(job.results[0].imagePath)} alt={job.id} />;
  }
  if (isVideoJob(job) && job.results[0]) {
    return <video src={window.productStudio.toFileUrl(job.results[0].videoPath)} muted preload="metadata" />;
  }
  return (
    <span className="history-placeholder">
      {isVideoJob(job) ? <Video size={18} /> : <Clock3 size={18} />}
    </span>
  );
}

function WalletTransactionList(props: { transactions: WalletTransaction[]; compact?: boolean }) {
  return (
    <div className={`transaction-list ${props.compact ? "compact" : ""}`}>
      {props.transactions.length === 0 ? (
        <div className="empty-results">{uiText.noTransactions}</div>
      ) : (
        props.transactions.map((transaction) => (
          <article key={transaction.id} className={transaction.amountCents >= 0 ? "transaction-row income" : "transaction-row expense"}>
            <div>
              <strong>{getTransactionTypeLabel(transaction)}</strong>
              <span>{new Date(transaction.createdAt).toLocaleString()}</span>
            </div>
            <div>
              <small>{uiText.transactionProvider}</small>
              <span>{transaction.providerId ? getProviderDisplayName(transaction.providerId) : "-"}</span>
            </div>
            <div>
              <small>{uiText.usedModel}</small>
              <span>{transaction.modelId || "-"}</span>
            </div>
            <div>
              <small>{uiText.transactionTask}</small>
              <span>{transaction.jobId ? transaction.jobId.slice(0, 8) : "-"}</span>
            </div>
            <div>
              <small>{uiText.transactionNote}</small>
              <span>{transaction.note || "-"}</span>
            </div>
            <strong className="transaction-amount">{formatSignedCredits(transaction.amountCents)}</strong>
          </article>
        ))
      )}
    </div>
  );
}

function getTransactionTypeLabel(transaction: WalletTransaction): string {
  if (transaction.type === "recharge") return uiText.rechargeIncome;
  if (transaction.type === "usage") return uiText.usageExpense;
  return uiText.adjustmentTransaction;
}

function RechargeDialog(props: {
  providerId: ProviderId;
  modelId: string;
  embedded?: boolean;
  hideClose?: boolean;
  onClose: () => void;
  onRecharged: (wallet: WalletSummary) => void;
}) {
  const [providerId, setProviderId] = useState<ProviderId>(props.providerId);
  const [modelId, setModelId] = useState(props.modelId);
  const [amountCents, setAmountCents] = useState(rechargeAmounts[1]);
  const [message, setMessage] = useState("");
  const provider = providerConfigs[providerId];
  const modelOptions = provider.models;

  async function confirmRecharge() {
    try {
      const receipt = await window.productStudio.recharge({ providerId, modelId, amountCents });
      props.onRecharged(receipt.wallet);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : uiText.generationFailed);
    }
  }

  const content = (
      <div className={`recharge-dialog ${props.embedded ? "embedded-panel" : ""}`}>
        <header>
          <h2>{uiText.rechargeTitle}</h2>
          {props.hideClose ? null : (
            <button className="icon-button" onClick={props.onClose} title={uiText.close}>
              <X size={16} />
            </button>
          )}
        </header>
        <div className="recharge-grid">
          <section className="recharge-controls">
            <label>
              <span>{uiText.rechargeModel}</span>
              <select
                value={providerId}
                onChange={(event) => {
                  const nextProvider = event.target.value as ProviderId;
                  setProviderId(nextProvider);
                  setModelId(providerConfigs[nextProvider].defaultModel);
                }}
              >
                {providerOrder.map((id) => (
                  <option key={id} value={id}>
                    {providerConfigs[id].displayName}
                  </option>
                ))}
              </select>
            </label>
            <select value={modelId} onChange={(event) => setModelId(event.target.value)}>
              {modelOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <div className="amount-grid">
              {rechargeAmounts.map((amount) => (
                <button
                  key={amount}
                  className={amountCents === amount ? "active" : ""}
                  onClick={() => setAmountCents(amount)}
                >
                  {formatUsdCents(amount)}
                </button>
              ))}
            </div>
            <PriceTable compact />
          </section>
          <section className="qr-panel">
            <WeChatQr amountCents={amountCents} providerId={providerId} modelId={modelId} />
            <strong>{formatUsdCents(amountCents)}</strong>
            <p>{uiText.rechargeLocalNote}</p>
            <button className="primary-button" onClick={() => void confirmRecharge()}>
              <QrCode size={18} />
              {uiText.confirmRecharge}
            </button>
            {message ? <div className="auth-message">{message}</div> : null}
          </section>
        </div>
      </div>
  );

  if (props.embedded) {
    return content;
  }

  return (
    <div className="modal-backdrop">
      {content}
    </div>
  );
}

function PriceTable({ compact }: { compact: boolean }) {
  return (
    <div className={`price-table ${compact ? "compact" : ""}`}>
      <div className="section-title">
        <span>{uiText.pricing}</span>
      </div>
      <div className="price-rows">
        {modelPrices.map((price) => (
          <div key={`${price.providerId}-${price.modelId}`} className="price-row">
            <div>
              <strong>{price.displayName}</strong>
              <span>{providerConfigs[price.providerId].displayName}</span>
            </div>
            <div className="price-values">
              {imageQualities.map((quality) => (
                <small key={quality.id}>
                  {qualityLabels[quality.id]} {formatUsdCents(price.qualityPrices[quality.id] ?? 0)}
                </small>
              ))}
            </div>
          </div>
        ))}
      </div>
      {!compact ? <p>{uiText.priceNote}</p> : null}
    </div>
  );
}

function getImageModelOptions(currentProviderId: ProviderId, currentModelId: string): ImageModelOption[] {
  const optionMap = new Map<string, ImageModelOption>();
  for (const providerId of providerOrder) {
    const modelIds = new Set<string>([
      ...providerConfigs[providerId].models,
      ...modelPrices.filter((price) => price.providerId === providerId).map((price) => price.modelId)
    ]);
    for (const modelId of modelIds) {
      optionMap.set(`${providerId}:${modelId}`, {
        providerId,
        modelId,
        displayName: getModelDisplayName(providerId, modelId)
      });
    }
  }
  if (currentModelId && !optionMap.has(`${currentProviderId}:${currentModelId}`)) {
    optionMap.set(`${currentProviderId}:${currentModelId}`, {
      providerId: currentProviderId,
      modelId: currentModelId,
      displayName: getModelDisplayName(currentProviderId, currentModelId)
    });
  }
  return Array.from(optionMap.values());
}

function getVideoModelOptions(providerId: ProviderId, currentModelId: string): VideoModelMetadata[] {
  const options = providerOrder.flatMap((item) => getVideoModelsForProvider(item));
  if (!currentModelId || options.some((option) => option.modelId === currentModelId)) {
    return options;
  }
  const current = getVideoModelMeta(providerId, currentModelId);
  return current ? [...options, current] : options;
}

function clampVideoDuration(value: number): number {
  return Math.min(15, Math.max(1, Math.ceil(Number(value) || 5)));
}

function getDefaultHiddenVideoResolution(model: VideoModelMetadata | null): VideoResolution {
  if (model?.resolutions.includes("720p")) return "720p";
  return model?.resolutions[0] ?? "720p";
}

function clampWorkspaceLayout(layout: WorkspaceLayoutSize): WorkspaceLayoutSize {
  return {
    splitPercent: Math.min(68, Math.max(30, Number(layout.splitPercent) || 50)),
    resultHeight: Math.min(420, Math.max(150, Math.round(Number(layout.resultHeight) || 220)))
  };
}

function isVideoJob(job: StudioJob): job is VideoGenerationJob {
  return job.mediaType === "video";
}

function isImageJob(job: StudioJob): job is ProductShotJob {
  return !job.mediaType || job.mediaType === "image";
}

function getModelDisplayName(providerId: unknown, modelId: string): string {
  return (
    modelPrices.find((price) => price.providerId === providerId && price.modelId === modelId)?.displayName ??
    modelId
  );
}

function getVideoModelDisplayName(providerId: ProviderId, modelId: string): string {
  return getVideoModelMeta(providerId, modelId)?.displayName ?? modelId;
}

function getProviderDisplayName(providerId: unknown): string {
  return isProviderId(providerId) ? providerConfigs[providerId].displayName : uiText.unknownProvider;
}

function getPresetName(presetId: unknown): string {
  return typeof presetId === "string" && presetId in presetLabels
    ? presetLabels[presetId as PresetId].name
    : uiText.unknownPreset;
}

function isPresetId(value: unknown): value is PresetId {
  return typeof value === "string" && value in presetLabels;
}

function mergeLegacyPromptFields(productBrief?: string, styleGuide?: string, posterCopy?: string): string {
  return [productBrief, styleGuide, posterCopy]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join("\n\n");
}

function formatSignedCredits(amountCents: number): string {
  const sign = amountCents > 0 ? "+" : amountCents < 0 ? "-" : "";
  return `${sign}${formatUsdCents(Math.abs(amountCents))}`;
}

function isProviderId(value: unknown): value is ProviderId {
  return typeof value === "string" && value in providerConfigs;
}

function WeChatQr(props: { amountCents: number; providerId: ProviderId; modelId: string }) {
  const seed = `${props.providerId}-${props.modelId}-${props.amountCents}`;
  return (
    <div className="wechat-qr" aria-label="WeChat QR">
      {Array.from({ length: 81 }).map((_, index) => {
        const active = (seed.charCodeAt(index % seed.length) + index * 7) % 5 < 2;
        return <span key={index} className={active ? "active" : ""} />;
      })}
      <QrCode size={32} />
    </div>
  );
}

function ApiKeysDialog(props: {
  statuses: SecretStatus[];
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [values, setValues] = useState<Record<ProviderId, string>>({
    aliyun: "",
    volcano: "",
    tencent: ""
  });
  const [message, setMessage] = useState("");

  async function save(providerId: ProviderId) {
    const value = values[providerId].trim();
    if (!value) return;
    await window.productStudio.saveKey(providerId, value);
    setValues((current) => ({ ...current, [providerId]: "" }));
    setMessage(`${providerConfigs[providerId].displayName} ${uiText.saved}`);
    props.onUpdated();
  }

  async function remove(providerId: ProviderId) {
    await window.productStudio.deleteKey(providerId);
    setMessage(`${providerConfigs[providerId].displayName} ${uiText.deleted}`);
    props.onUpdated();
  }

  async function validate(providerId: ProviderId) {
    const ok = await window.productStudio.validateKey(providerId);
    setMessage(ok ? `${providerConfigs[providerId].displayName} ${uiText.works}` : `${providerConfigs[providerId].displayName} ${uiText.validationFailed}`);
  }

  return (
    <div className="modal-backdrop">
      <div className="settings-dialog">
        <header>
          <h2>{uiText.apiKeys}</h2>
          <button className="icon-button" onClick={props.onClose} title={uiText.close}>
            <X size={16} />
          </button>
        </header>
        <div className="key-list">
          {providerOrder.map((providerId) => {
            const configured = props.statuses.find((item) => item.providerId === providerId)?.configured;
            return (
              <div key={providerId} className="key-card">
                <div className="key-guide">
                  <div>
                    <strong>{providerConfigs[providerId].displayName}</strong>
                    <span>{configured ? uiText.configured : uiText.notConfigured}</span>
                  </div>
                  <ol>
                    {apiKeyGuides[providerId].map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                  <div className="guide-links">
                    <a href={providerConfigs[providerId].apiKeyUrl} target="_blank" rel="noreferrer">
                      {uiText.openKeyPage}
                    </a>
                    <a href={providerConfigs[providerId].termsUrl} target="_blank" rel="noreferrer">
                      {uiText.providerTerms}
                    </a>
                  </div>
                </div>
                <div className="key-row">
                  <input
                    type="password"
                    value={values[providerId]}
                    placeholder="API Key"
                    onChange={(event) =>
                      setValues((current) => ({ ...current, [providerId]: event.target.value }))
                    }
                  />
                  <button className="secondary-button" onClick={() => void save(providerId)}>
                    <KeyRound size={16} />
                    {uiText.save}
                  </button>
                  <button className="icon-button" onClick={() => void validate(providerId)} title={uiText.validate}>
                    <Check size={16} />
                  </button>
                  <button className="icon-button danger" onClick={() => void remove(providerId)} title={uiText.delete}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <footer>{message || uiText.localKeysOnly}</footer>
      </div>
    </div>
  );
}

function SettingsDialog(props: {
  defaultExportDir: string;
  exportFormat: ExportFormat;
  tencentVodSubAppId: string;
  embedded?: boolean;
  onExportFormatChange: (format: ExportFormat) => void;
  onTencentVodSubAppIdChange: (value: string) => void;
  onClose: () => void;
  onChooseExportFolder: () => void;
  onOpenTutorial: () => void;
}) {
  const content = (
      <div className={`settings-dialog ${props.embedded ? "embedded-panel" : ""}`}>
        <header>
          <h2>{uiText.settingsPage}</h2>
          {props.embedded ? null : (
            <button className="icon-button" onClick={props.onClose} title={uiText.close}>
              <X size={16} />
            </button>
          )}
        </header>
        <div className="settings-list">
          <section className="settings-card">
            <div>
              <strong>{uiText.defaultExportFolder}</strong>
              <span title={props.defaultExportDir}>{props.defaultExportDir || uiText.chooseFolder}</span>
            </div>
            <button className="secondary-button" onClick={props.onChooseExportFolder}>
              <FolderOpen size={16} />
              {uiText.changeExportFolder}
            </button>
          </section>
          <section className="settings-card settings-format-card">
            <div>
              <strong>{uiText.outputFormat}</strong>
              <span>用于生成、导出和预览保存的默认图片格式</span>
            </div>
            <SegmentedControl
              items={exportFormats}
              value={props.exportFormat}
              onChange={props.onExportFormatChange}
            />
          </section>
          <section className="settings-card settings-vod-card">
            <div>
              <strong>腾讯云点播 SubAppId</strong>
              <span>腾讯 VOD AIGC 生视频任务使用；API 密钥仍使用 SecretId:SecretKey</span>
            </div>
            <input
              type="text"
              inputMode="numeric"
              value={props.tencentVodSubAppId}
              placeholder="例如 1500000000"
              onChange={(event) => props.onTencentVodSubAppIdChange(event.target.value)}
            />
          </section>
          <section className="settings-card">
            <div>
              <strong>{uiText.tutorial}</strong>
              <span>{uiText.tutorialSettingsHint}</span>
            </div>
            <button className="secondary-button" onClick={props.onOpenTutorial}>
              <HelpCircle size={16} />
              {uiText.openTutorial}
            </button>
          </section>
        </div>
      </div>
  );

  if (props.embedded) {
    return <main className="page-workspace">{content}</main>;
  }

  return (
    <div className="modal-backdrop">
      {content}
    </div>
  );
}
