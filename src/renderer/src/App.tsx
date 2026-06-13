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
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  CreditCard,
  Download,
  Edit3,
  FolderOpen,
  GripVertical,
  HelpCircle,
  History,
  ImagePlus,
  KeyRound,
  LayoutGrid,
  Loader2,
  LogOut,
  Megaphone,
  Play,
  QrCode,
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
import loginStudioIllustrationUrl from "../assets/login-studio-illustration.png";
import tutorialApiConfigUrl from "../assets/tutorial-api-config.png";
import tutorialImportUrl from "../assets/tutorial-import.png";
import tutorialResultsUrl from "../assets/tutorial-results.png";
import tutorialTroubleshootingUrl from "../assets/tutorial-troubleshooting.png";
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
  ExportFormat,
  GenerateProgress,
  ImageQuality,
  ImportedImage,
  LocalAccountSummary,
  PresetId,
  ProductShotJob,
  ProductShotResult,
  ProviderId,
  SecretStatus,
  StudioJob,
  VideoGenerationJob,
  VideoModelMetadata,
  VideoProgress,
  VideoResolution,
  WalletSummary,
  WalletTransaction
} from "@shared/types";

const aspectRatios: AspectRatio[] = ["1:1", "4:5", "16:9", "3:2"];
const exportFormats: ExportFormat[] = ["png", "jpg", "webp"];
type AppPage = "image" | "video" | "personal" | "updates" | "settings";
type PersonalCenterTab = "overview" | "history" | "recharge" | "transactions" | "trash";
type StatusTone = "normal" | "warn";
type ExportFeedback = "idle" | "running" | "done";
type GenerateMode = "single" | "batch";
type PreviewCompareLayout = "grid-2x2" | "grid-3x3" | "grid-4x4" | "custom" | "adaptive";
type PreviewImage = {
  src: string;
  filePath?: string;
  title: string;
  subtitle?: string;
  fileName?: string;
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
  tutorialIntro: "Product Shot Studio \u662f\u4e00\u4e2a Windows AI \u5546\u62cd\u5de5\u4f5c\u53f0\uff0c\u7528\u666e\u901a\u4ea7\u54c1\u7167\u751f\u6210\u767d\u5e95\u4e3b\u56fe\u3001\u751f\u6d3b\u573a\u666f\u56fe\u3001\u8d28\u611f\u7279\u5199\u56fe\u548c\u8425\u9500\u6a2a\u56fe\u3002\u5bc6\u94a5\u4ecd\u4fdd\u7559\u5728\u684c\u9762\u7aef\uff0c\u8d26\u53f7\u3001\u79ef\u5206\u548c\u5145\u503c\u6d41\u6c34\u7531\u672c\u5730\u8d26\u672c\u670d\u52a1\u7edf\u4e00\u8bb0\u5f55\u3002",
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
  const [videoAspectRatio, setVideoAspectRatio] = useState<AspectRatio>("16:9");
  const [videoDurationSeconds, setVideoDurationSeconds] = useState(5);
  const [tencentVodSubAppId, setTencentVodSubAppId] = useState(() => readSavedTencentVodSubAppId());
  const [imageWorkspaceLayout, setImageWorkspaceLayout] = useState(() => readWorkspaceLayout("image"));
  const [videoWorkspaceLayout, setVideoWorkspaceLayout] = useState(() => readWorkspaceLayout("video"));
  const [importedImages, setImportedImages] = useState<ImportedImage[]>([]);
  const [activeImagePath, setActiveImagePath] = useState<string | null>(null);
  const [history, setHistory] = useState<StudioJob[]>([]);
  const [trashedHistory, setTrashedHistory] = useState<StudioJob[]>([]);
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<ExportFeedback>("idle");
  const [dragActive, setDragActive] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [pendingGenerateMode, setPendingGenerateMode] = useState<GenerateMode | null>(null);
  const [defaultExportDir, setDefaultExportDir] = useState("");
  const [previewImage, setPreviewImage] = useState<PreviewImage | null>(null);
  const [modelSectionCollapsed, setModelSectionCollapsed] = useState(false);

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
  const failedPresetIds = useMemo(() => getFailedPresetIds(activeJob), [activeJob]);
  const canRetryFailed = Boolean(activeJob && failedPresetIds.length > 0 && !isGenerating);
  const activeImage = importedImages.find((image) => image.sourceImagePath === activeImagePath) ?? importedImages[0] ?? null;
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
      sourceImagePath: activeImage?.sourceImagePath ?? "",
      providerId: videoProviderId,
      modelId: videoModelId,
      tencentVodSubAppId,
      prompt: videoPrompt,
      aspectRatio: videoAspectRatio,
      durationSeconds: videoDurationSeconds,
      resolution: hiddenVideoResolution,
      watermark: false,
      enableAudio: false
    }),
    [
      activeImage?.sourceImagePath,
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
    activeImage &&
      videoProviderConfigured &&
      videoSupported &&
      !videoSetupWarning &&
      !isGeneratingVideo &&
      hasEnoughVideoBalance
  );
  const workflowResultCount = results.length;
  const hasCurrentWork = Boolean(activeImage);
  const workflowSteps = useMemo(
    () => [
      {
        label: uiText.workflowImport,
        description: "上传商品图，支持拖拽或批量导入",
        done: hasCurrentWork,
        active: !hasCurrentWork
      },
      {
        label: uiText.workflowConfigure,
        description: "选择模型与生成参数",
        done: hasCurrentWork && configuredProvider && selectedPresets.length > 0,
        active: hasCurrentWork && (!configuredProvider || selectedPresets.length === 0)
      },
      {
        label: uiText.workflowGenerate,
        description: "AI 生成优质商品图",
        done: workflowResultCount > 0,
        active: hasCurrentWork && configuredProvider && selectedPresets.length > 0 && workflowResultCount === 0
      },
      {
        label: uiText.workflowExport,
        description: "下载图片或专业素材",
        done: exportFeedback === "done",
        active: workflowResultCount > 0 && exportFeedback !== "done"
      }
    ],
    [configuredProvider, exportFeedback, hasCurrentWork, selectedPresets.length, workflowResultCount]
  );
  const videoWorkflowSteps = useMemo(
    () => [
      {
        label: uiText.workflowImport,
        description: "上传商品图，作为图生视频首帧参考",
        done: hasCurrentWork,
        active: !hasCurrentWork
      },
      {
        label: uiText.workflowConfigure,
        description: "选择视频模型、比例和时长",
        done: hasCurrentWork && videoProviderConfigured && videoSupported && !videoSetupWarning,
        active: hasCurrentWork && (!videoProviderConfigured || !videoSupported || Boolean(videoSetupWarning))
      },
      {
        label: uiText.workflowGenerate,
        description: "AI 生成商品视频",
        done: videoResults.length > 0,
        active: hasCurrentWork && videoProviderConfigured && videoSupported && !videoSetupWarning && videoResults.length === 0
      },
      {
        label: uiText.workflowExport,
        description: "导出视频素材",
        done: exportFeedback === "done",
        active: videoResults.length > 0 && exportFeedback !== "done"
      }
    ],
    [
      exportFeedback,
      hasCurrentWork,
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
    const [statuses, jobs, trashedJobs, wallet, transactions] = await Promise.all([
      window.productStudio.getKeyStatus(),
      window.productStudio.listHistory(),
      window.productStudio.listTrashedHistory(),
      window.productStudio.getWallet(),
      window.productStudio.listWalletTransactions(100)
    ]);
    setKeyStatus(statuses);
    setHistory(jobs);
    setTrashedHistory(trashedJobs);
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
  }

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
    setWalletTransactions([]);
    setProgress({});
    setVideoProgress(null);
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const filePaths = Array.from(files).map((file) => window.productStudio.getFilePath(file)).filter(Boolean);
    if (filePaths.length === 0) {
      showStatus(uiText.cannotReadPath, "warn");
      return;
    }
    try {
      showStatus(uiText.importing);
      const imported = await Promise.all(filePaths.map((filePath) => window.productStudio.importImage(filePath)));
      appendImportedImages(imported);
      showStatus(uiText.imageReady);
    } catch (error) {
      showStatus(error instanceof Error ? error.message : uiText.importFailed, "warn");
    }
  }

  async function selectImages() {
    try {
      showStatus(uiText.importing);
      const imported = await window.productStudio.selectImages();
      if (imported.length === 0) {
        showStatus(uiText.imageCanceled);
        return;
      }
      appendImportedImages(imported);
      showStatus(uiText.imageReady);
    } catch (error) {
      showStatus(error instanceof Error ? error.message : uiText.importFailed, "warn");
    }
  }

  function appendImportedImages(images: ImportedImage[]) {
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

  function deleteImage(imagePath: string) {
    setImportedImages((current) => {
      const next = current.filter((image) => image.sourceImagePath !== imagePath);
      if (activeImagePath === imagePath) {
        setActiveImagePath(next[0]?.sourceImagePath ?? null);
      }
      return next;
    });
    setActiveJob(null);
  }

  function clearImages() {
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
    if (!activeImage) return;
    setIsGeneratingVideo(true);
    setCurrentVideoJobId(null);
    setVideoProgress(null);
    showStatus(uiText.generatingVideo);

    try {
      const job = await window.productStudio.generateProductVideo({
        sourceImagePath: activeImage.sourceImagePath,
        providerId: videoProviderId,
        modelId: videoModelId,
        tencentVodSubAppId,
        prompt: videoPrompt.trim(),
        aspectRatio: videoAspectRatio,
        durationSeconds: videoDurationSeconds,
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
    showStatus(uiText.exporting);
    try {
      const targetDir = defaultExportDir || (await resolveDefaultExportDir());
      const response = await window.productStudio.exportImages({ imagePaths, format: exportFormat, targetDir });
      if (response.exportedPaths.length > 0) {
        setExportFeedback("done");
        showStatus(`${uiText.exportComplete}\uff1a${response.exportedPaths.length} ${uiText.imageCountSuffix} / ${targetDir}`);
        window.setTimeout(() => {
          setExportFeedback((current) => (current === "done" ? "idle" : current));
        }, 1600);
      } else {
        setExportFeedback("idle");
        showStatus(uiText.exportCanceled, "warn");
      }
    } catch (error) {
      setExportFeedback("idle");
      showStatus(error instanceof Error ? error.message : uiText.exportCanceled, "warn");
    }
  }

  async function exportVideoPaths(videoPaths: string[]) {
    if (videoPaths.length === 0) {
      showStatus(uiText.videoWaiting, "warn");
      return;
    }
    setExportFeedback("running");
    showStatus(uiText.exporting);
    try {
      const targetDir = defaultExportDir || (await resolveDefaultExportDir());
      const response = await window.productStudio.exportVideos({ videoPaths, targetDir });
      if (response.exportedPaths.length > 0) {
        setExportFeedback("done");
        showStatus(`${uiText.exportComplete}\uff1a${response.exportedPaths.length} ${uiText.exportVideo} / ${targetDir}`);
        window.setTimeout(() => {
          setExportFeedback((current) => (current === "done" ? "idle" : current));
        }, 1600);
      } else {
        setExportFeedback("idle");
        showStatus(uiText.exportCanceled, "warn");
      }
    } catch (error) {
      setExportFeedback("idle");
      showStatus(error instanceof Error ? error.message : uiText.exportCanceled, "warn");
    }
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

  function selectImageModel(option: ImageModelOption) {
    setProviderId(option.providerId);
    setModelId(option.modelId);
    persistModelSelection(option.providerId, option.modelId);
  }

  function toggleModelSection() {
    setModelSectionCollapsed((current) => !current);
  }

  function selectHistoryJob(job: ProductShotJob) {
    setActiveJob(job);
    setActivePage("image");
    syncFormFromJob(job);
  }

  function selectVideoHistoryJob(job: VideoGenerationJob) {
    setActiveVideoJob(job);
    setActivePage("video");
    if (isProviderId(job.request.providerId)) {
      setVideoProviderId(job.request.providerId);
    }
    setVideoModelId(job.request.modelId);
    setVideoPrompt(job.request.prompt);
    setVideoAspectRatio(job.request.aspectRatio);
    setVideoDurationSeconds(job.request.durationSeconds);
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

  const imageModelControls = (
    <section className={`control-group model-control preset-model-control ${modelSectionCollapsed ? "collapsed" : ""}`}>
      <div className="section-title">
        <span>{uiText.model}</span>
        <div className="section-actions">
          <button className="icon-button" onClick={toggleModelSection} title={modelSectionCollapsed ? uiText.expandModel : uiText.collapseModel}>
            {modelSectionCollapsed ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
          </button>
          <button className="icon-button" onClick={() => setSettingsOpen(true)} title={uiText.apiKeys}>
            <Settings size={17} />
          </button>
        </div>
      </div>
      {modelSectionCollapsed ? (
        <button className="model-collapsed-card" onClick={toggleModelSection}>
          <ProviderLogo providerId={providerId} />
          <span className="model-collapsed-copy">
            <strong>{getModelDisplayName(providerId, modelId)}</strong>
          </span>
        </button>
      ) : (
        <div className="model-picker compact-model-picker model-picker-unified">
          <div className="model-option-list">
            {modelOptions.map((option) => {
              const active = providerId === option.providerId && modelId === option.modelId;
              const configured = keyStatus.find((item) => item.providerId === option.providerId)?.configured;
              return (
                <button
                  key={`${option.providerId}:${option.modelId}`}
                  className={active ? "active" : ""}
                  onClick={() => selectImageModel(option)}
                >
                  <ProviderLogo providerId={option.providerId} compact />
                  <span className="model-option-copy">
                    <strong>{option.displayName}</strong>
                  </span>
                  {configured ? <Check size={15} /> : <KeyRound size={15} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );

  if (!session) {
    return (
      <AuthScreen
        rememberedSession={rememberedSession}
        onAuthenticate={authenticate}
        onResume={() => void resumeRememberedSession()}
      />
    );
  }

  return (
    <div className="app-frame">
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
                  <button className="primary-button generate-button cost-action-button" onClick={confirmGenerate} disabled={!canGenerate}>
                    {isGenerating ? <Loader2 className="spin" size={18} /> : <Play size={18} />}
                    <span>{uiText.generate}（{outputCount}张）</span>
                    <small>{formatUsdCents(estimatedCostCents)}</small>
                  </button>
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
                            <button className="secondary-button" onClick={clearImages}>
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
                      {imageModelControls}
                      <section className="embedded-output-panel">
                        <div className="section-title">
                          <span>{uiText.output}</span>
                        </div>
                        <div className="output-config-grid">
                          <div className="output-config-field output-ratio-field">
                            <span>{uiText.customAspectRatio}</span>
                            <OutputDropdown
                              value={aspectRatio}
                              options={aspectRatios}
                              customLabel="自定义比例"
                              inputType="text"
                              placeholder="1:1"
                              onChange={setAspectRatio}
                            />
                          </div>
                          <div className="output-config-field output-count-field">
                            <span>{uiText.outputCount}</span>
                            <OutputDropdown
                              value={`${outputCount} 张`}
                              options={[1, 2, 3, 4].map((item) => `${item} 张`)}
                              customLabel="自定义张数"
                              inputType="number"
                              min={1}
                              max={4}
                              placeholder="1"
                              customValue={String(outputCount)}
                              onChange={(value) => setOutputCount(clampOutputCount(Number.parseInt(value, 10)))}
                              onCustomChange={(value) => setOutputCount(clampOutputCount(Number.parseInt(value, 10)))}
                            />
                          </div>
                        </div>
                      </section>

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

                    <section className="result-band">
                    <div className="section-title">
                      <span>生成结果</span>
                      <div className="section-actions">
                        {activeJob?.errors.length ? <span className="error-count">{activeJob.errors.length} {uiText.errors}</span> : null}
                        <button
                          className="secondary-button compact-button"
                          onClick={() => void exportAll()}
                          disabled={results.length === 0 || isExporting}
                        >
                          {isExporting ? <Loader2 className="spin" size={14} /> : <Download size={14} />}
                          导出全部
                        </button>
                      </div>
                    </div>
                    {activeJob?.errors.length ? <FailurePanel job={activeJob} /> : null}
                    <div className="result-grid">
                      {results.length === 0 ? (
                        <div className="empty-results">{uiText.waitingResults}</div>
                      ) : (
                        results.map((result) => (
                          <figure key={`${result.presetId}-${result.imagePath}`} className="result-tile result-enter">
                            <button
                              className="result-image-button"
                              onClick={() =>
                                setPreviewImage({
                                  src: window.productStudio.toFileUrl(result.imagePath),
                                  filePath: result.imagePath,
                                  title: getPresetName(result.presetId),
                                  subtitle: `${uiText.usedModel}: ${getModelDisplayName(result.providerId, result.modelId)}`,
                                  fileName: `${result.presetId}-${result.modelId}.png`
                                })
                              }
                            >
                              <img src={window.productStudio.toFileUrl(result.imagePath)} alt={result.presetId} />
                            </button>
                            <figcaption>
                              <span>{getPresetName(result.presetId)}</span>
                              <small>{result.dimensions.width ? `${result.dimensions.width} x ${result.dimensions.height}` : result.modelId}</small>
                              <button
                                className="icon-button"
                                onClick={() => void exportImagePaths([result.imagePath])}
                                disabled={isExporting}
                                title={uiText.export}
                              >
                                {isExporting ? <Loader2 className="spin" size={14} /> : <Download size={14} />}
                              </button>
                            </figcaption>
                          </figure>
                        ))
                      )}
                      </div>
                    </section>
                  </ResizableWorkspace>
                </div>
              </div>
            </div>
          </main>
        ) : activePage === "video" ? (
          <VideoGenerationPage
            activeImage={activeImage}
            importedImages={importedImages}
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
            isGenerating={isGeneratingVideo}
            isExporting={isExporting}
            canGenerate={canGenerateVideo}
            onSelectImage={selectImages}
            onSelectImagePath={setActiveImagePath}
            onModelSelect={(option) => {
              setVideoProviderId(option.providerId);
              setVideoModelId(option.modelId);
            }}
            onPromptChange={setVideoPrompt}
            onAspectRatioChange={setVideoAspectRatio}
            onDurationChange={(value) => setVideoDurationSeconds(clampVideoDuration(value))}
            onLayoutChange={updateVideoWorkspaceLayout}
            onGenerate={() => void generateVideo()}
            onCancel={() => void cancelVideoGeneration()}
            onExport={(videoPath) => void exportVideoPaths([videoPath])}
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
          onCancel={() => setPendingGenerateMode(null)}
          onConfirm={runPendingGeneration}
        />
      ) : null}
      {previewImage ? (
        <ImagePreviewDialog
          image={previewImage}
          exportFormat={exportFormat}
          defaultExportDir={defaultExportDir}
          resolveDefaultExportDir={resolveDefaultExportDir}
          onClose={() => setPreviewImage(null)}
          onSaved={(path) => showStatus(`${uiText.saved} ${path}`)}
        />
      ) : null}
    </div>
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
  workflowSteps: Array<{ label: string; description: string; done: boolean; active: boolean }>;
  progress: VideoProgress | null;
  job: VideoGenerationJob | null;
  layout: WorkspaceLayoutSize;
  isGenerating: boolean;
  isExporting: boolean;
  canGenerate: boolean;
  onSelectImage: () => void;
  onSelectImagePath: (path: string) => void;
  onModelSelect: (model: VideoModelMetadata) => void;
  onPromptChange: (prompt: string) => void;
  onAspectRatioChange: (ratio: AspectRatio) => void;
  onDurationChange: (value: number) => void;
  onLayoutChange: (layout: WorkspaceLayoutSize) => void;
  onGenerate: () => void;
  onCancel: () => void;
  onExport: (videoPath: string) => void;
}) {
  const configured = props.keyStatus.find((item) => item.providerId === props.providerId)?.configured ?? false;
  const hasEnoughCredits = (props.wallet?.balanceCents ?? 0) >= props.estimatedCost;
  const durationItems = props.durationOptions.map((item) => `${item}s`);
  const currentModelName = getVideoModelDisplayName(props.providerId, props.modelId);
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
          <button className="primary-button cost-action-button" onClick={props.onGenerate} disabled={!props.canGenerate}>
            {props.isGenerating ? <Loader2 className="spin" size={18} /> : <Play size={18} />}
            <span>{uiText.generateVideo}</span>
            <small>{formatUsdCents(props.estimatedCost)}</small>
          </button>
        </div>
      </header>

      <WorkflowRibbon steps={props.workflowSteps} busy={props.isGenerating || props.isExporting} />

      <ResizableWorkspace
        className="video-resizable-workspace"
        layout={props.layout}
        onLayoutChange={props.onLayoutChange}
      >
        <section className="video-source-panel">
          <div className="section-title"><span>{uiText.imageQueue}</span></div>
          {props.activeImage ? (
            <>
              <button className="video-source-preview" onClick={props.onSelectImage}>
                <img src={props.activeImage.previewDataUrl} alt="Product source" />
              </button>
              <div className="image-queue compact-queue">
                {props.importedImages.map((image, index) => (
                  <button
                    key={image.sourceImagePath}
                    className={image.sourceImagePath === props.activeImage?.sourceImagePath ? "active" : ""}
                    onClick={() => props.onSelectImagePath(image.sourceImagePath)}
                  >
                    <img src={image.previewDataUrl} alt={`Product ${index + 1}`} />
                    <span>{index + 1}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-results">
              {uiText.clickOrDragUpload}
              <button className="secondary-button" onClick={props.onSelectImage}>
                <Upload size={17} />
                {uiText.addImages}
              </button>
            </div>
          )}
        </section>

        <section className="video-control-panel">
          <section className="control-group model-control preset-model-control video-model-control">
            <div className="section-title">
              <span>{uiText.model}</span>
              <small>{currentModelName}</small>
            </div>
            <div className="model-picker compact-model-picker model-picker-unified">
              <div className="model-option-list">
                {props.modelOptions.map((option) => {
                  const active = props.providerId === option.providerId && props.modelId === option.modelId;
                  const configured = props.keyStatus.find((item) => item.providerId === option.providerId)?.configured;
                  return (
                    <button
                      key={`${option.providerId}:${option.modelId}`}
                      className={active ? "active" : ""}
                      onClick={() => props.onModelSelect(option)}
                    >
                      <ProviderLogo providerId={option.providerId} compact />
                      <span className="model-option-copy">
                        <strong>{option.displayName}</strong>
                      </span>
                      {configured ? <Check size={15} /> : <KeyRound size={15} />}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="embedded-output-panel video-output-panel">
            <div className="section-title">
              <span>{uiText.output}</span>
            </div>
            <div className="output-config-grid video-output-config-grid">
              <div className="output-config-field output-ratio-field">
                <span>{uiText.customAspectRatio}</span>
                <OutputDropdown
                  value={props.aspectRatio}
                  options={props.aspectRatioOptions}
                  customLabel="自定义比例"
                  inputType="text"
                  placeholder="16:9"
                  onChange={props.onAspectRatioChange}
                />
              </div>
              <div className="output-config-field output-duration-field">
                <span>{uiText.videoDuration}</span>
                <SegmentedControl
                  items={durationItems}
                  value={`${props.durationSeconds}s`}
                  onChange={(value) => props.onDurationChange(Number.parseInt(value, 10))}
                />
              </div>
            </div>
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
          {props.setupWarning ? <div className="auth-message">{props.setupWarning}</div> : null}
          {props.progress ? <div className="status-line"><span>{props.progress.message}</span></div> : null}
        </section>

      <section className="result-band video-result-band">
        <div className="section-title">
          <span>{uiText.results}</span>
          {props.job?.errors.length ? <span className="error-count">{props.job.errors.length} {uiText.errors}</span> : null}
        </div>
        {props.job?.errors.length ? <FailurePanel job={props.job} /> : null}
        {props.job?.results.length ? (
          <div className="video-result-grid">
            {props.job.results.map((result) => (
              <figure key={result.videoPath} className="video-result-card">
                <video src={window.productStudio.toFileUrl(result.videoPath)} controls />
                <figcaption>
                  <span>{result.durationSeconds}s / {result.resolution} / {result.aspectRatio}</span>
                  <button className="secondary-button" onClick={() => props.onExport(result.videoPath)} disabled={props.isExporting}>
                    {props.isExporting ? <Loader2 className="spin" size={15} /> : <Download size={15} />}
                    {uiText.exportVideo}
                  </button>
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <div className="empty-results">{uiText.videoWaiting}</div>
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

function WorkflowRibbon(props: {
  steps: Array<{ label: string; description: string; done: boolean; active: boolean }>;
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

function AuthScreen(props: {
  rememberedSession: AuthSession | null;
  onAuthenticate: (mode: "login" | "signup", username: string, password: string) => Promise<void>;
  onResume: () => void;
}) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [accounts, setAccounts] = useState<LocalAccountSummary[]>([]);
  const [hiddenRememberedUserId, setHiddenRememberedUserId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const rememberedSession =
    props.rememberedSession?.userId === hiddenRememberedUserId ? null : props.rememberedSession;

  useEffect(() => {
    void loadAccounts();
  }, []);

  async function loadAccounts() {
    setAccounts(await window.productStudio.listAccounts());
  }

  async function submit() {
    setBusy(true);
    setMessage("");
    try {
      await props.onAuthenticate(mode, username, password);
      await loadAccounts();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : uiText.generationFailed);
    } finally {
      setBusy(false);
    }
  }

  async function removeAccount(userId: string) {
    await window.productStudio.deleteAccount(userId);
    await loadAccounts();
    setMessage(uiText.accountDeleted);
    if (props.rememberedSession?.userId === userId) {
      setHiddenRememberedUserId(userId);
    }
  }

  function selectAccount(account: LocalAccountSummary) {
    setMode("login");
    setUsername(account.username);
    setPassword("");
    setMessage("");
  }

  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <div className="auth-hero-card">
          <div className="brand-block">
            <div className="brand-mark">
              <Sparkles size={18} />
            </div>
            <div>
              <h1>Product Shot Studio</h1>
              <p>{uiText.tagline}</p>
            </div>
          </div>
          <h2>{uiText.loginHeroTitle}</h2>
          <p>{uiText.loginHeroSubtitle}</p>
        </div>
        {rememberedSession ? (
          <div className="remembered-account">
            <div>
              <span>{uiText.rememberedAccount}</span>
              <strong>{rememberedSession.username}</strong>
            </div>
            <button className="primary-button" onClick={props.onResume}>
              <User size={18} />
              {uiText.continueLogin}
            </button>
          </div>
        ) : null}
        <div className="local-account-list">
          <div className="section-title">
            <span>{uiText.localAccounts}</span>
            <small>{accounts.length} {uiText.records}</small>
          </div>
          {accounts.length === 0 ? (
            <div className="empty-small">{uiText.emptyAccounts}</div>
          ) : (
            accounts.map((account) => (
              <div key={account.userId} className="local-account-item">
                <button onClick={() => selectAccount(account)} title={uiText.selectAccount}>
                  <User size={16} />
                  <span>
                    <strong>{account.username}</strong>
                    <small>{uiText.accountCreatedAt} {new Date(account.createdAt).toLocaleDateString()}</small>
                  </span>
                </button>
                <button className="icon-button danger" onClick={() => void removeAccount(account.userId)} title={uiText.deleteAccount}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>
        <div className="auth-tabs">
          <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
            {uiText.login}
          </button>
          <button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>
            {uiText.signUp}
          </button>
        </div>
        <label>
          <span>{uiText.username}</span>
          <input value={username} onChange={(event) => setUsername(event.target.value)} />
        </label>
        <label>
          <span>{uiText.password}</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <button className="primary-button" onClick={() => void submit()} disabled={busy}>
          {busy ? <Loader2 className="spin" size={18} /> : <User size={18} />}
          {mode === "login" ? uiText.login : uiText.signUp}
        </button>
        <p className="auth-footnote">{uiText.localAccountOnly}</p>
        {message ? <div className="auth-message">{message}</div> : null}
      </div>
      <div className="auth-side">
        <div className="login-illustration-panel">
          <img src={loginStudioIllustrationUrl} alt="" />
          <div>
            <strong>{uiText.loginHeroTitle}</strong>
            <span>{uiText.loginHeroSubtitle}</span>
          </div>
        </div>
        <PriceTable compact={false} />
      </div>
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

        <div className="generate-confirm-source-hint">
          <span title={sourceImages.map((image) => image.sourceImagePath).join("\n")}>
            {sourceImages[0]?.sourceImagePath ?? "未选择源图"}
            {sourceImages.length > 1 ? ` 等 ${sourceImages.length} 张` : ""}
          </span>
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
  const steps = [
    {
      imageUrl: tutorialImportUrl,
      title: "\u5bfc\u5165\u4ea7\u54c1\u56fe",
      body: "\u70b9\u51fb\u201c\u6dfb\u52a0\u56fe\u7247\u201d\u6216\u76f4\u63a5\u628a\u4ea7\u54c1\u7167\u62d6\u5230\u4e2d\u95f4\u5de5\u4f5c\u533a\u3002\u53ef\u4ee5\u4e00\u6b21\u6dfb\u52a0\u591a\u5f20\uff0c\u7136\u540e\u5728\u7f29\u7565\u56fe\u961f\u5217\u91cc\u5207\u6362\u4e3b\u56fe\u3002"
    },
    {
      imageUrl: tutorialApiConfigUrl,
      title: "\u914d\u7f6e API \u5bc6\u94a5\u4e0e\u6a21\u578b",
      body: "\u8fdb\u5165\u201cAPI \u5bc6\u94a5\u201d\u586b\u5199\u5df2\u5f00\u901a\u7684\u56fd\u5185\u6a21\u578b\u5e73\u53f0\u5bc6\u94a5\uff0c\u7136\u540e\u5728\u4e3b\u5de5\u4f5c\u53f0\u7684\u6a21\u578b\u5217\u8868\u4e2d\u9009\u62e9\u8981\u4f7f\u7528\u7684\u6a21\u578b\u3002"
    },
    {
      imageUrl: tutorialResultsUrl,
      title: "\u751f\u6210\u5546\u62cd\u5957\u88c5",
      body: "\u9009\u62e9\u6bd4\u4f8b\u548c\u5f20\u6570\uff0c\u518d\u9009\u62e9\u63d0\u793a\u8bcd\u6a21\u677f\u6216\u8f93\u5165\u81ea\u5b9a\u4e49\u63d0\u793a\u8bcd\u3002\u70b9\u51fb\u201c\u751f\u6210\u201d\u540e\uff0c\u7cfb\u7edf\u4f1a\u6309\u5f53\u524d\u6a21\u677f\u548c\u5f20\u6570\u751f\u6210\u7ed3\u679c\u3002"
    },
    {
      imageUrl: tutorialTroubleshootingUrl,
      title: "\u9884\u89c8\u3001\u7f16\u8f91\u3001\u5bfc\u51fa\u548c\u6062\u590d",
      body: "\u70b9\u51fb\u4efb\u610f\u7ed3\u679c\u56fe\u53ef\u653e\u5927\u9884\u89c8\uff0c\u53ef\u8c03\u6574\u4eae\u5ea6\u3001\u5bf9\u6bd4\u5ea6\u548c\u9971\u548c\u5ea6\u540e\u4fdd\u5b58\u3002\u5220\u9664\u7684\u5386\u53f2\u8bb0\u5f55\u4f1a\u8fdb\u5165\u56de\u6536\u7ad9\uff0c\u53ef\u5728\u4e2a\u4eba\u4e2d\u5fc3\u6062\u590d\u3002"
    }
  ];
  const faqs = [
    {
      question: "\u751f\u6210\u5931\u8d25\u600e\u4e48\u529e\uff1f",
      answer: "\u5148\u67e5\u770b\u7ed3\u679c\u533a\u7684\u5931\u8d25\u539f\u56e0\u3002\u5e38\u89c1\u539f\u56e0\u5305\u62ec API \u5bc6\u94a5\u65e0\u6548\u3001\u6a21\u578b\u672a\u5f00\u901a\u3001\u63a5\u5165\u70b9 ID \u4e0d\u5339\u914d\u3001\u5e73\u53f0\u4f59\u989d\u4e0d\u8db3\u6216\u56fe\u7247\u5c3a\u5bf8\u4e0d\u7b26\u5408\u4f9b\u5e94\u5546\u8981\u6c42\u3002"
    },
    {
      question: "\u4ea7\u54c1\u5916\u89c2\u4e0d\u591f\u50cf\u539f\u56fe\u600e\u4e48\u529e\uff1f",
      answer: "\u5728\u4ea7\u54c1\u4fe1\u606f\u91cc\u5199\u660e\u54c1\u7c7b\u3001\u6750\u8d28\u3001\u989c\u8272\u3001Logo \u548c\u9700\u8981\u4fdd\u7559\u7684\u7ec6\u8282\uff0c\u98ce\u683c\u8981\u6c42\u91cc\u53ea\u63cf\u8ff0\u80cc\u666f\u3001\u706f\u5149\u548c\u9648\u5217\u73af\u5883\u3002"
    },
    {
      question: "\u4e3a\u4ec0\u4e48\u5de6\u4e0a\u89d2\u4f59\u989d\u548c\u5e73\u53f0\u8d26\u5355\u4e0d\u4e00\u6837\uff1f",
      answer: "\u8f6f\u4ef6\u5185\u7684\u4f59\u989d\u662f\u672c\u5730\u8bb0\u8d26\u548c\u6210\u672c\u4f30\u7b97\uff0c\u7528\u6765\u5e2e\u4f60\u63a7\u5236\u751f\u6210\u9884\u7b97\u3002\u771f\u5b9e\u8d39\u7528\u4ee5\u5404\u6a21\u578b\u5e73\u53f0\u7684\u8d26\u5355\u4e3a\u51c6\u3002"
    },
    {
      question: "\u5386\u53f2\u8bb0\u5f55\u4e3a\u4ec0\u4e48\u770b\u4e0d\u5230\uff1f",
      answer: "\u6bcf\u4e2a\u672c\u5730\u8d26\u53f7\u7684\u5386\u53f2\u8bb0\u5f55\u662f\u5206\u5f00\u4fdd\u5b58\u7684\u3002\u8bf7\u786e\u8ba4\u5df2\u767b\u5f55\u751f\u6210\u8be5\u56fe\u7247\u65f6\u4f7f\u7528\u7684\u672c\u5730\u8d26\u53f7\u3002"
    }
  ];
  const tips = [
    "\u4e3a\u4e86\u4fdd\u6301\u4ea7\u54c1\u4e0d\u53d8\u5f62\uff0c\u4ea7\u54c1\u4fe1\u606f\u91cc\u5c3d\u91cf\u5199\u6e05\u695a\u989c\u8272\u3001\u6750\u8d28\u3001Logo\u3001\u6587\u5b57\u548c\u6bd4\u4f8b\u3002",
    "\u98ce\u683c\u8981\u6c42\u91cc\u53ea\u5199\u80cc\u666f\u3001\u706f\u5149\u3001\u6784\u56fe\u548c\u9648\u5217\u65b9\u5f0f\uff0c\u4e0d\u8981\u8981\u6c42\u6a21\u578b\u91cd\u65b0\u8bbe\u8ba1\u4ea7\u54c1\u3002",
    "\u5982\u679c\u60f3\u505a\u7535\u5546\u4e3b\u56fe\uff0c\u4f18\u5148\u7528 1:1 \u6216 4:5\uff1b\u5e97\u94fa\u6a2a\u5e45\u548c\u6d3b\u52a8\u56fe\u4f18\u5148\u7528 16:9\u3002",
    "\u751f\u6210\u540e\u5148\u653e\u5927\u68c0\u67e5 Logo\u3001\u82b1\u7eb9\u3001\u6587\u5b57\u548c\u8fb9\u7f18\uff0c\u518d\u6279\u91cf\u5bfc\u51fa\u3002"
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
                <img src={step.imageUrl} alt="" />
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
      </div>
    </div>
  );
}

function ImagePreviewDialog(props: {
  image: PreviewImage;
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
  const dragRef = useRef<{
    imageKey: string;
    pointerId: number;
    startX: number;
    startY: number;
    panX: number;
    panY: number;
  } | null>(null);
  const compareGridRef = useRef<HTMLElement | null>(null);
  const [previewItems, setPreviewItems] = useState<PreviewCompareItem[]>(() => [sourcePreviewItem]);
  const [activePreviewId, setActivePreviewId] = useState(sourcePreviewItem.id);
  const [compareLayout, setCompareLayout] = useState<PreviewCompareLayout>("adaptive");
  const [customGridSize, setCustomGridSize] = useState(5);
  const [compareModeEnabled, setCompareModeEnabled] = useState(false);
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
  const imageFilter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

  useEffect(() => {
    resetAllViews();
    setEditing(false);
    resetEdit();
    setMessage("");
    setPreviewItems([sourcePreviewItem]);
    setActivePreviewId(sourcePreviewItem.id);
    setCompareLayout("adaptive");
    setCustomGridSize(5);
    setCompareModeEnabled(false);
  }, [sourcePreviewItem.id]);

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

    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;
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
      transform: `matrix(${viewState.zoom}, 0, 0, ${viewState.zoom}, ${viewState.pan.x}, ${viewState.pan.y})`
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

  async function addComparisonImages() {
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
            <button className="secondary-button" onClick={() => void addComparisonImages()} disabled={busy}>
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
                transform: `matrix(${activeViewState.zoom}, 0, 0, ${activeViewState.zoom}, ${activeViewState.pan.x}, ${activeViewState.pan.y})`
              }}
            />
          </div>
        )}
        <footer>{message || uiText.previewInteractionHint}</footer>
      </div>
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

function isPreviewInteractiveDragTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest("button, input, textarea, select, .preview-compare-image"));
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
}) {
  return (
    <div className="history-dialog-list personal-history-list">
      {props.jobs.length === 0 ? (
        <div className="empty-results">{props.emptyText}</div>
      ) : (
        props.jobs.map((job) => (
          <button key={job.id} className="history-dialog-item" onClick={() => props.onSelect(job)}>
            <PersonalJobThumb job={job} />
            <div>
              <strong>{new Date(job.createdAt).toLocaleString()}</strong>
              <span>
                {isVideoJob(job) ? uiText.videoPage : uiText.imagePage} / {getProviderDisplayName(job.request.providerId)} /{" "}
                {getModelDisplayName(job.request.providerId, job.request.modelId)}
              </span>
              <small>
                {jobStatusLabels[job.status]} / {job.results.length} {isVideoJob(job) ? uiText.videoPage : uiText.historyResults}
                {job.errors.length ? ` / ${job.errors.length} ${uiText.errors}` : ""}
              </small>
            </div>
            <span className="history-row-actions">
              <i>
                <Check size={16} />
              </i>
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
          </button>
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
                {getModelDisplayName(job.request.providerId, job.request.modelId)}
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
  return Math.min(30, Math.max(1, Math.ceil(Number(value) || 5)));
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
