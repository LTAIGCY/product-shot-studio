# Provider Adapter Contract

Every image provider implements the same runtime contract:

- `validateKey(apiKey)` verifies credentials without storing secrets.
- `getCapabilities()` returns supported models, aspect ratios, output formats, and preset support.
- `generateProductShot(request, context)` receives a product-preserving prompt plus a local source image path, calls the provider, and returns generated files saved under the app data directory.
- `cancelJob(jobId)` cancels active network requests when supported.

The app keeps provider models in configuration so model IDs can be updated without touching UI code.

## Default Models

- OpenAI: `gpt-image-2`
- Google: `gemini-3.1-flash-image`
- Stability: `stable-image-control-structure`

The Stability adapter targets the REST v2beta image-to-image style endpoint because the MVP starts from a product reference photo.
