# Design QA

final result: passed

## Scope

- Reference: `E:\product-shot-studio\参考图.png`
- Implementation target: main image generation workspace and global left navigation.
- Screenshot checked: `C:\Users\L\AppData\Local\Temp\product-shot-studio-ui-qa\main-empty.png`

## Visual Checks

- Left navigation matches the reference direction: dark teal shell, bright active image-generation item, compact brand block, and wallet/recharge area pinned near the bottom.
- Main workspace matches the reference structure: white rounded canvas, top command row, four workflow cards, left upload preview, right model/output/prompt/template controls, and bottom result strip.
- Controls remain visible and usable at a 1680 x 945 desktop viewport. No horizontal scrollbar is visible in the right configuration column.
- Scene template buttons are visible in the first viewport; prompt inputs and output controls fit without overlapping adjacent panels.
- Empty generation state renders with the existing workflow illustration asset and keeps the upload action prominent.

## Verification

- `tsc --noEmit -p tsconfig.json`: passed.
- `tsc --noEmit -p tsconfig.main.json`: passed.
- `vitest run --config vitest.config.ts`: 7 files passed, 21 tests passed.
- `vite build`: passed.

## Notes

- The screenshot used an Electron hidden-window QA harness with a temporary mocked `window.productStudio` API, so it only validates the image page empty state and layout. Runtime generation, export, wallet, and IPC behavior were preserved in code and covered by existing type/test/build checks.

## Follow-up QA - 2026-06-10

- Fixed bottom layout pressure: the generated-result band is now reserved as a visible grid row. In the 1904 x 1015 Electron QA viewport, `.result-band` measured `y=765`, `height=223`, `bottom=988`, inside the visible viewport.
- Verified generated state with 1 uploaded image and 5 mocked generated results. The result tiles rendered inside the bottom band and did not clip against the app frame.
- Verified preview comparison flow. The preview dialog measured `height=882`, with `.preview-compare-strip` visible at the top and `compareCount=2` after adding one comparison image.
- Verified the login page uses the light original-style shell again, separate from the dark logged-in app frame.
- Verified the top-right single generate button keeps the brighter hover treatment and routes through a second confirmation before starting generation.

## Follow-up Verification - 2026-06-10

- `tsc --noEmit -p tsconfig.json`: passed.
- `tsc --noEmit -p tsconfig.main.json`: passed.
- `vitest run --config vitest.config.ts`: 7 files passed, 21 tests passed.
- `vite build`: passed.

## Cream Champagne QA - 2026-06-11

- Verified the logged-in image workspace and global side navigation use cream, champagne gold, warm gray, and warm black as the visible UI palette. Primary controls, active states, workflow states, selected model/provider/template buttons, cost strip, and result cards are no longer using green as the workspace accent color.
- Verified the login screen remains visually unchanged by the new `.app-frame` scoped styling.
- Verified the wallet area renders the username with a static gold `VIP` badge and visible gold shine treatment.
- Verified workflow steps show explicit status pills (`已完成`, `进行中`, `待处理`) in addition to icons and gold completion styling.
- Verified preview comparison renders a same-dialog image grid. In the Electron QA viewport, `.preview-compare-grid` measured `width=1417`, `height=769`, and `compareCount=2` after adding one comparison image.

## Cream Champagne Verification - 2026-06-11

- `tsc --noEmit -p tsconfig.json`: passed.
- `tsc --noEmit -p tsconfig.main.json`: passed.
- `vitest run --config vitest.config.ts`: 7 files passed, 21 tests passed.
- `vite build`: passed.

## Reference Tone QA - 2026-06-11

- Reference image tone applied after the first champagne pass: side navigation is now light cream rather than dark brown, and the workspace uses white/ivory canvas surfaces with softer cognac accents.
- Verified generated-state Electron QA screenshot: side navigation background resolved to light cream gradients, studio board resolved to white/ivory gradients, primary button resolved to brown-gold gradient, `resultCount=5`, and `VIP` remained visible.
- The local WeChat temp image path was no longer readable during verification, but the embedded user-provided screenshot was used as the visual reference.

## Reference Tone Verification - 2026-06-11

- `vite build`: passed.
- `git diff --check -- src/renderer/src/styles.css design-qa.md`: passed, with only Git line-ending warnings.

## Login Tone / Format Settings / Compare Zoom QA - 2026-06-11

- Verified the login page now uses the same light cream, soft cognac, and low-border frosted tone as the reference. Browser DOM style checks found `greenSignals=0` for the login primary button, active login tab, and brand mark.
- Verified the logged-in workspace keeps the light cream reference tone. Main output controls no longer include `图片格式`; output fields now contain aspect ratio, count, and quality only.
- Verified the Settings page contains the new `图片格式` card with `png`, `jpg`, and `webp`; clicking `webp` updates the active UI state.
- Verified the model provider/model area renders placeholder brand logos for `阿里百炼`, `火山方舟`, and `腾讯混元` without adding runtime image assets.
- Verified the wallet username row still shows the static gold `VIP` badge.
- Verified preview comparison with three images in the same grid. At a 1440 x 900 browser viewport, `.preview-dialog` measured `1392 x 864`, `.preview-compare-grid` measured `1358 x 749`, and `compareCount=3`.
- Verified independent compare image interactions: wheel zooming image 1 and image 2 produced separate transform matrices while image 3 stayed at `matrix(1, 0, 0, 1, 0, 0)`; dragging image 2 changed only image 2 pan values.
- Browser screenshot capture timed out in the in-app browser, so this pass used DOM style, layout dimensions, and transform metrics for QA evidence.

## Login Tone / Format Settings / Compare Zoom Verification - 2026-06-11

- `tsc --noEmit -p tsconfig.json`: passed.
- `tsc --noEmit -p tsconfig.main.json`: passed.
- `vitest run --config vitest.config.ts`: 7 files passed, 21 tests passed.
- `vite build`: passed.

## Compare Management / Generate Confirm / Updates Tone QA - 2026-06-12

- Verified the image workspace batch button shows the expected total output count: `批量生成（5张）` for 1 source image, 5 selected presets, and 1 output per preset.
- Verified the single-generate confirmation dialog appears in-app instead of using `window.confirm`; it includes source image, provider/model, output parameters, selected presets, prompt sections, `预计出图`, `预计消耗`, current balance, and post-task balance.
- Verified canceling the single-generate confirmation closes the dialog and leaves the result band in the waiting state.
- Verified batch-generate confirmation uses the same cream/champagne dialog and shows `确认批量生成`, source count, selected templates, and total output count.
- Verified preview comparison enters `grid-2x2` by default after adding two comparison images. The same dialog rendered 3 cards, 3 delete buttons, and 3 draggable handles.
- Verified layout switching to `adaptive` works, and deleting down to one remaining image keeps the compare card visible with the final delete button disabled.
- Verified update announcements use the cream/cognac tone. Browser QA found `cardCount=7`, the latest-card and badge backgrounds resolved to cream/gold gradients, and `greenSignals=0` for checked update-page surfaces.
- Browser coordinate dragging did not trigger native HTML5 drag in the in-app browser automation surface, but the DOM exposes draggable handles and drop-capable cards; TypeScript/build validation covers the drag handlers.

## Compare Management / Generate Confirm / Updates Tone Verification - 2026-06-12

- `tsc --noEmit -p tsconfig.json`: passed.
- `tsc --noEmit -p tsconfig.main.json`: passed.
- `vitest run --config vitest.config.ts`: 7 files passed, 21 tests passed.
- `vite build`: passed.
- `git diff --check -- src/renderer/src/App.tsx src/renderer/src/styles.css design-qa.md`: passed, with only Git line-ending warnings.

## Global Cream Tone / Compare Interaction QA - 2026-06-12

- Applied a final logged-in tone sweep for video generation, personal center, recharge, transaction, history, price, queue, status, and shared selected/focus states. The new overrides are scoped under `.app-frame`, so they target the authenticated desktop UI and do not change backend or IPC behavior.
- Video generation imported-state surfaces are now covered by cream/cognac selectors: source panel, source preview, queue active state, control panel, form fields, result band, and video result cards.
- Personal center surfaces are now covered by cream/cognac selectors: tabs, summary cards, history rows, generated image cards, recharge dialog, amount buttons, price table, QR panel, transaction rows, and trash/history action pills.
- Preview comparison now derives displayed names from the original file path basename instead of `comparison` placeholder labels.
- Preview comparison cards now expose full-frame drag sorting while preserving image-area pan/zoom behavior.
- Right-clicking a preview comparison card opens a cream/cognac context menu with `Delete image`; the final remaining image cannot be deleted.
- Mouse-wheel preview zoom now uses the pointer coordinate inside the image container as the zoom anchor and uses `transform-origin: 0 0`, so zooming no longer centers around the image by default.
- Browser mock QA was not executed in this pass because the current tool surface exposed `node_repl` but the project does not include Playwright. To avoid adding a runtime/dev dependency for QA only, validation was limited to static coverage inspection plus type/test/build checks.

## Global Cream Tone / Compare Interaction Verification - 2026-06-12

- `npm.cmd run typecheck`: passed.
- `npm.cmd test`: 7 files passed, 21 tests passed.
- `npm.cmd run build`: passed.

## Compare Delete / Wheel Anchor Fix QA - 2026-06-12

- Removed the right-click delete context menu from the preview comparison dialog.
- Changed the compare-card delete affordance to a square `X` button pinned to the top-right corner of each image card; the last remaining image still cannot be deleted.
- Fixed wheel zoom anchoring by keeping the center-origin coordinate system and preserving pan while zooming below `100%`; the point under the mouse is now used as the zoom anchor instead of resetting toward the upper-left.

## Compare 2x2 Wheel Anchor / Delete Button Size QA - 2026-06-12

- Restricted the legacy `.preview-compare-grid button` card styling to direct child buttons only, so the top-right delete button no longer inherits stretched card dimensions.
- The delete affordance is now a standalone `30 x 30` square button with only an `X` icon, matching the left action square size.
- Reworked wheel zoom to use an explicit CSS matrix and top-left coordinate math. Both `grid-2x2` and `adaptive` compare layouts now share the same pointer-anchored formula, so the image point under the mouse should remain fixed while zooming.

## Preview Title Size / Grid Scroll Wheel QA - 2026-06-12

- Reduced the preview dialog title font size from `18px` to `14px`, and reduced compare-card image names from `13px` to `11px`.
- Image wheel zoom now calls `preventDefault` and `stopPropagation`, so zooming a preview/comparison image does not also scroll the compare grid.
- The compare grid now only allows whole-grid wheel scrolling when the pointer is inside the right-side vertical scrollbar hit area; wheel input over image/card content is blocked from moving the whole grid.

## Native Compare Grid Wheel Guard QA - 2026-06-12

- Added a native capture-phase `wheel` listener on `.preview-compare-grid` with `passive: false`, so the grid scroll default is blocked before the browser scrolls the container.
- The guard allows grid scrolling only when the pointer is inside the right-side scrollbar hit area; image/card content wheel input remains reserved for image zoom.
- Added `overscroll-behavior: contain` and stable scrollbar gutter on the compare grid to reduce scroll chaining and make the scrollbar hit area predictable.

## Button Cost / Layout Scale / Compact Confirm QA - 2026-06-12

- Moved single-generate and batch-generate estimated credit costs into their respective top-right buttons, because the two actions can consume different totals.
- Added `3x3` and `4x4` comparison layouts in addition to `2x2` and adaptive comparison modes.
- Reworked the generate confirmation modal into a compact summary box with source count, output count, model, output settings, presets, prompt summary, estimated cost, balance, and after-task balance.
- Added final high-specificity logged-in overrides for `.text-button.dark`, `.transaction-amount`, personal summary values, price values, QR amount, and related action text so old green/teal styling no longer wins through specificity or `!important`.

## Preview Cost Strip / Compare Layout Menu QA - 2026-06-12

- Removed the old output-panel cost strip (`cost-strip`) so the previous standalone `estimated cost` row no longer appears under output settings.
- Kept credit estimates inside the single-generate and batch-generate action buttons only.
- The preview dialog header now shows only the generic preview title and does not display the active image file name in the top-left area.
- Compare cards now display only each image's original file name, without extra subtitles or active-target helper text.
- The compare layout toolbar now exposes one visible `adaptive` control plus a right-side triangle menu for `2x2`, `3x3`, `4x4`, and custom `N x N` input.
- `npm.cmd run typecheck`: passed.
- `npm.cmd test`: 7 files passed, 21 tests passed.
- `npm.cmd run build`: passed.
- `git diff --check -- src/renderer/src/App.tsx src/renderer/src/styles.css design-qa.md`: passed, with only Git line-ending warnings.
- Vite renderer preview is reachable at `http://127.0.0.1:5173/`; direct browser rendering still requires Electron preload APIs, so full visual interaction should be checked in the Electron shell.

## Single Prompt / 12 Template Preset QA - 2026-06-12

- Replaced the previous 5 generation presets with the 12 Chinese ecommerce templates requested by the user.
- Changed the image workspace input description area from three fields to one prompt textarea.
- Template selection is now single-select. Clicking templates 1-11 replaces the textarea with that template's prompt; clicking `自定义` keeps the current text unchanged.
- Prompt construction treats the textarea as the final prompt when it has content, so a clicked template is not duplicated in the provider prompt.
- Generation, batch count, estimated credits, progress, retry, and result titles now use the selected 12-template preset instead of the old preset package.
- Old history compatibility is handled by merging legacy `productBrief`, `styleGuide`, and `posterCopy` into the single prompt field when restoring a previous job.
- `npm.cmd run typecheck`: passed.
- `npm.cmd test`: 7 files passed, 23 tests passed.
- `npm.cmd run build`: passed.

## Output Menu / Session Results / Unified Models QA - 2026-06-12

- Renamed image output labels to `比例` and `张数`, and replaced the visible segmented ratio/count controls with single-value controls plus right-side triangle menus.
- The ratio menu keeps `1:1 / 4:5 / 16:9 / 3:2` presets and a custom ratio input; the count menu keeps `1-4` presets and a custom count input clamped to the existing generation limit.
- Image results now render from in-memory session results. New generated images are prepended to the left, while previous session results remain until the app session ends.
- The main image model area no longer displays provider platform selection buttons; all Qwen, Doubao, and Hunyuan image models are shown in one model list, and choosing a model sets the hidden provider automatically.
- Tencent Hunyuan image generation now repeats requests up to `outputCount` and writes multiple result files instead of forcing one image.
- `npm.cmd run typecheck`: passed.
- `npm.cmd test`: 7 files passed, 24 tests passed.
- `npm.cmd run build`: passed.

## Output Dropdown Layering Fix QA - 2026-06-12

- Raised the output panel stacking layer when a ratio/count menu is open, so the dropdown panel is no longer hidden behind the following input description panel.
- Increased the dropdown menu and panel z-index and kept the output panel overflow visible.

## Multi Output Count / Confirm Cleanup / Workflow Shine QA - 2026-06-12

- Aliyun, Volcano, and Tencent image adapters now keep requesting until they collect the selected `outputCount` (`1-4`) instead of silently accepting a single returned image.
- Product shot service now rejects adapter responses whose result count differs from the normalized requested count, so a `4 张` request cannot be marked successful with only `1` image.
- Output dropdowns now close when clicking outside the menu.
- Removed the visible `图片质量` selector and all `模型 / 接入点 ID` custom input fields; the confirmation dialog now only shows the remaining visible settings.
- Strengthened the selected model card highlight and added a champagne-gold shimmer/pulse animation to completed workflow badges.
- `npm.cmd run typecheck`: passed.
- `npm.cmd test`: 7 files passed, 27 tests passed.
- `npm.cmd run build`: passed.
- `git diff --check -- src/main/providers/china.ts src/main/providers/adapters.test.ts src/main/services/productShotService.ts src/main/services/productShotService.test.ts src/renderer/src/App.tsx src/renderer/src/styles.css design-qa.md`: passed, with only Git line-ending warnings.

## Prompt Area / Promotion Poster Template QA - 2026-06-13

- Increased the completed workflow badge shine and glow brightness while keeping the reduced-motion override.
- Doubled the main prompt textarea height from `112px` to `224px`, with the max vertical resize height raised to `360px`.
- Replaced the `促销海报图` template prompt with the new high-quality ecommerce visual poster wording.
- Added preset test coverage for the updated promotion poster prompt and its false-price/discount warning language.
- `npm.cmd run typecheck`: passed.
- `npm.cmd test`: 7 files passed, 28 tests passed.
- `npm.cmd run build`: passed.
- `git diff --check -- src/renderer/src/styles.css src/shared/presets.ts src/shared/presets.test.ts design-qa.md`: passed, with only Git line-ending warnings.

## Compact Model Card / Template Status Line QA - 2026-06-13

- Simplified image model cards to show only the provider icon and model display name; model ID text is still kept internally for generation requests.
- Reduced collapsed and expanded model card heights with single-line model name truncation.
- Removed the image workspace template-panel status line, including the previous `图片已就绪` row.
- `npm.cmd run typecheck`: passed.
- `npm.cmd test`: 7 files passed, 28 tests passed.
- `npm.cmd run build`: passed.
- `git diff --check -- src/renderer/src/App.tsx src/renderer/src/styles.css design-qa.md`: passed, with only Git line-ending warnings.

## Integrated Window Title Bar QA - 2026-06-13

- Replaced the visually separate Windows title strip with a 38px cream title bar integrated into the application surface.
- Preserved the native Windows minimize, maximize/restore, and close controls in the top-right corner.
- Added compact application and current-page labels without introducing a second toolbar or changing the existing workspace navigation.
- Verified the title bar in the running Electron application at a DPI-aware 2582 x 1550 capture. The title bar, left navigation, command area, workflow steps, upload surface, configuration panel, and result area render without overlap.
- Compared the implementation screenshot with the supplied Codex title-bar reference. The new bar follows the same low-contrast, continuous-window direction while retaining Product Shot Studio's cream and cognac palette.
- Screenshot checked: `C:\Users\Gcy\Documents\Codex\2026-06-03\goal\product-shot-studio-dev\.runtime-logs\titlebar-preview-dpi.png`.

## Integrated Window Title Bar Verification - 2026-06-13

- `npm.cmd run typecheck`: passed.
- `npm.cmd test`: 8 files passed, 34 tests passed.
- Electron development application: running successfully.

## History Preview / Windows Brand Icon QA - 2026-06-14

- History image jobs with results now restore the task results and open the first generated image in the existing full preview dialog without leaving Personal Center.
- Failed image jobs with no generated results still open the image workspace so their error state can be inspected and retried.
- The Windows window icon, taskbar icon, portable executable, and installer now use the cream/cognac Sparkles brand mark shown in the application navigation.
- The icon asset is generated at 512 x 512 and included as an application resource for packaged builds.

## History Preview / Windows Brand Icon Verification - 2026-06-14

- `npm.cmd run build:icon`: passed.
- `npm.cmd run typecheck`: passed.
- `npm.cmd test`: 8 files passed, 34 tests passed.
- `npm.cmd run build`: passed.
- `git diff --check`: passed, with only Git line-ending warnings.

## Personal Gallery / Ecommerce Ordering / Comparison QA - 2026-06-14

- Added the `个人图库` navigation entry directly below `视频生成`, using the existing cream and cognac workspace styling.
- Generated image cards can be added to the current account's gallery without leaving the image workflow. Existing gallery items display a clear collected state.
- Personal Center image history rows can add all successful results from a task to the gallery. Failed tasks without results do not expose an invalid collection action.
- Gallery data is stored per local account in SQLite. The same image is deduplicated for one account, while another account keeps an independent gallery.
- Gallery cards show explicit ecommerce publishing sequence numbers and support drag-and-drop ordering plus precise previous/next controls.
- Ordering persists in the database, and removing an item compacts the remaining sequence without gaps.
- Selecting two or more gallery images opens the existing professional comparison viewer, retaining zoom, pan, layout, ordering, editing, and save behavior.
- Clicking a gallery image opens the complete image preview instead of navigating back to the image generation page.
- Single-image preview now starts in a true fit-to-window state: the complete image is centered inside the available preview frame, regardless of portrait, landscape, or square ratio.
- Wheel zoom uses the pointer position relative to the centered canvas, while double-click and the reset button return to the complete fit-to-window view.

## Personal Gallery Verification - 2026-06-14

- `npm.cmd run typecheck`: passed.
- `npm.cmd test`: 9 files passed, 36 tests passed.
- `npm.cmd run build`: passed.
- `git diff --check`: passed, with only Git line-ending warnings.
