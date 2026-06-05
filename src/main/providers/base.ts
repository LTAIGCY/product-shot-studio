import type { ProviderAdapter } from "../../shared/types";
import { AliyunProviderAdapter, TencentProviderAdapter, VolcanoProviderAdapter } from "./china";

export function createProviderAdapters(): Record<string, ProviderAdapter> {
  const adapters: ProviderAdapter[] = [
    new AliyunProviderAdapter(),
    new VolcanoProviderAdapter(),
    new TencentProviderAdapter()
  ];

  return Object.fromEntries(adapters.map((adapter) => [adapter.id, adapter]));
}
