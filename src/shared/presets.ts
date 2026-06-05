import type { AspectRatio, FidelityMode, ImageQuality, PresetId } from "./types";

export interface ProductShotPreset {
  id: PresetId;
  name: string;
  shortName: string;
  description: string;
  defaultAspectRatio: AspectRatio;
  prompt: string;
}

export const productShotPresets: ProductShotPreset[] = [
  {
    id: "white-main",
    name: "White Main Shot",
    shortName: "Main",
    description: "Clean white background with natural ecommerce shadow",
    defaultAspectRatio: "1:1",
    prompt:
      "Create a premium ecommerce main product image on a pure clean white background with soft natural grounding shadow, realistic studio lighting, sharp product edges, and a catalog-ready composition."
  },
  {
    id: "lifestyle-scene",
    name: "Lifestyle Scene",
    shortName: "Scene",
    description: "Realistic use environment with commercial lighting",
    defaultAspectRatio: "4:5",
    prompt:
      "Create a refined lifestyle product photograph in a realistic commercial setting that matches the product category, with tasteful props, professional lighting, natural depth of field, and a premium retail mood."
  },
  {
    id: "texture-detail",
    name: "Texture Detail",
    shortName: "Detail",
    description: "Highlights material, structure, detail, and premium finish",
    defaultAspectRatio: "3:2",
    prompt:
      "Create a close-up commercial product detail shot that emphasizes material texture, surface finish, edges, craftsmanship, and realistic highlights while keeping the product recognizable."
  },
  {
    id: "marketing-banner",
    name: "Marketing Banner",
    shortName: "Banner",
    description: "Horizontal image for campaign pages and store headers",
    defaultAspectRatio: "16:9",
    prompt:
      "Create a premium horizontal marketing hero image with the product as the central commercial subject, a polished background, balanced negative space for later copy, and high-end campaign lighting."
  },
  {
    id: "product-poster",
    name: "Product Information Poster",
    shortName: "Poster",
    description: "Commercial product poster with selling points, ingredients, functions, effects, and callouts",
    defaultAspectRatio: "4:5",
    prompt:
      "Create a polished commercial product information poster. Keep the product as the hero visual and build a clean poster layout with clear sections for product functions, ingredients or materials, effects, benefits, usage scenarios, and selling points when the seller provides them."
  }
];

export function getPreset(id: PresetId): ProductShotPreset {
  const preset = productShotPresets.find((item) => item.id === id);
  if (!preset) {
    throw new Error(`Unknown preset: ${id}`);
  }
  return preset;
}

export function buildProductShotPrompt(input: {
  presetId: PresetId;
  fidelity: FidelityMode;
  quality?: ImageQuality;
  productBrief?: string;
  styleGuide?: string;
  posterCopy?: string;
  aspectRatio: AspectRatio;
  outputFormat: string;
}): string {
  const preset = getPreset(input.presetId);
  const productBrief = normalizePromptNote(input.productBrief);
  const styleGuide = normalizePromptNote(input.styleGuide);
  const posterCopy = normalizePromptNote(input.posterCopy, 1200);
  const qualityInstruction = getQualityInstruction(input.quality);
  const fidelityInstruction =
    input.fidelity === "strict"
      ? "Strictly preserve the source product's exact shape, silhouette, proportions, logo placement, printed text, color palette, material, texture, and visible design details. Do not redesign, rename, invent labels, replace packaging, or change the product identity."
      : input.fidelity === "balanced"
        ? "Preserve the product identity, proportions, main colors, visible logo placement, and material while allowing subtle polish to lighting, reflections, and staging."
        : "Keep the product recognizable and commercially plausible while allowing more expressive styling in the environment, lighting, and campaign mood.";

  return [
    preset.prompt,
    productBrief
      ? `Seller-provided product context: ${productBrief}. Use this context to choose suitable props, environment, merchandising details, and category-appropriate staging.`
      : "Infer the product category and intended retail context from the source image before choosing the commercial setting.",
    styleGuide
      ? `Seller style direction: ${styleGuide}. Apply it only to background, lighting, scene mood, props, and composition.`
      : "Use a premium, clean, modern commercial photography style suitable for ecommerce and social campaign assets.",
    input.presetId === "product-poster"
      ? posterCopy
        ? `Poster copy to include: ${posterCopy}. Use this seller-provided copy for feature, ingredient/material, effect, benefit, usage, and selling-point sections. Keep the copy concise, organized, and visually readable. Do not invent ingredients, medical effects, certifications, discounts, or product claims that are not provided.`
        : "For the poster, create clean callout areas for functions, ingredients or materials, effects, benefits, usage scenarios, and selling points. Use generic short labels only when the seller did not provide exact copy, and do not invent specific claims."
      : "",
    qualityInstruction,
    fidelityInstruction,
    "If any seller context or style direction conflicts with the source image, the source image is authoritative.",
    "Only change the background, environment, lighting, composition, camera angle, shadow, reflection, and commercial staging.",
    "The product must remain the hero subject and must not be warped, melted, duplicated incorrectly, cropped through important details, or visually replaced.",
    `Aspect ratio: ${input.aspectRatio}. Output format preference: ${input.outputFormat}.`,
    input.presetId === "product-poster"
      ? "Poster text must be large, simple, high-contrast, and readable. No added watermarks, no fake certification marks, and no extra products unless they are clearly background props."
      : "No added watermarks, no fake certification marks, no unreadable promotional text, and no extra products unless they are clearly background props."
  ]
    .filter(Boolean)
    .join(" ");
}

function getQualityInstruction(quality: ImageQuality = "standard"): string {
  if (quality === "ultra") {
    return "Use ultra-premium commercial image quality with crisp edges, refined highlights, controlled reflections, and high-resolution detail suitable for hero assets.";
  }
  if (quality === "high") {
    return "Use high-quality commercial photography with clean detail, polished lighting, and sharp product rendering.";
  }
  return "Use clean standard commercial photography quality suitable for ecommerce listing images.";
}

function normalizePromptNote(value?: string, maxLength = 800): string {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}
