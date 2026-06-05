const fs = require("node:fs/promises");
const path = require("node:path");
const zlib = require("node:zlib");

const root = path.resolve(__dirname, "..");
const outputRoot = path.join(root, "outputs", "live-smoke");
const sourceImagePath = path.join(outputRoot, "sample-product.png");

const providerEnv = {
  aliyun: ["ALIYUN_API_KEY", "DASHSCOPE_API_KEY"],
  volcano: ["VOLCANO_API_KEY", "ARK_API_KEY"],
  tencent: ["TENCENT_HUNYUAN_KEY", "TENCENT_SECRET"]
};

async function main() {
  const providerId = (process.argv[2] || "aliyun").toLowerCase();
  if (!providerEnv[providerId]) {
    throw new Error(`Unknown provider "${providerId}". Use aliyun, volcano, or tencent.`);
  }

  const apiKey = getApiKey(providerId);
  if (!apiKey) {
    const names = providerEnv[providerId].join(" or ");
    throw new Error(`Missing ${names}. Set a real provider API key before running live smoke.`);
  }

  await fs.mkdir(outputRoot, { recursive: true });
  await fs.writeFile(sourceImagePath, createSampleProductPng(512, 512));

  const { createProviderAdapters } = require("../dist/main/providers/base.js");
  const { buildProductShotPrompt } = require("../dist/shared/presets.js");
  const { providerConfigs } = require("../dist/shared/providers.js");
  const adapters = createProviderAdapters();
  const adapter = adapters[providerId];

  if (!adapter) {
    throw new Error(`Provider adapter not found: ${providerId}`);
  }

  const presetId = "white-main";
  const providerOutputDir = path.join(outputRoot, providerId);
  await fs.mkdir(providerOutputDir, { recursive: true });

  const modelId = providerConfigs[providerId].defaultModel;
  const request = {
    sourceImagePath,
    providerId,
    modelId,
    presetIds: [presetId],
    fidelity: "strict",
    outputCount: 1,
    aspectRatio: "1:1",
    exportFormat: "png"
  };

  const results = await adapter.generateProductShot(request, {
    jobId: `live-${Date.now()}`,
    apiKey,
    presetId,
    prompt: buildProductShotPrompt({
      presetId,
      fidelity: "strict",
      aspectRatio: "1:1",
      outputFormat: "png"
    }),
    outputDir: providerOutputDir,
    sourceMimeType: "image/png"
  });

  if (!results.length) {
    throw new Error(`${providerId} returned no live smoke result.`);
  }

  const stat = await fs.stat(results[0].imagePath);
  if (stat.size < 1024) {
    throw new Error(`Generated image is unexpectedly small: ${results[0].imagePath}`);
  }

  console.log(JSON.stringify({ providerId, modelId, result: results[0].imagePath, bytes: stat.size }, null, 2));
}

function getApiKey(providerId) {
  for (const name of providerEnv[providerId]) {
    if (process.env[name]) return process.env[name];
  }
  return "";
}

function createSampleProductPng(width, height) {
  const rows = [];
  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0;
    for (let x = 0; x < width; x += 1) {
      const index = 1 + x * 4;
      const bg = 238 + Math.floor((x + y) / 80) % 8;
      let r = bg;
      let g = bg - 4;
      let b = bg - 12;
      let a = 255;

      const inBox = x >= 150 && x <= 362 && y >= 112 && y <= 408;
      if (inBox) {
        r = 42;
        g = 96;
        b = 82;
      }
      const highlight = x >= 182 && x <= 330 && y >= 148 && y <= 230;
      if (highlight) {
        r = 250;
        g = 244;
        b = 226;
      }
      const label = x >= 190 && x <= 322 && y >= 254 && y <= 318;
      if (label) {
        r = 233;
        g = 197;
        b = 91;
      }
      const cap = x >= 176 && x <= 336 && y >= 92 && y <= 122;
      if (cap) {
        r = 32;
        g = 45;
        b = 52;
      }
      const shadow = x >= 132 && x <= 382 && y >= 416 && y <= 436;
      if (shadow) {
        r = 188;
        g = 184;
        b = 174;
        a = 230;
      }

      row[index] = r;
      row[index + 1] = g;
      row[index + 2] = b;
      row[index + 3] = a;
    }
    rows.push(row);
  }

  const raw = Buffer.concat(rows);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", Buffer.concat([u32(width), u32(height), Buffer.from([8, 6, 0, 0, 0])])),
    pngChunk("IDAT", zlib.deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const crcInput = Buffer.concat([typeBuffer, data]);
  return Buffer.concat([u32(data.length), typeBuffer, data, u32(crc32(crcInput))]);
}

function u32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value >>> 0, 0);
  return buffer;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
