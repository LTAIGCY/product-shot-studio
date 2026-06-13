import { describe, expect, it } from "vitest";
import { normalizeProviderError, redactSecrets } from "./util";

describe("provider utilities", () => {
  it("redacts common API key forms", () => {
    const text = redactSecrets("Bearer sk-testSecret123456789 and key=AIzaSecret123456789");
    expect(text).not.toContain("sk-testSecret123456789");
    expect(text).not.toContain("AIzaSecret123456789");
    expect(text).toContain("[redacted]");
  });

  it("normalizes retryable provider errors", () => {
    const error = normalizeProviderError({
      providerId: "aliyun",
      presetId: "white-main",
      error: new Error("HTTP 429 rate limit for sk-testSecret123456789")
    });

    expect(error.retryable).toBe(true);
    expect(error.message).not.toContain("sk-testSecret123456789");
    expect(error.code).toBe("provider_error");
  });

  it("explains inactive Volcano model errors in Chinese", () => {
    const error = normalizeProviderError({
      providerId: "volcano",
      presetId: "white-main",
      error: new Error(
        "Your account %!s(int64=2128552149) has not activated the model doubao-seedream-4-0-250828. Please activate the model service in the Ark Console. Request id: 021780550670603c2dd50d19df53a1cf97de1fb7620a49aa82978"
      )
    });

    expect(error.code).toBe("model_not_enabled");
    expect(error.retryable).toBe(false);
    expect(error.message).toContain("\u706b\u5c71\u65b9\u821f\u8d26\u53f7\u5c1a\u672a\u5f00\u901a\u6a21\u578b doubao-seedream-4-0-250828");
    expect(error.message).toContain("\u63a5\u5165\u70b9 ID");
    expect(error.message).toContain("\u8bf7\u6c42 ID");
  });

  it("explains invalid Volcano Seedream size errors in Chinese", () => {
    const error = normalizeProviderError({
      providerId: "volcano",
      presetId: "white-main",
      error: new Error(
        "The parameter `size` specified in the request is not valid: image size must be at least 3686400 pixels. Request id: 021780560653933a58640f8f093e136cbe2236822f07c73bd509b"
      )
    });

    expect(error.code).toBe("invalid_size");
    expect(error.retryable).toBe(false);
    expect(error.message).toContain("Seedream 4.0/5.0");
    expect(error.message).toContain("2K");
    expect(error.message).toContain("\u8bf7\u6c42 ID");
  });

  it("explains Volcano quota and safe experience limit errors in Chinese", () => {
    const error = normalizeProviderError({
      providerId: "volcano",
      presetId: "promotion-poster",
      error: new Error(
        'Your account [2128552149] has reached the set inference limit for the [doubao-seedream-5-0] model, and the model service has been paused. To continue using this model, please visit the Model Activation page to adjust or close the "Safe Experience Mode". Request id: 021780578350584b06035fa747e8bc1f8854558f6030841ed3216'
      )
    });

    expect(error.code).toBe("quota_or_limit_reached");
    expect(error.retryable).toBe(false);
    expect(error.message).toContain("\u63a8\u7406\u9650\u989d");
    expect(error.message).toContain("API \u989d\u5ea6");
    expect(error.message).toContain("Safe Experience Mode");
    expect(error.message).toContain("\u8bf7\u6c42 ID");
  });
});
