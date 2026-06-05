import { describe, expect, it } from "vitest";
import { buildProductShotPrompt, productShotPresets } from "./presets";

describe("product shot presets", () => {
  it("defines the complete ecommerce output package", () => {
    expect(productShotPresets.map((preset) => preset.id)).toEqual([
      "white-main",
      "lifestyle-scene",
      "texture-detail",
      "marketing-banner",
      "product-poster"
    ]);
  });

  it("builds strict prompts that preserve product identity", () => {
    const prompt = buildProductShotPrompt({
      presetId: "white-main",
      fidelity: "strict",
      aspectRatio: "1:1",
      outputFormat: "png"
    });

    expect(prompt).toContain("Strictly preserve");
    expect(prompt).toContain("logo placement");
    expect(prompt).toContain("Do not redesign");
    expect(prompt).toContain("Only change the background");
  });

  it("adds seller product context and style direction without weakening source fidelity", () => {
    const prompt = buildProductShotPrompt({
      presetId: "lifestyle-scene",
      fidelity: "strict",
      productBrief: "matte black coffee tumbler for office commuters",
      styleGuide: "warm kitchen light with premium minimalist props",
      aspectRatio: "4:5",
      outputFormat: "webp"
    });

    expect(prompt).toContain("matte black coffee tumbler");
    expect(prompt).toContain("warm kitchen light");
    expect(prompt).toContain("source image is authoritative");
    expect(prompt).toContain("Strictly preserve");
  });

  it("builds product poster prompts with seller-provided feature and ingredient copy", () => {
    const prompt = buildProductShotPrompt({
      presetId: "product-poster",
      fidelity: "strict",
      productBrief: "children's plush teddy bear gift set",
      posterCopy: "soft touch fabric, removable clothing, suitable for bedroom decoration, comfort companion",
      aspectRatio: "4:5",
      outputFormat: "png"
    });

    expect(prompt).toContain("product information poster");
    expect(prompt).toContain("soft touch fabric");
    expect(prompt).toContain("ingredients, medical effects, certifications");
    expect(prompt).toContain("Poster text must be large");
  });
});
