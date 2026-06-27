/// <reference types="vite/client" />

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
  ExportResponse,
  ExportVideosRequest,
  GenerateProgress,
  ImportedImage,
  LocalAccountSummary,
  PersonalGalleryItem,
  ProductShotJob,
  ProductShotRequest,
  ProviderId,
  RechargeReceipt,
  RechargeRequest,
  SaveEditedImageRequest,
  SaveEditedImageResponse,
  SecretStatus,
  StudioJob,
  VideoGenerationJob,
  VideoGenerationRequest,
  VideoProgress,
  WalletSummary,
  WalletTransaction
} from "./shared/types";

declare global {
  interface Window {
    productStudio: {
      getPaths(): Promise<{
        userDataPath: string;
        outputsPath: string;
        defaultExportPath: string;
        backendUrl?: string;
        adminUrl?: string;
      }>;
      getSession(): Promise<AuthSession | null>;
      getRememberedSession(): Promise<AuthSession | null>;
      resumeRememberedSession(): Promise<AuthSession | null>;
      listAccounts(): Promise<LocalAccountSummary[]>;
      deleteAccount(userId: string): Promise<void>;
      getSavedAuthCredentials(): Promise<AuthSavedCredentials | null>;
      saveAuthCredentials(input: AuthSavedCredentialsInput): Promise<void>;
      clearSavedAuthCredentials(): Promise<void>;
      signUp(credentials: AuthCredentials): Promise<AuthSession>;
      login(credentials: AuthCredentials): Promise<AuthSession>;
      logout(): Promise<void>;
      getWallet(): Promise<WalletSummary>;
      recharge(request: RechargeRequest): Promise<RechargeReceipt>;
      listWalletTransactions(limit?: number): Promise<WalletTransaction[]>;
      getKeyStatus(): Promise<SecretStatus[]>;
      saveKey(providerId: ProviderId, apiKey: string): Promise<SecretStatus>;
      deleteKey(providerId: ProviderId): Promise<SecretStatus>;
      validateKey(providerId: ProviderId): Promise<boolean>;
      selectImage(): Promise<ImportedImage | null>;
      selectImages(): Promise<ImportedImage[]>;
      importImage(filePath: string): Promise<ImportedImage>;
      getFilePath(file: File): string;
      generateProductShots(request: ProductShotRequest): Promise<ProductShotJob>;
      cancelProductJob(jobId: string): Promise<void>;
      generateProductVideo(request: VideoGenerationRequest): Promise<VideoGenerationJob>;
      cancelVideoJob(jobId: string): Promise<void>;
      listHistory(): Promise<StudioJob[]>;
      listTrashedHistory(): Promise<StudioJob[]>;
      trashHistoryJob(jobId: string): Promise<void>;
      restoreHistoryJob(jobId: string): Promise<void>;
      deleteHistoryJobForever(jobId: string): Promise<void>;
      deleteHistoryResult(request: DeleteHistoryResultRequest): Promise<DeleteHistoryResultResponse>;
      listGalleryItems(): Promise<PersonalGalleryItem[]>;
      addGalleryItem(request: AddPersonalGalleryItemRequest): Promise<PersonalGalleryItem>;
      removeGalleryItem(itemId: string): Promise<void>;
      reorderGalleryItems(itemIds: string[]): Promise<PersonalGalleryItem[]>;
      listCanvasProjects(): Promise<CanvasProjectSummary[]>;
      getCanvasProject(projectId: string): Promise<CanvasProject | null>;
      saveCanvasProject(request: CanvasSaveRequest): Promise<CanvasProject>;
      deleteCanvasProject(projectId: string): Promise<void>;
      duplicateCanvasProject(projectId: string): Promise<CanvasProject>;
      exportCanvasImage(request: CanvasExportRequest): Promise<CanvasExportResponse>;
      addCanvasRenderToGallery(request: CanvasAddRenderToGalleryRequest): Promise<PersonalGalleryItem>;
      selectExportFolder(): Promise<string>;
      exportImages(request: ExportRequest): Promise<ExportResponse>;
      exportVideos(request: ExportVideosRequest): Promise<ExportResponse>;
      saveEditedImage(request: SaveEditedImageRequest): Promise<SaveEditedImageResponse>;
      toFileUrl(filePath: string): string;
      onOpenSettings(callback: () => void): () => void;
      onGenerationProgress(callback: (progress: GenerateProgress) => void): () => void;
      onVideoProgress(callback: (progress: VideoProgress) => void): () => void;
    };
  }
}

export {};
