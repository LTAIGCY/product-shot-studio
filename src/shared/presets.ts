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
    name: "白底主图",
    shortName: "白底",
    description: "纯白背景电商主图，产品居中、真实清晰",
    defaultAspectRatio: "1:1",
    prompt:
      "基于输入的产品图片，生成一张专业电商白底主图。保持产品的真实外观、颜色、结构、材质、比例和品牌标识完全一致，不改变产品本身。产品居中展示，占画面主要区域，纯白背景，构图简洁，光线自然，带有干净柔和的阴影，画质高清，细节清晰，整体风格真实、专业、适合电商平台上架使用。不要添加文字、促销标签、水印、复杂背景和无关道具。"
  },
  {
    id: "scene",
    name: "场景图",
    shortName: "场景",
    description: "把产品自然融入匹配品类的真实使用场景",
    defaultAspectRatio: "4:5",
    prompt:
      "基于输入的产品图片，生成一张高质量电商场景图。将产品自然融入真实使用场景中，场景与产品品类高度匹配，例如家居、办公、厨房、卧室、户外、车内等。保持产品真实外观、颜色、结构和比例不变，使产品清晰突出，同时与环境协调统一。画面具有真实商业摄影质感，光线自然，氛围高级，构图干净，适合电商详情页和广告展示。"
  },
  {
    id: "selling-points",
    name: "卖点图",
    shortName: "卖点",
    description: "围绕 3 个核心卖点做现代电商展示",
    defaultAspectRatio: "4:5",
    prompt:
      "基于输入的产品图片，生成一张电商卖点展示图。以产品为视觉中心，突出展示 3 个核心卖点：[卖点1]、[卖点2]、[卖点3]。画面采用现代电商设计风格，配合简洁图标、短标题和简短说明文案，排版清晰，层级分明，背景简洁且与产品风格匹配。整体视觉需要突出产品价值，适合商品详情页卖点展示区域。"
  },
  {
    id: "detail",
    name: "细节图",
    shortName: "细节",
    description: "材质、工艺、结构等关键细节特写",
    defaultAspectRatio: "3:2",
    prompt:
      "基于输入的产品图片，生成一张产品细节展示图。突出产品关键细节部位，如材质纹理、表面工艺、边缘处理、按钮、拉链、接口、缝线或结构细节。使用高清特写和局部放大框展示细节，可搭配简洁标注线和简短说明文字。整体风格专业、精致、真实，背景简洁，适合电商详情页细节说明模块。"
  },
  {
    id: "size-params",
    name: "尺寸参数图",
    shortName: "尺寸",
    description: "尺寸线与参数模块清晰展示产品规格",
    defaultAspectRatio: "4:5",
    prompt:
      "基于输入的产品图片，生成一张电商尺寸参数图。产品主体清晰展示，并通过清晰尺寸线标注长、宽、高、厚度、容量或重量等核心参数。画面中加入简洁的参数信息模块，内容包括：[尺寸]、[材质]、[重量]、[容量]、[颜色] 等。整体排版简洁、清晰、专业，背景干净，适合移动端详情页阅读。"
  },
  {
    id: "function-analysis",
    name: "功能解析图",
    shortName: "功能",
    description: "用指示线和图标解释关键功能区域",
    defaultAspectRatio: "4:5",
    prompt:
      "基于输入的产品图片，生成一张产品功能解析图。以产品主体为中心，用简洁指示线标注产品的关键功能区域：[功能点1]、[功能点2]、[功能点3]、[功能点4]。每个功能点配简短说明文案和简洁图标。整体风格现代、科技感或专业电商风格，背景简洁，信息清楚易读，适合商品详情页功能说明模块。"
  },
  {
    id: "multi-angle",
    name: "多角度展示图",
    shortName: "多角度",
    description: "展示正面、侧面、背面和 45 度等视角",
    defaultAspectRatio: "4:5",
    prompt:
      "基于输入的产品图片，生成一张多角度展示图。画面展示产品的多个视角，包括正面、侧面、背面、45 度角，以及必要时的顶部或底部视角。所有视角中的产品必须保持外观、颜色、比例和结构一致。版式整齐清晰，背景简洁高级，光线统一，整体风格真实专业，适合电商商品相册和详情页展示。"
  },
  {
    id: "person-usage",
    name: "人物使用图",
    shortName: "人物",
    description: "人物自然使用产品，突出真实体验",
    defaultAspectRatio: "4:5",
    prompt:
      "基于输入的产品图片，生成一张人物使用产品的电商场景图。人物自然地使用产品，动作真实可信，产品清晰可见，不能被遮挡。人物形象符合目标用户群体：[目标人群]，场景符合实际使用环境：[使用场景]。整体风格为高端商业摄影，光线自然，氛围真实，构图干净，重点突出产品的使用体验与便利性。"
  },
  {
    id: "comparison",
    name: "对比图",
    shortName: "对比",
    description: "左右对比展示产品优势和差异点",
    defaultAspectRatio: "4:5",
    prompt:
      "基于输入的产品图片，生成一张产品对比图。采用左右对比布局，左侧为普通产品、旧款产品或传统方案，右侧为当前产品。围绕 [对比点1]、[对比点2]、[对比点3]、[对比点4] 展示差异，使用简洁表格、图标、对勾和简短说明文案。整体风格清晰、可信、专业，突出本产品的优势，但不要夸张或捏造不存在的效果。"
  },
  {
    id: "promotion-poster",
    name: "促销海报图",
    shortName: "促销",
    description: "电商活动、社媒广告和店铺营销海报",
    defaultAspectRatio: "4:5",
    prompt:
      "基于输入的产品图片，生成一张高质量电商视觉海报。产品作为核心视觉主体，保持产品真实外观、颜色、结构、材质、比例和品牌标识完全一致。背景需要简洁、有吸引力，并符合产品使用场景和品牌调性。\n\n画面中可以加入清晰的信息排版区域，用于展示产品名称、核心亮点、简短说明和按钮样式。整体风格现代、专业、干净，构图有层次，画质高清，适合商品页面、店铺首页和社交媒体展示。\n\n不要添加虚假价格、折扣、限时活动、夸张承诺、误导性文字、水印或杂乱元素。"
  },
  {
    id: "detail-page-long",
    name: "商品详情页长图",
    shortName: "长图",
    description: "纵向详情页长图，覆盖卖点、场景、细节和参数",
    defaultAspectRatio: "3:2",
    prompt:
      "基于输入的产品图片，生成一张专业电商商品详情页长图。保持产品的真实外观、颜色、结构、材质、比例和品牌标识完全一致，不改变产品本身。长图采用纵向排版，适合电商平台商品详情页展示，整体风格高级、清晰、真实、商业化。\n长图内容包含：顶部主视觉海报、产品核心卖点展示、使用场景展示、功能解析、细节特写、材质说明、尺寸参数、使用步骤、对比展示、适用人群/适用场景、底部购买引导区域。每个模块之间过渡自然，排版有层次感，画面丰富但不杂乱，文字区域预留清晰，适合后期添加中文标题、卖点文案和参数信息。\n背景根据产品类型设计为干净、高级、真实的商业场景，光线自然，产品突出，视觉重点明确，整体画质高清，细节清晰，适合淘宝、天猫、京东、拼多多、亚马逊等电商平台使用。不要改变产品本体，不要添加错误品牌，不要添加水印，不要生成混乱文字，不要出现无关人物或无关道具。"
  },
  {
    id: "custom",
    name: "自定义",
    shortName: "自定义",
    description: "保留当前输入内容，按自定义提示词生成",
    defaultAspectRatio: "1:1",
    prompt: ""
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
  const userPrompt = normalizePromptNote(input.productBrief, 5000);
  const effectivePrompt = userPrompt || preset.prompt;
  const legacyStyleGuide = normalizePromptNote(input.styleGuide, 1200);
  const legacyPosterCopy = normalizePromptNote(input.posterCopy, 1600);
  const qualityInstruction = getQualityInstruction(input.quality);
  const fidelityInstruction =
    input.fidelity === "strict"
      ? "Strictly preserve the source product's exact shape, silhouette, proportions, logo placement, printed text, color palette, material, texture, and visible design details. Do not redesign, rename, invent labels, replace packaging, or change the product identity."
      : input.fidelity === "balanced"
        ? "Preserve the product identity, proportions, main colors, visible logo placement, and material while allowing subtle polish to lighting, reflections, and staging."
        : "Keep the product recognizable and commercially plausible while allowing more expressive styling in the environment, lighting, and campaign mood.";

  return [
    effectivePrompt ? `生成提示词：${effectivePrompt}` : "用户未填写额外描述，请基于源图内容和电商商品图规范完成生成。",
    legacyStyleGuide ? `兼容旧任务风格要求：${legacyStyleGuide}` : "",
    legacyPosterCopy ? `兼容旧任务海报信息：${legacyPosterCopy}` : "",
    qualityInstruction,
    fidelityInstruction,
    "If any user text conflicts with the source image, the source image is authoritative.",
    "Keep the product as the hero subject. The product must not be warped, melted, duplicated incorrectly, cropped through important details, or visually replaced.",
    "Do not add watermarks, fake certification marks, fake brands, or unsupported product claims.",
    `Aspect ratio: ${input.aspectRatio}. Output format preference: ${input.outputFormat}.`
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
