import path from "node:path";
import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from "electron";
import { ipcChannels } from "../shared/ipc";
import type {
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
import { ProductShotService } from "./services/productShotService";
import { VideoGenerationService } from "./services/videoGenerationService";
import { AccountService } from "./services/accountService";
import { BillingService } from "./services/billingService";
import { BackendClient } from "./services/backendClient";

let mainWindow: BrowserWindow | null = null;
let secretStore: SecretStore;
let database: AppDatabase;
let imageService: ImageService;
let exportService: ExportService;
let productShotService: ProductShotService;
let videoGenerationService: VideoGenerationService;
let accountService: AccountService;
let billingService: BillingService;
let backendClient: BackendClient;
const adapters = createProviderAdapters();

async function bootstrap(): Promise<void> {
  const userDataPath = app.getPath("userData");
  secretStore = new SecretStore(userDataPath);
  database = new AppDatabase(userDataPath);
  await database.init();
  backendClient = new BackendClient(userDataPath);
  accountService = new AccountService(backendClient);
  billingService = new BillingService(backendClient);
  imageService = new ImageService(userDataPath);
  exportService = new ExportService();
  productShotService = new ProductShotService(userDataPath, secretStore, database, adapters);
  videoGenerationService = new VideoGenerationService(userDataPath, secretStore, database, adapters);

  registerIpc();
  installAppMenu();
  createWindow();
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1120,
    minHeight: 720,
    title: "Product Shot Studio",
    autoHideMenuBar: true,
    backgroundColor: "#f5f3ef",
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
    defaultExportPath: path.join(app.getPath("documents"), "Product Shot Studio Exports")
  }));

  ipcMain.handle(ipcChannels.authGetSession, () => accountService.getSession());
  ipcMain.handle(ipcChannels.authGetRemembered, () => accountService.getRememberedSession());
  ipcMain.handle(ipcChannels.authResumeRemembered, () => accountService.resumeRememberedSession());
  ipcMain.handle(ipcChannels.authListAccounts, () => accountService.listAccounts());
  ipcMain.handle(ipcChannels.authDeleteAccount, (_event, userId: string) => accountService.deleteAccount(userId));
  ipcMain.handle(ipcChannels.authSignUp, (_event, credentials) => accountService.signUp(credentials));
  ipcMain.handle(ipcChannels.authLogin, (_event, credentials) => accountService.login(credentials));
  ipcMain.handle(ipcChannels.authLogout, () => accountService.logout());
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

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
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
    mainWindow.focus();
  });

  void app.whenReady().then(bootstrap);
}
