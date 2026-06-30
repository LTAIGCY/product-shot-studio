import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { app } from "electron";
import { getExplicitBackendUrl, resolveBackendUrl } from "./backendConfig";

interface StoredBackendSecret {
  tokenSecret: string;
}

export class LocalBackendService {
  private child: ChildProcess | null = null;
  private readonly baseUrl: string;
  private readonly shouldManageLocalBackend: boolean;
  private readonly secretPath: string;
  private readonly dbPath: string;

  constructor(private readonly userDataPath: string) {
    const explicitUrl = getExplicitBackendUrl();
    this.baseUrl = resolveBackendUrl();
    this.shouldManageLocalBackend = !explicitUrl && isLoopbackUrl(this.baseUrl);
    this.secretPath = path.join(userDataPath, "local-backend-secret.json");
    this.dbPath = path.join(userDataPath, "ledger", "product-shot-studio.db");
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  getAdminUrl(): string {
    return `${this.baseUrl}/admin`;
  }

  async start(): Promise<void> {
    if (!this.shouldManageLocalBackend) return;
    if (await this.isHealthy()) return;

    const entryPath = this.findBackendEntry();
    if (!entryPath) {
      return;
    }

    await fsp.mkdir(path.dirname(this.dbPath), { recursive: true });
    const secret = await this.readOrCreateSecret();
    const backendRoot = path.dirname(path.dirname(entryPath));
    const env = {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      HOST: "127.0.0.1",
      PORT: "4317",
      DATABASE_URL: `file:${this.dbPath.replace(/\\/g, "/")}`,
      TOKEN_SECRET: process.env.PRODUCT_STUDIO_TOKEN_SECRET ?? secret.tokenSecret,
      ADMIN_PASSWORD: process.env.PRODUCT_STUDIO_ADMIN_PASSWORD ?? "admin123456"
    };

    this.child = spawn(process.execPath, [entryPath], {
      cwd: backendRoot,
      env,
      stdio: "ignore",
      windowsHide: true
    });
    this.child.on("exit", () => {
      this.child = null;
    });

    await this.waitUntilHealthy(9000);
  }

  stop(): void {
    if (!this.child) return;
    this.child.kill();
    this.child = null;
  }

  private findBackendEntry(): string | null {
    const candidates = app.isPackaged
      ? [path.join(process.resourcesPath, "backend", "dist", "index.js")]
      : [
          path.join(process.cwd(), "server", "dist", "index.js"),
          path.join(__dirname, "..", "..", "server", "dist", "index.js")
        ];
    return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
  }

  private async waitUntilHealthy(timeoutMs: number): Promise<void> {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      if (await this.isHealthy()) return;
      await delay(300);
    }
  }

  private async isHealthy(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      if (!response.ok) return false;
      const payload = (await response.json()) as { ok?: boolean };
      return payload.ok === true;
    } catch {
      return false;
    }
  }

  private async readOrCreateSecret(): Promise<StoredBackendSecret> {
    try {
      const raw = await fsp.readFile(this.secretPath, "utf8");
      const parsed = JSON.parse(raw) as StoredBackendSecret;
      if (parsed.tokenSecret) return parsed;
    } catch {
      // Create a new local token secret below.
    }
    const secret = {
      tokenSecret: randomBytes(32).toString("hex")
    };
    await fsp.mkdir(path.dirname(this.secretPath), { recursive: true });
    await fsp.writeFile(this.secretPath, JSON.stringify(secret, null, 2), "utf8");
    return secret;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isLoopbackUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";
  } catch {
    return false;
  }
}
