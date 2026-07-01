# Provider Adapter Contract

Every image provider implements the same runtime contract:

- `validateKey(apiKey)` verifies credentials without storing secrets.
- `getCapabilities()` returns supported models, aspect ratios, output formats, and preset support.
- `generateProductShot(request, context)` receives a product-preserving prompt plus a local source image path, calls the provider, and returns generated files saved under the app data directory.
- `cancelJob(jobId)` cancels active network requests when supported.

The app keeps provider models in configuration so model IDs can be updated without touching UI code.

## Current Providers and Default Models

- Alibaba Model Studio: `qwen-image-edit`
- Volcengine Ark: `doubao-seedream-5-0-260128`
- Tencent Hunyuan: `hunyuan-image-rapid`

Provider IDs, model catalogs, API key documentation links, and terms links live in
`src/shared/providers.ts`. Video model metadata lives in `src/shared/videoModels.ts`.
The UI must consume these shared catalogs instead of duplicating model IDs.

Provider API keys remain in local secure storage. They must never be written to the
cloud ledger, source control, application logs, or error reports.
