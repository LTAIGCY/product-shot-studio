import path from "node:path";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { app, BrowserWindow, dialog, ipcMain, Menu, net, protocol, shell } from "electron";
import { ipcChannels } from "../shared/ipc";
import type {
  AddPersonalGalleryItemRequest,
  AuthSavedCredentialsInput,
  CanvasAddRenderToGalleryRequest,
  CanvasExportRequest,
  CanvasSaveRequest,
  DeleteHistoryResultRequest,
  ExportRequest,
  ExportVideosRequest,
  ProductShotRequest,
  ProviderId,
  SaveEditedImageRequest,
  VideoGenerationRequest
} from "../shared/types";
import { createProviderAdapters } from "./providers/base";
import { normalizeProviderError } from "./providers/util";
import { SecretStore } from "./services/secretStore";
import { AppDatabase } from "./services/database";
import { ImageService } from "./services/imageService";
import { ExportService } from "./services/exportService";
import { CanvasAssetService } from "./services/canvasAssetService";
import { ProductShotService } from "./services/productShotService";
import { VideoGenerationService } from "./services/videoGenerationService";
import { AccountService } from "./services/accountService";
import { BillingService } from "./services/billingService";
import { BackendClient } from "./services/backendClient";
import { LocalBackendService } from "./services/localBackendService";
import { AuthCredentialStore } from "./services/authCredentialStore";

let mainWindow: BrowserWindow | null = null;
let secretStore: SecretStore;
let database: AppDatabase;
let imageService: ImageService;
let exportService: ExportService;
let canvasAssetService: CanvasAssetService;
let productShotService: ProductShotService;
let videoGenerationService: VideoGenerationService;
let accountService: AccountService;
let authCredentialStore: AuthCredentialStore;
let billingService: BillingService;
let backendClient: BackendClient;
let localBackendService: LocalBackendService;
let presenceHeartbeatTimer: NodeJS.Timeout | null = null;
const adapters = createProviderAdapters();
const localMediaScheme = "product-shot-media";

protocol.registerSchemesAsPrivileged([
  {
    scheme: localMediaScheme,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true
    }
  }
]);

async function bootstrap(): Promise<void> {
  const userDataPath = app.getPath("userData");
  registerLocalMediaProtocol(userDataPath);
  secretStore = new SecretStore(userDataPath);
  database = new AppDatabase(userDataPath);
  await database.init();
  localBackendService = new LocalBackendService(userDataPath);
  await localBackendService.start();
  backendClient = new BackendClient(userDataPath, localBackendService.getBaseUrl(), (input, init) =>
    net.fetch(input, init)
  );
  accountService = new AccountService(backendClient);
  authCredentialStore = new AuthCredentialStore(userDataPath);
  billingService = new BillingService(backendClient);
  imageService = new ImageService(userDataPath);
  exportService = new ExportService();
  canvasAssetService = new CanvasAssetService(userDataPath);
  productShotService = new ProductShotService(userDataPath, secretStore, database, adapters);
  videoGenerationService = new VideoGenerationService(userDataPath, secretStore, database, adapters);

  registerIpc();
  installAppMenu();
  createWindow();
}

function registerLocalMediaProtocol(userDataPath: string): void {
  const mediaRoot = path.resolve(userDataPath);

  protocol.handle(localMediaScheme, (request) => {
    try {
      const requestUrl = new URL(request.url);
      if (requestUrl.hostname !== "file") {
        return new Response("Not found", { status: 404 });
      }

      const filePath = path.resolve(decodeURIComponent(requestUrl.pathname.slice(1)));
      const relativePath = path.relative(mediaRoot, filePath);
      const isInsideMediaRoot =
        relativePath.length === 0 || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));

      if (!isInsideMediaRoot) {
        return new Response("Forbidden", { status: 403 });
      }

      return net.fetch(pathToFileURL(filePath).toString());
    } catch {
      return new Response("Invalid media path", { status: 400 });
    }
  });
}

function createWindow(): void {
  const appIconPath = app.isPackaged
    ? path.join(process.resourcesPath, "app-icon.png")
    : path.join(app.getAppPath(), "build", "app-icon.png");
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1120,
    minHeight: 720,
    title: "Product Shot Studio",
    icon: appIconPath,
    autoHideMenuBar: true,
    backgroundColor: "#f5f3ef",
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#f8f3eb",
      symbolColor: "#574b40",
      height: 38
    },
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  mainWindow.setMenuBarVisibility(false);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

function installAppMenu(): void {
  Menu.setApplicationMenu(null);
}

function registerIpc(): void {
  ipcMain.handle(ipcChannels.appGetPaths, () => ({
    userDataPath: app.getPath("userData"),
    outputsPath: path.join(app.getPath("userData"), "generated-images"),
    defaultExportPath: path.join(app.getPath("documents"), "Product Shot Studio Exports"),
    backendUrl: localBackendService.getBaseUrl(),
    adminUrl: localBackendService.getAdminUrl()
  }));

  ipcMain.handle(ipcChannels.authGetSession, () => accountService.getSession());
  ipcMain.handle(ipcChannels.authGetRemembered, () => accountService.getRememberedSession());
  ipcMain.handle(ipcChannels.authResumeRemembered, async () => {
    const session = await accountService.resumeRememberedSession();
    if (session) startPresenceHeartbeat();
    return session;
  });
  ipcMain.handle(ipcChannels.authListAccounts, () => accountService.listAccounts());
  ipcMain.handle(ipcChannels.authDeleteAccount, (_event, userId: string) => accountService.deleteAccount(userId));
  ipcMain.handle(ipcChannels.authGetSavedCredentials, () => authCredentialStore.get());
  ipcMain.handle(ipcChannels.authSaveSavedCredentials, (_event, input: AuthSavedCredentialsInput) =>
    authCredentialStore.save(input)
  );
  ipcMain.handle(ipcChannels.authClearSavedCredentials, () => authCredentialStore.clear());
  ipcMain.handle(ipcChannels.authSignUp, async (_event, credentials) => {
    const session = await accountService.signUp(credentials);
    startPresenceHeartbeat();
    return session;
  });
  ipcMain.handle(ipcChannels.authLogin, async (_event, credentials) => {
    const session = await accountService.login(credentials);
    startPresenceHeartbeat();
    return session;
  });
  ipcMain.handle(ipcChannels.authLogout, async () => {
    await accountService.logout();
    stopPresenceHeartbeat();
  });
  ipcMain.handle(ipcChannels.billingGetWallet, () => billingService.getWalletSummary());
  ipcMain.handle(ipcChannels.billingRecharge, (_event, request) => billingService.recharge(request));
  ipcMain.handle(ipcChannels.billingListTransactions, (_event, limit?: number) =>
    billingService.listWalletTransactions(limit)
  );

  ipcMain.handle(ipcChannels.keysGetStatus, () => secretStore.getStatus());

  ipcMain.handle(ipcChannels.keysSave, async (_event, providerId: ProviderId, apiKey: string) => {
    if (!apiKey?.trim()) {
      throw new Error("API key is required.");
    }
    return secretStore.set(providerId, apiKey.trim());
  });

  ipcMain.handle(ipcChannels.keysDelete, (_event, providerId: ProviderId) => secretStore.delete(providerId));

  ipcMain.handle(ipcChannels.keysValidate, async (_event, providerId: ProviderId) => {
    const apiKey = await secretStore.get(providerId);
    if (!apiKey) return false;
    const adapter = adapters[providerId];
    if (!adapter) return false;
    try {
      return await adapter.validateKey(apiKey);
    } catch {
      return false;
    }
  });

  ipcMain.handle(ipcChannels.imageImport, (_event, filePath: string) => imageService.importImage(filePath));

  ipcMain.handle(ipcChannels.imageSelect, async () => {
    const result = await dialog.showOpenDialog({
      title: "Select a product image",
      properties: ["openFile"],
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }]
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return imageService.importImage(result.filePaths[0]);
  });

  ipcMain.handle(ipcChannels.imageSelectMany, async () => {
    const result = await dialog.showOpenDialog({
      title: "Select product images",
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }]
    });
    if (result.canceled || result.filePaths.length === 0) {
      return [];
    }
    return Promise.all(result.filePaths.map((filePath) => imageService.importImage(filePath)));
  });

  ipcMain.handle(ipcChannels.productGenerate, async (event, request: ProductShotRequest) => {
    const session = accountService.requireSession();
    let reservationId: string | null = null;
    try {
      const reservation = await billingService.reserveProductRequest(request);
      reservationId = reservation.reservationId;
      const job = await productShotService.generate(request, (progress) => {
        event.sender.send(ipcChannels.productProgress, progress);
      }, session.userId);
      await billingService.commitProductUsage(reservation.reservationId, job);
      return job;
    } catch (error) {
      if (reservationId) {
        await billingService.cancelUsage(reservationId, getErrorMessage(error)).catch(() => undefined);
      }
      throw new Error(
        normalizeProviderError({
          providerId: request.providerId,
          error
        }).message
      );
    }
  });

  ipcMain.handle(ipcChannels.productCancel, (_event, jobId: string) => {
    const session = accountService.requireSession();
    return productShotService.cancel(jobId, session.userId);
  });

  ipcMain.handle(ipcChannels.videoGenerate, async (event, request: VideoGenerationRequest) => {
    const session = accountService.requireSession();
    let reservationId: string | null = null;
    try {
      const reservation = await billingService.reserveVideoRequest(request);
      reservationId = reservation.reservationId;
      const job = await videoGenerationService.generate(request, (progress) => {
        event.sender.send(ipcChannels.videoProgress, progress);
      }, session.userId);
      await billingService.commitVideoUsage(reservation.reservationId, job);
      return job;
    } catch (error) {
      if (reservationId) {
        await billingService.cancelUsage(reservationId, getErrorMessage(error)).catch(() => undefined);
      }
      throw new Error(
        normalizeProviderError({
          providerId: request.providerId,
          error
        }).message
      );
    }
  });

  ipcMain.handle(ipcChannels.videoCancel, (_event, jobId: string) => {
    const session = accountService.requireSession();
    return videoGenerationService.cancel(jobId, session.userId);
  });

  ipcMain.handle(ipcChannels.historyList, async () => {
    const session = accountService.requireSession();
    await database.claimUnownedJobs(session.userId);
    return database.listJobs(session.userId);
  });
  ipcMain.handle(ipcChannels.historyListTrash, async () => {
    const session = accountService.requireSession();
    await database.claimUnownedJobs(session.userId);
    return database.listTrashedJobs(session.userId);
  });
  ipcMain.handle(ipcChannels.historyTrash, (_event, jobId: string) => {
    const session = accountService.requireSession();
    return database.trashJob(jobId, session.userId);
  });
  ipcMain.handle(ipcChannels.historyRestore, (_event, jobId: string) => {
    const session = accountService.requireSession();
    return database.restoreJob(jobId, session.userId);
  });
  ipcMain.handle(ipcChannels.historyDeleteForever, (_event, jobId: string) => {
    const session = accountService.requireSession();
    return database.deleteJobForever(jobId, session.userId);
  });
  ipcMain.handle(ipcChannels.historyDeleteResult, (_event, request: DeleteHistoryResultRequest) => {
    const session = accountService.requireSession();
    return database.deleteJobResult(session.userId, request);
  });
  ipcMain.handle(ipcChannels.galleryList, () => {
    const session = accountService.requireSession();
    return database.listGalleryItems(session.userId);
  });
  ipcMain.handle(ipcChannels.galleryAdd, (_event, request: AddPersonalGalleryItemRequest) => {
    const session = accountService.requireSession();
    return database.addGalleryItem(session.userId, request);
  });
  ipcMain.handle(ipcChannels.galleryRemove, (_event, itemId: string) => {
    const session = accountService.requireSession();
    return database.removeGalleryItem(session.userId, itemId);
  });
  ipcMain.handle(ipcChannels.galleryReorder, (_event, itemIds: string[]) => {
    const session = accountService.requireSession();
    return database.reorderGalleryItems(session.userId, itemIds);
  });
  ipcMain.handle(ipcChannels.canvasListProjects, () => {
    const session = accountService.requireSession();
    return database.listCanvasProjects(session.userId);
  });
  ipcMain.handle(ipcChannels.canvasGetProject, (_event, projectId: string) => {
    const session = accountService.requireSession();
    return database.getCanvasProject(session.userId, projectId);
  });
  ipcMain.handle(ipcChannels.canvasSaveProject, async (_event, request: CanvasSaveRequest) => {
    const session = accountService.requireSession();
    const projectId = request.id || randomUUID();
    const thumbnailPath = await canvasAssetService.saveThumbnail(projectId, request.thumbnailDataUrl);
    return database.saveCanvasProject(session.userId, { ...request, id: projectId }, thumbnailPath);
  });
  ipcMain.handle(ipcChannels.canvasDeleteProject, (_event, projectId: string) => {
    const session = accountService.requireSession();
    return database.deleteCanvasProject(session.userId, projectId);
  });
  ipcMain.handle(ipcChannels.canvasDuplicateProject, (_event, projectId: string) => {
    const session = accountService.requireSession();
    return database.duplicateCanvasProject(session.userId, projectId);
  });
  ipcMain.handle(ipcChannels.canvasExportImage, (_event, request: CanvasExportRequest) =>
    canvasAssetService.exportImage(request)
  );
  ipcMain.handle(ipcChannels.canvasAddRenderToGallery, async (_event, request: CanvasAddRenderToGalleryRequest) => {
    const session = accountService.requireSession();
    const imagePath = await canvasAssetService.saveRenderForGallery(request.title, request.dataUrl, request.format);
    return database.addGalleryItem(session.userId, {
      imagePath,
      mediaType: "image",
      title: request.title.trim() || "自由画布作品"
    });
  });
  ipcMain.handle(ipcChannels.exportSelectDir, async () => {
    const result = await dialog.showOpenDialog({
      title: "\u9009\u62e9\u9ed8\u8ba4\u5bfc\u51fa\u6587\u4ef6\u5939",
      properties: ["openDirectory", "createDirectory"]
    });
    if (result.canceled || result.filePaths.length === 0) {
      return "";
    }
    return result.filePaths[0];
  });
  ipcMain.handle(ipcChannels.exportImages, (_event, request: ExportRequest) => exportService.exportImages(request));
  ipcMain.handle(ipcChannels.exportVideos, (_event, request: ExportVideosRequest) => exportService.exportVideos(request));
  ipcMain.handle(ipcChannels.exportSaveEditedImage, (_event, request: SaveEditedImageRequest) =>
    exportService.saveEditedImage(request)
  );
}

function startPresenceHeartbeat(): void {
  stopPresenceHeartbeat();
  void backendClient.heartbeat().catch(() => undefined);
  presenceHeartbeatTimer = setInterval(() => {
    void backendClient.heartbeat().catch(() => undefined);
  }, 30_000);
}

function stopPresenceHeartbeat(): void {
  if (!presenceHeartbeatTimer) return;
  clearInterval(presenceHeartbeatTimer);
  presenceHeartbeatTimer = null;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  stopPresenceHeartbeat();
  void backendClient?.markOffline().catch(() => undefined);
  localBackendService?.stop();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
  });

  void app.whenReady().then(() => {
    app.setAppUserModelId("com.productshotstudio.app");
    return bootstrap();
  });
}
