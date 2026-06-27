import fs from "node:fs/promises";
import path from "node:path";
import { safeStorage } from "electron";
import type { AuthSavedCredentials, AuthSavedCredentialsInput } from "../../shared/types";

interface KeytarLike {
  getPassword(service: string, account: string): Promise<string | null>;
  setPassword(service: string, account: string, password: string): Promise<void>;
  deletePassword(service: string, account: string): Promise<boolean>;
}

interface CredentialFile {
  value?: string;
}

const serviceName = "ProductShotStudio";
const accountName = "auth.savedCredentials";

export class AuthCredentialStore {
  private keytar: KeytarLike | null = null;
  private readonly fallbackFile: string;

  constructor(userDataPath: string) {
    this.fallbackFile = path.join(userDataPath, "auth-credentials.enc.json");
    this.keytar = this.tryLoadKeytar();
  }

  async get(): Promise<AuthSavedCredentials | null> {
    const encoded = this.keytar
      ? await this.keytar.getPassword(serviceName, accountName)
      : (await this.readFallbackFile()).value;
    if (!encoded) return null;

    try {
      const parsed = JSON.parse(this.decrypt(encoded)) as AuthSavedCredentials;
      const username = typeof parsed.username === "string" ? parsed.username.trim() : "";
      if (!username) return null;
      const password = typeof parsed.password === "string" ? parsed.password : undefined;
      return {
        username,
        password: parsed.rememberPassword ? password : undefined,
        rememberPassword: Boolean(parsed.rememberPassword && password)
      };
    } catch {
      return null;
    }
  }

  async save(input: AuthSavedCredentialsInput): Promise<void> {
    const username = input.username.trim();
    if (!username) {
      await this.clear();
      return;
    }

    const next: AuthSavedCredentials = {
      username,
      rememberPassword: Boolean(input.rememberPassword && input.password)
    };
    if (next.rememberPassword) {
      next.password = input.password;
    }

    const encoded = this.encrypt(JSON.stringify(next));
    if (this.keytar) {
      await this.keytar.setPassword(serviceName, accountName, encoded);
      return;
    }
    await this.writeFallbackFile({ value: encoded });
  }

  async clear(): Promise<void> {
    if (this.keytar) {
      await this.keytar.deletePassword(serviceName, accountName);
    }
    await fs.rm(this.fallbackFile, { force: true });
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

  private async readFallbackFile(): Promise<CredentialFile> {
    try {
      const raw = await fs.readFile(this.fallbackFile, "utf8");
      return JSON.parse(raw) as CredentialFile;
    } catch {
      return {};
    }
  }

  private async writeFallbackFile(file: CredentialFile): Promise<void> {
    await fs.mkdir(path.dirname(this.fallbackFile), { recursive: true });
    await fs.writeFile(this.fallbackFile, JSON.stringify(file, null, 2), "utf8");
  }
}
