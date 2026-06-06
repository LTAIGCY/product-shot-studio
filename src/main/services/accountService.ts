import type { AuthCredentials, AuthSession, LocalAccountSummary } from "../../shared/types";
import type { BackendClient } from "./backendClient";

export class AccountService {
  constructor(private readonly backendClient: BackendClient) {}

  getSession(): AuthSession | null {
    return this.backendClient.getSession();
  }

  getRememberedSession(): Promise<AuthSession | null> {
    return this.backendClient.getRememberedSession();
  }

  listAccounts(): Promise<LocalAccountSummary[]> {
    return this.backendClient.listAccounts();
  }

  resumeRememberedSession(): Promise<AuthSession | null> {
    return this.backendClient.resumeRememberedSession();
  }

  signUp(credentials: AuthCredentials): Promise<AuthSession> {
    return this.backendClient.signUp(credentials);
  }

  login(credentials: AuthCredentials): Promise<AuthSession> {
    return this.backendClient.login(credentials);
  }

  logout(): Promise<void> {
    return this.backendClient.logout();
  }

  deleteAccount(userId: string): Promise<void> {
    return this.backendClient.deleteAccount(userId);
  }

  requireSession(): AuthSession {
    return this.backendClient.requireSession();
  }
}
