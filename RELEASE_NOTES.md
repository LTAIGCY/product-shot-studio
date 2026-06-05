# Product Shot Studio 0.1.0

Windows x64 MVP package for generating commercial product showcase images from ordinary product photos.

## User Experience

- Default desktop interface is localized for Chinese users.
- Added an in-app update announcements page with Chinese release notes, exact update timestamps, detailed change groups, and a small maintenance checklist for future releases.
- Added local-only account sign-up/login with salted password hashing.
- Added local wallet balance, usage tracking, estimated generation cost, and generation blocking when balance is insufficient.
- Added detailed failure reason display for failed provider calls, including preset, error code, message, and retryability.
- Added WeChat QR recharge screen with provider/model/amount selection and local recharge ledger recording.
- Added image quality tiers with per-image price estimates and request-level estimated cost.
- Added optional product brief and style direction fields so seller category, material, selling points, audience, and scene preferences feed into every product-shot prompt.
- Added a product-poster output preset and poster-copy field for function, ingredient/material, effect, usage, and selling-point information.
- Replaced overseas providers with domestic image model providers: Aliyun Bailian, Volcano Ark, and Tencent Hunyuan.
- Added in-app API key acquisition steps and official key/terms links for Aliyun Bailian, Volcano Ark, and Tencent Hunyuan.
- Added multi-image queue management with add, select, delete, and batch-generate workflows.
- Added a dedicated full history interface while keeping only the latest five jobs in the main sidebar.
- Replaced the full history modal with a personal center that can switch between list-style job history and time-ordered generated-image history.
- Generated-image history cards now show the model used for each image.
- Split generation history and recycle-bin records by local account so accounts no longer share task history.
- Added local-account management on the login screen, including selecting existing accounts, creating new accounts, and deleting local accounts.
- Upgraded the login screen with a premium studio illustration generated for the app and a more polished account/pricing layout.
- Fixed history rendering compatibility for older saved jobs whose provider IDs are no longer in the current domestic-provider config.
- Added one-click clearing for all uploaded source images.
- Added local remembered-account resume: closing while logged in allows one-click entry next launch; explicit logout clears the remembered session.
- Added click-to-preview for uploaded source images and generated images.
- Added an image preview/editor with zoom, brightness, contrast, saturation, save original, and save edited image actions.
- Changed generated result tiles to show full images with mixed aspect ratios instead of cropping them to squares.
- Added quicker export buttons beside the active result status and each generated result card.
- Added visible export feedback: export buttons show loading, the workflow ribbon moves into export state, and the top progress bar fills to completion after export succeeds.
- Added visible refresh feedback with a short progress indicator and refreshed status message.
- Added history deletion, recycle bin, restore, and permanent delete flows.
- Added a generated premium workflow-studio illustration to the main empty upload state.
- Added four generated tutorial illustrations for import, API/model configuration, result generation, and export/history troubleshooting.
- Replaced the top Help link with an in-app Tutorial dialog that includes software introduction, illustrated usage steps, and FAQ troubleshooting.
- Expanded the Tutorial dialog with product-fidelity, aspect-ratio, prompt-writing, and export-check tips.
- Added a workflow status ribbon for import, configure, generate, and export stages.
- Fixed workflow stage highlighting so historical results no longer make a new empty workspace appear to be in the generation stage.
- Separated current results from recent history; the main result gallery now appears only for the active task or a selected history job.
- Added drag-and-drop highlight feedback, card entrance animation, preset scanning animation, modal entrance animation, and refined hover/active/focus states.
- Refined result cards, upload cards, buttons, side-panel controls, and translucent workspace surfaces for a more polished professional workflow feel.
- Reworked the main workspace into a fixed-height single-screen layout so the result gallery is visible without scrolling the whole page.
- Made recent history scrollable in the left sidebar.
- Enlarged the left sidebar and gave recent history a real scrollable area so more records remain readable.
- Added a collapsible model-selection panel with local memory for the last selected provider/model and the collapsed/expanded state.
- Made the central upload illustration and uploaded source image clickable for adding more images, with an explicit drag-and-drop upload hint.
- Expanded product brief and style direction text areas so prompt context is easier to write without cramped scrolling.
- Refined responsive text behavior across narrower or shorter windows so toolbar buttons, export paths, status text, and preset descriptions stay readable instead of being clipped.
- Fixed workflow stage highlighting so an empty upload area stays on the import step even when old history results are still visible.
- Tightened the output preset panel into a less crowded two-column layout.
- Changed enlarged image preview to fit the image in the preview window at default zoom without vertical scrolling.
- Added a configurable default export folder, defaulting to the user's Documents/Product Shot Studio Exports folder.
- Main model selection now shows the same priced model set as the login/pricing surface, including Doubao Seedream 5.0, 4.0, and 3.0.
- Updated Volcano Ark default image model to Doubao Seedream 5.0, while keeping Seedream 4.0 and 3.0 selectable.
- Added a manual model/access-point ID field so users can paste the exact Doubao model ID enabled in their Ark Console.
- Localized Volcano "model not activated" errors into actionable Chinese diagnostics and removed provider-side `%!s(...)` formatting artifacts.
- Fixed Volcano Seedream 4.0/5.0 generation size mapping by sending 2K-class aspect-ratio dimensions instead of 1024-class dimensions that Ark rejects.
- Localized Volcano invalid `size` errors into actionable Chinese diagnostics.
- Localized API quota, balance, inference-limit, and Volcano Safe Experience Mode pause errors into Chinese diagnostics with recharge/limit-adjustment guidance.
- Replaced the native Windows menu row with an in-app rounded action toolbar for image import, API keys, refresh, recharge, export, and help.
- Added per-preset output count control, clamped to 1-4 images per preset.
- Added in-flight generation cancellation wired through the provider adapters.
- Added failed-preset retry from task history, with history selection restoring the original provider, model, prompt context, aspect ratio, format, and output count.
- Hid the native desktop menu bar so the app uses the polished in-app toolbar instead.
- Added single-instance protection so repeated launches focus the existing window instead of starting another app instance.
- Refined the UI into a higher-end desktop workspace with account, wallet, pricing, recharge, and error surfaces.
- Source files keep ASCII-safe escaped strings to avoid Windows console encoding issues.

## Deliverables

- Latest enhanced package: `Product Shot Studio-0.1.0-win-x64-latest.zip`
- Current unpacked app folder: `package-current-14/`
- Older unpacked app folder: `package-current-13/`
- Older unpacked app folder: `package-current-12/`
- Older unpacked app folder: `package-current-11/win-unpacked/`
- Older unpacked app folder: `package-current-10/win-unpacked/`
- Older unpacked app folder: `package-current-9/win-unpacked/`
- Older unpacked app folder: `package-current-8/win-unpacked/`
- Older unpacked app folder: `package-current-7/win-unpacked/`
- Older unpacked app folder: `package-current-6/win-unpacked/`
- Older unpacked app folder: `package-current-5/win-unpacked/`
- Older unpacked app folder: `package-current-4/win-unpacked/`
- Older unpacked app folder: `package-current-3/win-unpacked/`
- Older unpacked app folder: `package-current-2/win-unpacked/`
- Older unpacked app folder: `package-current/win-unpacked/`
- Previous unpacked app folder: `package-latest/win-unpacked/`
- `Product Shot Studio-0.1.0-win-x64.zip`
- Unpacked app folder: `package/win-unpacked/`

## Verified

- TypeScript typecheck passed.
- Unit, integration, prompt, billing, update-announcement, cancellation, output-count, error-normalization, and provider request-mapping tests passed: 7 files, 21 tests.
- Renderer and main-process production build passed.
- Latest packaged `Product Shot Studio.exe` startup smoke test passed after clearing a stale development Electron single-instance lock.
- Live provider smoke command is available through `npm.cmd run live:smoke -- aliyun|volcano|tencent`.

## Runtime Notes

- Users provide their own Aliyun Bailian, Volcano Ark, or Tencent Hunyuan API credentials.
- API keys stay local through keytar when available, with Electron safeStorage fallback.
- Local account and wallet records are stored only on this Windows machine.
- WeChat recharge is implemented as a local ledger UI. Real automatic payment confirmation requires a WeChat Pay merchant account, backend order creation, and payment callback verification.
- Displayed model costs are estimates based on public provider pricing pages; actual bills are determined by each provider.
- Live image generation requires a valid provider key and network access to the selected model provider.
