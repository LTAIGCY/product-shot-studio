import { describe, expect, it } from "vitest";
import { DEFAULT_BACKEND_URL, getExplicitBackendUrl, resolveBackendUrl } from "./backendConfig";

describe("backend config", () => {
  it("uses the production backend by default", () => {
    expect(resolveBackendUrl({})).toBe(DEFAULT_BACKEND_URL);
  });

  it("allows the current environment variable to override the default", () => {
    expect(resolveBackendUrl({ PRODUCT_STUDIO_BACKEND_URL: "http://127.0.0.1:4317/" })).toBe(
      "http://127.0.0.1:4317"
    );
  });

  it("supports the legacy environment variable", () => {
    expect(getExplicitBackendUrl({ PRODUCT_SHOT_BACKEND_URL: " https://example.com/api/ " })).toBe(
      "https://example.com/api"
    );
  });

  it("prefers the current environment variable", () => {
    expect(
      resolveBackendUrl({
        PRODUCT_STUDIO_BACKEND_URL: "https://current.example.com",
        PRODUCT_SHOT_BACKEND_URL: "https://legacy.example.com"
      })
    ).toBe("https://current.example.com");
  });
});
