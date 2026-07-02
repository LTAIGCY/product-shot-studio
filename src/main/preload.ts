import { contextBridge, ipcRenderer, webUtils, type IpcRendererEvent } from "electron";
import { ipcChannels } from "../shared/ipc";
import type {
  AddPersonalGalleryItemRequest,
  AuthCredentials,
  AuthSavedCredentials,
  AuthSavedCredentialsInput,
  AuthSession,
  CanvasAddRenderToGalleryRequest,
  CanvasExportRequest,
  CanvasExportResponse,
  CanvasProject,
  CanvasProjectSummary,
  CanvasSaveRequest,
  DeleteHistoryResultRequest,
  DeleteHistoryResultResponse,
  ExportRequest,
  ExportVideosRequest,
  FeedbackSubmitReceipt,
  FeedbackSubmitRequest,
  RechargeReceipt,
  RechargeRequest,
  GenerateProgress,
  LocalAccountSummary,
  PersonalGalleryItem,
  ProductShotRequest,
  ProviderId,
  SaveEditedImageRequest,
  SaveEditedImageResponse,
  VideoGenerationRequest,
  VideoProgress,
  WalletSummary,
  WalletTransaction
} from "../shared/types";

contextBridge.exposeInMainWorld("productStudio", {
  getPaths: () => ipcRenderer.invoke(ipcChannels.appGetPaths),
  getSession: (): Promise<AuthSession | null> => ipcRenderer.invoke(ipcChannels.authGetSession),
  getRememberedSession: (): Promise<AuthSession | null> => ipcRenderer.invoke(ipcChannels.authGetRemembered),
  resumeRememberedSession: (): Promise<AuthSession | null> => ipcRenderer.invoke(ipcChannels.authResumeRemembered),
  listAccounts: (): Promise<LocalAccountSummary[]> => ipcRenderer.invoke(ipcChannels.authListAccounts),
  deleteAccount: (userId: string): Promise<void> => ipcRenderer.invoke(ipcChannels.authDeleteAccount, userId),
  getSavedAuthCredentials: (): Promise<AuthSavedCredentials | null> =>
    ipcRenderer.invoke(ipcChannels.authGetSavedCredentials),
  saveAuthCredentials: (input: AuthSavedCredentialsInput): Promise<void> =>
    ipcRenderer.invoke(ipcChannels.authSaveSavedCredentials, input),
  clearSavedAuthCredentials: (): Promise<void> => ipcRenderer.invoke(ipcChannels.authClearSavedCredentials),
  signUp: (credentials: AuthCredentials): Promise<AuthSession> =>
    ipcRenderer.invoke(ipcChannels.authSignUp, credentials),
  login: (credentials: AuthCredentials): Promise<AuthSession> =>
    ipcRenderer.invoke(ipcChannels.authLogin, credentials),
  logout: (): Promise<void> => ipcRenderer.invoke(ipcChannels.authLogout),
  submitFeedback: (request: FeedbackSubmitRequest): Promise<FeedbackSubmitReceipt> =>
    ipcRenderer.invoke(ipcChannels.feedbackSubmit, request),
  getWallet: (): Promise<WalletSummary> => ipcRenderer.invoke(ipcChannels.billingGetWallet),
  recharge: (request: RechargeRequest): Promise<RechargeReceipt> =>
    ipcRenderer.invoke(ipcChannels.billingRecharge, request),
  listWalletTransactions: (limit?: number): Promise<WalletTransaction[]> =>
    ipcRenderer.invoke(ipcChannels.billingListTransactions, limit),
  getKeyStatus: () => ipcRenderer.invoke(ipcChannels.keysGetStatus),
  saveKey: (providerId: ProviderId, apiKey: string) => ipcRenderer.invoke(ipcChannels.keysSave, providerId, apiKey),
  deleteKey: (providerId: ProviderId) => ipcRenderer.invoke(ipcChannels.keysDelete, providerId),
  validateKey: (providerId: ProviderId) => ipcRenderer.invoke(ipcChannels.keysValidate, providerId),
  selectImage: () => ipcRenderer.invoke(ipcChannels.imageSelect),
  selectImages: () => ipcRenderer.invoke(ipcChannels.imageSelectMany),
  importImage: (filePath: string) => ipcRenderer.invoke(ipcChannels.imageImport, filePath),
  getFilePath: (file: File) => webUtils.getPathForFile(file),
  generateProductShots: (request: ProductShotRequest) => ipcRenderer.invoke(ipcChannels.productGenerate, request),
  cancelProductJob: (jobId: string) => ipcRenderer.invoke(ipcChannels.productCancel, jobId),
  generateProductVideo: (request: VideoGenerationRequest) => ipcRenderer.invoke(ipcChannels.videoGenerate, request),
  cancelVideoJob: (jobId: string) => ipcRenderer.invoke(ipcChannels.videoCancel, jobId),
  listHistory: () => ipcRenderer.invoke(ipcChannels.historyList),
  listTrashedHistory: () => ipcRenderer.invoke(ipcChannels.historyListTrash),
  trashHistoryJob: (jobId: string): Promise<void> => ipcRenderer.invoke(ipcChannels.historyTrash, jobId),
  restoreHistoryJob: (jobId: string): Promise<void> => ipcRenderer.invoke(ipcChannels.historyRestore, jobId),
  deleteHistoryJobForever: (jobId: string): Promise<void> =>
    ipcRenderer.invoke(ipcChannels.historyDeleteForever, jobId),
  deleteHistoryResult: (request: DeleteHistoryResultRequest): Promise<DeleteHistoryResultResponse> =>
    ipcRenderer.invoke(ipcChannels.historyDeleteResult, request),
  listGalleryItems: (): Promise<PersonalGalleryItem[]> => ipcRenderer.invoke(ipcChannels.galleryList),
  addGalleryItem: (request: AddPersonalGalleryItemRequest): Promise<PersonalGalleryItem> =>
    ipcRenderer.invoke(ipcChannels.galleryAdd, request),
  removeGalleryItem: (itemId: string): Promise<void> => ipcRenderer.invoke(ipcChannels.galleryRemove, itemId),
  reorderGalleryItems: (itemIds: string[]): Promise<PersonalGalleryItem[]> =>
    ipcRenderer.invoke(ipcChannels.galleryReorder, itemIds),
  listCanvasProjects: (): Promise<CanvasProjectSummary[]> => ipcRenderer.invoke(ipcChannels.canvasListProjects),
  getCanvasProject: (projectId: string): Promise<CanvasProject | null> =>
    ipcRenderer.invoke(ipcChannels.canvasGetProject, projectId),
  saveCanvasProject: (request: CanvasSaveRequest): Promise<CanvasProject> =>
    ipcRenderer.invoke(ipcChannels.canvasSaveProject, request),
  deleteCanvasProject: (projectId: string): Promise<void> =>
    ipcRenderer.invoke(ipcChannels.canvasDeleteProject, projectId),
  duplicateCanvasProject: (projectId: string): Promise<CanvasProject> =>
    ipcRenderer.invoke(ipcChannels.canvasDuplicateProject, projectId),
  exportCanvasImage: (request: CanvasExportRequest): Promise<CanvasExportResponse> =>
    ipcRenderer.invoke(ipcChannels.canvasExportImage, request),
  addCanvasRenderToGallery: (request: CanvasAddRenderToGalleryRequest): Promise<PersonalGalleryItem> =>
    ipcRenderer.invoke(ipcChannels.canvasAddRenderToGallery, request),
  selectExportFolder: (): Promise<string> => ipcRenderer.invoke(ipcChannels.exportSelectDir),
  exportImages: (request: ExportRequest) => ipcRenderer.invoke(ipcChannels.exportImages, request),
  exportVideos: (request: ExportVideosRequest) => ipcRenderer.invoke(ipcChannels.exportVideos, request),
  saveEditedImage: (request: SaveEditedImageRequest): Promise<SaveEditedImageResponse> =>
    ipcRenderer.invoke(ipcChannels.exportSaveEditedImage, request),
  toFileUrl: (filePath: string) => `product-shot-media://file/${encodeURIComponent(filePath)}`,
  onOpenSettings: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on(ipcChannels.menuOpenSettings, listener);
    return () => ipcRenderer.off(ipcChannels.menuOpenSettings, listener);
  },
  onGenerationProgress: (callback: (progress: GenerateProgress) => void) => {
    const listener = (_event: IpcRendererEvent, progress: GenerateProgress) => callback(progress);
    ipcRenderer.on(ipcChannels.productProgress, listener);
    return () => ipcRenderer.off(ipcChannels.productProgress, listener);
  },
  onVideoProgress: (callback: (progress: VideoProgress) => void) => {
    const listener = (_event: IpcRendererEvent, progress: VideoProgress) => callback(progress);
    ipcRenderer.on(ipcChannels.videoProgress, listener);
    return () => ipcRenderer.off(ipcChannels.videoProgress, listener);
  }
});
