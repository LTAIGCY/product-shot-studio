# Design QA

## Evidence

- Source visual truth:
  - `C:/Users/L/AppData/Local/Temp/codex-clipboard-b47f36a6-97bc-4410-a835-ad4b2a7a1b6f.png`
  - `C:/Users/L/AppData/Local/Temp/codex-clipboard-32d2f3de-3dcf-4721-bbee-040964397c81.png`
  - `C:/Users/L/AppData/Local/Temp/codex-clipboard-32a53fc8-ab8d-46bb-a0a7-ba883cca7607.png`
  - `C:/Users/L/AppData/Local/Temp/codex-clipboard-a541c606-f296-49f0-856c-8be7cb4130ce.png`
  - `C:/Users/L/AppData/Local/Temp/codex-clipboard-202ff902-5d44-4f0b-9cc7-1e7abdee8514.png`
  - `C:/Users/L/AppData/Local/Temp/codex-clipboard-5d813eee-617c-44ef-b03b-a3c888ffafca.png`
  - `C:/Users/L/AppData/Local/Temp/codex-clipboard-6ef2aaab-1899-4436-8334-a3ee75b5049e.png`
- Implementation screenshot: unavailable.
- Intended viewport: 1920 x 1080 desktop, plus a narrower desktop window.
- States: image/video model panels, image ratio/count and video duration panels, shared upload surfaces, shared result empty states, export success/error feedback.

## Full-view Comparison

Blocked. The Electron UI requires its preload bridge and cannot render correctly in a normal browser. The available Windows Computer Use runtime failed during initialization because an internal `@oai/sky` package subpath is not exported, so no truthful implementation screenshot could be captured.

## Focused-region Comparison

Blocked for the same reason. Source references were available, but no implementation capture was available for side-by-side comparison.

## Findings

- [P0] Automated visual comparison is unavailable.
  - Location: Electron desktop application.
  - Evidence: source references are available, but implementation capture failed before the application window could be inspected.
  - Impact: typography, spacing, responsive wrapping, and exact visual fidelity cannot be certified from rendered evidence.
  - Fix: manually open the built Electron application at 1920 x 1080 and capture the required expanded states, or rerun Design QA after the Computer Use runtime is repaired.

## Patches Made

- Reduced image/video model cards to 72px, provider marks to 18px, and model labels to 13px; added pointer-positioned full-name tooltips with viewport clamping.
- Removed per-option opacity animation and forced ratio/count options to remain fully opaque; reduced expanded-panel spacing and option heights by approximately one third.
- Added reference-matched export success/error cards with count, target path/error detail, close action, and separate cancellation feedback.
- Added idempotent historical video collection and per-history-task image/video export actions; no-result actions are disabled.
- Reduced the export result notice to half-size while preserving its information hierarchy.
- Limited model full-name tooltips to labels whose rendered width is actually truncated.
- Reduced the video duration panel to the same compact density as ratio/count, unified the video import surface with image generation, and rebuilt both result empty states from the latest reference.
- Corrected the image workspace height so its result-card bottom border is no longer clipped by parent padding.
- Switched result panes to two rows when empty and three rows only when errors exist, keeping the dashed empty state equally inset and stretched to the available height.
- Replaced the bright orange result accents with the application's existing cream/cognac tokens.

## Required Fidelity Surfaces

- Fonts and typography: model labels reduced to 13px and export hierarchy aligned to the supplied reference; rendered comparison blocked.
- Spacing and layout rhythm: model cards set to 72px and ratio/count cards to 70–74px; rendered comparison blocked.
- Colors and visual tokens: retained the existing cream/cognac palette; rendered comparison blocked.
- Image and icon fidelity: reused project provider marks and Lucide icons; no new raster assets were required.
- Copy and content: matched the requested Chinese labels and warnings.

## Final Result

final result: blocked
