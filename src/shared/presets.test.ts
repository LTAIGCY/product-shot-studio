import { describe, expect, it } from "vitest";
import { buildProductShotPrompt, productShotPresets } from "./presets";

describe("product shot presets", () => {
  it("defines the complete ecommerce output package", () => {
    expect(productShotPresets.map((preset) => preset.id)).toEqual([
      "white-main",
      "scene",
      "selling-points",
      "detail",
      "size-params",
      "function-analysis",
      "multi-angle",
      "person-usage",
      "comparison",
      "promotion-poster",
      "detail-page-long",
      "custom"
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
    expect(prompt).toContain("Keep the product as the hero subject");
  });

  it("uses the selected template prompt when the input box is empty", () => {
    const prompt = buildProductShotPrompt({
      presetId: "scene",
      fidelity: "strict",
      aspectRatio: "4:5",
      outputFormat: "webp"
    });

    expect(prompt).toContain("高质量电商场景图");
    expect(prompt).toContain("source image is authoritative");
    expect(prompt).toContain("Strictly preserve");
  });

  it("uses the input box content as the final prompt when provided", () => {
    const prompt = buildProductShotPrompt({
      presetId: "scene",
      fidelity: "strict",
      productBrief: "霜感黑色咖啡杯，适合通勤办公，画面需要暖色厨房光线",
      aspectRatio: "4:5",
      outputFormat: "webp"
    });

    expect(prompt).toContain("霜感黑色咖啡杯");
    expect(prompt).not.toContain("高质量电商场景图");
    expect(prompt).toContain("Strictly preserve");
  });

  it("does not inject a fixed template prompt for custom generation", () => {
    const prompt = buildProductShotPrompt({
      presetId: "custom",
      fidelity: "strict",
      productBrief: "自定义生成一张冷色调科技感产品图",
      aspectRatio: "4:5",
      outputFormat: "png"
    });

    expect(prompt).toContain("自定义生成一张冷色调科技感产品图");
    expect(prompt).not.toContain("白底主图");
    expect(prompt).not.toContain("促销海报图");
    expect(prompt).toContain("Aspect ratio: 4:5");
  });

  it("keeps long detail page prompts available to the provider", () => {
    const prompt = buildProductShotPrompt({
      presetId: "detail-page-long",
      fidelity: "strict",
      aspectRatio: "3:2",
      outputFormat: "png"
    });

    expect(prompt).toContain("商品详情页长图");
    expect(prompt).toContain("顶部主视觉海报");
    expect(prompt).toContain("Output format preference: png");
  });

  it("uses the updated promotion poster prompt without false discount claims", () => {
    const prompt = buildProductShotPrompt({
      presetId: "promotion-poster",
      fidelity: "strict",
      aspectRatio: "4:5",
      outputFormat: "png"
    });

    expect(prompt).toContain("高质量电商视觉海报");
    expect(prompt).toContain("不要添加虚假价格");
    expect(prompt).toContain("限时活动");
    expect(prompt).not.toContain("活动主题");
    expect(prompt).not.toContain("优惠信息");
  });
});
