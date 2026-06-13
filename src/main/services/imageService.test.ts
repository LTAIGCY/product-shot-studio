import { describe, expect, it } from "vitest";
import { buildExportFileName } from "../../shared/exportNames";

describe("image service helpers", () => {
  it("builds stable export file names", () => {
    expect(
      buildExportFileName({
        index: 2,
        presetId: "promotion-poster",
        providerId: "studio",
        format: "jpg"
      })
    ).toBe("03-studio-promotion-poster.jpg");
  });
});
