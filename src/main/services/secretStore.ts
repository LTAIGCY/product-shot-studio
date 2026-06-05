import fs from "node:fs/promises";
import path from "node:path";
import { safeStorage } from "electron";
import type { ProviderId, SecretStatus } from "../../shared/types";
import { providerOrder } from "../../shared/providers";

interface KeytarLike {
  getPassword(service: string, account: string): Promise<string | null>;
  setPassword(service: string, account: string, password: string): Promise<void>;
  deletePassword(service: string, account: string): Promise<boolean>;
}

interface SecretFile {
  values: Partial<Record<ProviderId, string>>;
}

const serviceName = "ProductShotStudio";

export class SecretStore {
  private keytar: KeytarLike | null = null;
  private readonly fallbackFile: string;

  constructor(userDataPath: string) {
    this.fallbackFile = path.join(userDataPath, "secrets.enc.json");
    this.keytar = this.tryLoadKeytar();
  }

  async getStatus(): Promise<SecretStatus[]> {
    return Promise.all(
      providerOrder.map(async (providerId) => ({
        providerId,
        configured: Boolean(await this.get(providerId))
      }))
    );
  }

  async get(providerId: ProviderId): Promise<string | null> {
    if (this.keytar) {
      const value = await this.keytar.getPassword(serviceName, providerId);
      if (value) return value;
    }
    const file = await this.readFallbackFile();
    return file.values[providerId] ? this.decrypt(file.values[providerId] as string) : null;
  }

  async set(providerId: ProviderId, apiKey: string): Promise<SecretStatus> {
    if (this.keytar) {
      await this.keytar.setPassword(serviceName, providerId, apiKey);
    } else {
      const file = await this.readFallbackFile();
      file.values[providerId] = this.encrypt(apiKey);
      await this.writeFallbackFile(file);
    }
    return { providerId, configured: true };
  }

  async delete(providerId: ProviderId): Promise<SecretStatus> {
    if (this.keytar) {
      await this.keytar.deletePassword(serviceName, providerId);
    }
    const file = await this.readFallbackFile();
    delete file.values[providerId];
    await this.writeFallbackFile(file);
    return { providerId, configured: false };
  }

  getStorageMode(): "keytar" | "safeStorage" {
    return this.keytar ? "keytar" : "safeStorage";
  }

  private tryLoadKeytar(): KeytarLike | null {
    try {
      const optionalRequire = eval("require") as NodeRequire;
      return optionalRequire("keytar") as KeytarLike;
    } catch {
      return null;
    }
  }

  private encrypt(value: string): string {
    if (!safeStorage.isEncryptionAvailable()) {
      return Buffer.from(value, "utf8").toString("base64");
    }
    return safeStorage.encryptString(value).toString("base64");
  }

  private decrypt(value: string): string {
    const bytes = Buffer.from(value, "base64");
    if (!safeStorage.isEncryptionAvailable()) {
      return bytes.toString("utf8");
    }
    return safeStorage.decryptString(bytes);
  }

  private async readFallbackFile(): Promise<SecretFile> {
    try {
      const raw = await fs.readFile(this.fallbackFile, "utf8");
      return JSON.parse(raw) as SecretFile;
    } catch {
      return { values: {} };
    }
  }

  private async writeFallbackFile(file: SecretFile): Promise<void> {
    await fs.mkdir(path.dirname(this.fallbackFile), { recursive: true });
    await fs.writeFile(this.fallbackFile, JSON.stringify(file, null, 2), "utf8");
  }
}
