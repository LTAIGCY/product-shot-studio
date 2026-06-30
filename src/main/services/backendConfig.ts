export const DEFAULT_BACKEND_URL = "https://api.qingpaiai.com";

interface BackendEnvironment {
  PRODUCT_STUDIO_BACKEND_URL?: string;
  PRODUCT_SHOT_BACKEND_URL?: string;
}

export function getExplicitBackendUrl(env: BackendEnvironment = process.env): string | null {
  const configuredUrl = env.PRODUCT_STUDIO_BACKEND_URL?.trim() || env.PRODUCT_SHOT_BACKEND_URL?.trim();
  return configuredUrl ? normalizeBackendUrl(configuredUrl) : null;
}

export function resolveBackendUrl(env: BackendEnvironment = process.env): string {
  return getExplicitBackendUrl(env) ?? DEFAULT_BACKEND_URL;
}

function normalizeBackendUrl(url: string): string {
  return url.replace(/\/+$/, "");
}
