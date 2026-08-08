# Architecture

This document explains how Termcraft's source is organised, how a route becomes a tool page, and how to add and verify a tool. It is for contributors who have read the project overview in [`README.md`](../README.md) and need a code-level map.

## Source layout

Vite uses `app/` as its root. `app/src/main.tsx` mounts the React 19 application, and `app/src/App.tsx` chooses the landing page or workbench from the current hash route.

| Path                  | What belongs there                                                                                          | Examples                                                           |
| --------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `app/src/engines/`    | Rendering, conversion, palette, parsing, and layout logic that does not import React                        | `image-to-ansi.js`, `dither.ts`, `boxes.ts`, `prompt.ts`           |
| `app/src/tabs/`       | One React tool surface per file. Tabs own controls, local state, uploads, previews, and calls into engines. | `ImageToAnsiTab.tsx`, `DitherTab.tsx`, `ChartsTab.tsx`             |
| `app/src/tools/`      | The tool catalogue and the small maps that connect ids to tab components and icons                          | `registry.ts`, `tabs.tsx`, `icons.tsx`                             |
| `app/src/landing/`    | The public landing page, cards, and live hero scene                                                         | `Landing.tsx`, `ToolCard.tsx`, `HeroScene.tsx`, `scene.ts`         |
| `app/src/components/` | Shared layout, tool controls, preview and export components, plus reusable UI primitives                    | `layout/Workbench.tsx`, `shared/ExportBar.tsx`, `ui/button.tsx`    |
| `app/src/hooks/`      | Reusable React state and browser interactions                                                               | `use-image-upload.ts`, `use-default-sample.ts`, `use-clipboard.ts` |
| `app/src/lib/`        | Cross-tool application services and format helpers                                                          | `router.ts`, `recipe.ts`, `ansi-parse.ts`, `export/`               |

`app/src/styles.css` holds the shared styles. The `@` alias resolves to `app/src`, as configured in `vite.config.ts`.

## Two organising rules

The [`README.md`](../README.md) states two rules that shape the codebase.

### `engines/` never imports React

The engine directory contains no React import. A tab imports an engine, not the other way around. For example, `app/src/tabs/DitherTab.tsx` combines `dither()`, `renderBraille()`, `renderBlockChars()`, and the ramp data without putting UI state into those modules. `scripts/test-render.js` can require `app/src/engines/image-to-ansi.js` directly in Node and exercise its cell renderers without mounting React.

This boundary also permits reuse outside a tab. `app/src/engines/braille.ts` is called by both Image to ASCII and Dither Lab. `app/src/engines/ramps.ts` supplies both tools. The landing renderer takes the same non-React approach in `app/src/landing/scene.ts`, which lets `scripts/generate-og.js` bundle and run it in a generation script.

Some engine entry points still use browser APIs. For example, `processImage()` in `app/src/engines/image-to-ansi.js` creates a canvas, while its exported `renderHalfBlocks()` and related cell renderers accept pixel arrays directly. “No React” does not mean every engine function is independent of the browser.

### `tools/registry.ts` is the only place a tool is described

`app/src/tools/registry.ts` defines the `ToolId` and `GroupId` unions, the `ToolGroup` and `Tool` interfaces, `GROUPS`, and the `TOOLS` records. A `Tool` holds the name, group, icon name, tagline, description, features, preview, and readiness flag.

Keeping that copy in one record prevents the shell and landing page from developing separate descriptions. `app/src/components/layout/Sidebar.tsx` reads the groups, tool names, ids, and icon names. `app/src/components/layout/Workbench.tsx` reads the active name and tagline. `app/src/landing/Landing.tsx` and `app/src/landing/ToolCard.tsx` read the group copy, descriptions, features, and previews. `app/src/lib/router.ts` calls `isToolId()` from the registry when validating a route. `scripts/generate-context.js` bundles the same registry to generate the public product context.

Component wiring is deliberately separate from description data. `app/src/tools/tabs.tsx` imports every tab, while `app/src/tools/icons.tsx` imports Lucide components. This allows landing-page code to import plain registry data without also loading every tool component.

## Routing and deployment paths

`app/src/lib/router.ts` implements a hash router. It recognises these routes:

```text
#/                         landing page
#/t/<toolId>               tool page
#/t/<toolId>?r=<recipe>    tool page with encoded settings
```

`parseHash()` strips `#`, separates the query, validates the id with `isToolId()`, and falls back to `{ name: "home" }` for anything else. `useRoute()` listens for `hashchange`. `App.tsx` renders `Landing` for home or passes the validated `ToolId` to `Workbench`. `Workbench` keeps every visited tab mounted and hides inactive tabs, so switching tools does not discard in-progress state.

Hash routing keeps the application route after `#`, where it does not require a server rewrite. `vite.config.ts` sets `base: "./"`, so built asset URLs are relative to the page that loads them. Together these choices let the static build work under a GitHub Pages project path, another host path, or a local file URL.

## Add a new tool

Adding a tool changes four connection points plus the new tab itself.

1. **Extend `ToolId` and add the registry record.** In `app/src/tools/registry.ts`, add the new string literal to `ToolId`. Add one `Tool` object to `TOOLS` with an existing `GroupId`, an icon name, all required copy and preview fields, and `ready: true` for a shipping tool. The `Tool` comment says unfinished tools are hidden, but the current sidebar and landing-page consumers do not filter on `ready`; do not rely on `false` to hide an entry. Do not repeat the description in the sidebar or landing page.
2. **Create the tab component.** Add `app/src/tabs/<Name>Tab.tsx` and export a React component such as `NewToolTab`. Keep UI and state in the tab. Put reusable conversion or rendering logic in `app/src/engines/` without React imports. Reuse components and hooks where they fit.
3. **Register the component.** In `app/src/tools/tabs.tsx`, import the new tab and add its property to `TAB_COMPONENTS`. The object has type `Record<ToolId, ComponentType>`, so TypeScript requires an entry for every `ToolId`.
4. **Register the icon.** In `app/src/tools/icons.tsx`, import the chosen `LucideIcon` from `lucide-react` and add it to `ICONS`. The key must exactly match the registry record's `icon` string. `ToolIcon` otherwise falls back to `Type`, so a missing icon entry is visible but is not a type error.

After those edits, run `npm run typecheck`. Start `npm run dev`, open `#/t/<new-id>`, and check that the sidebar link, page heading, landing card, preview art, icon, controls, output, and direct URL all work. Add the id to the `TOOLS` array in `scripts/verify-pages.js`; that script says explicitly that its list must stay in sync with the registry. Run `npm run verify` against the dev server so the new page is mounted in a browser. If the tool changes Image to ANSI output, also run `npm test` and inspect any baseline diff.

Finally, run `npm run gen:context`, because `app/public/context.md` is generated from the tool registry. If the number of tools or social-card copy changes, review `scripts/generate-og.js` and regenerate `app/public/og.png` with `npm run gen:og`.

## Testing and verification

### Render baselines

`scripts/test-render.js` is a headless visual test for `app/src/engines/image-to-ansi.js`. It does not open the application. It uses `pngjs` to load each PNG in `tests/samples/`, calculates the real renderer dimensions, scales the source with nearest-neighbour sampling, and calls the exported cell renderer for each mode under test. It then draws those cells as exact rectangles in a PNG.

The script tests 11 render settings: 256-colour and 24-bit variants of `half`, `halffg`, `quad`, `block`, and `full`, plus `binary`. With the three current input images, that produces the 33 tracked comparisons described by the README. Sextant and octant are not in this test matrix.

| Path              | Purpose                                                                                |
| ----------------- | -------------------------------------------------------------------------------------- |
| `tests/samples/`  | Tracked PNG inputs: `colorcube.png`, `gradient.png`, and `transparency-demo.png`       |
| `tests/expected/` | Tracked expected PNG for every sample and tested mode                                  |
| `tests/output/`   | Transient actual PNGs and scaled source references from the latest run; ignored by Git |

`npm test` compares output and expected PNGs pixel for pixel in RGB and also fails on an image-size mismatch. A diff is a regression when the renderer was not meant to change, or when the changed pixels do not match the intended new behaviour. It is an intended change only after the new rendering has been inspected and confirmed as correct. In that case, `npm run test:update` replaces the tracked baselines; the new files should be reviewed like source code, not accepted only because the command produced them.

### Page verification

`scripts/verify-pages.js` uses Playwright Chromium against a running site. It opens the landing page and every id in its own `TOOLS` list, waits for network idle and 1.5 seconds of rendering, and fails a page when it logs a console error, throws an uncaught page error, contains “Coming soon”, or has fewer than 200 characters of body text.

This catches failures that `npm run typecheck` cannot see, such as code that compiles but throws during React mount. It also catches empty or placeholder pages that the Image to ANSI render baselines never visit. Conversely, it does not compare visual pixels or prove that a control's output is correct. Run it with `npm run dev` in another terminal, or set `BASE_URL` to a preview or deployed build.

## Generated, committed artefacts

These outputs are tracked in Git. Do not edit them as the primary source. Regenerate and commit them whenever their inputs change.

| Artefact                | Command               | Inputs and reason to regenerate                                                                                                                                                                                                                          |
| ----------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/public/samples/`   | `npm run gen:samples` | `scripts/generate-samples.js` defines eight procedural images, their thumbnails, metadata, dimensions, and recommended tools. Regenerate the PNGs and `index.json` after changing those definitions or rendering functions.                              |
| `app/public/og.png`     | `npm run gen:og`      | `scripts/generate-og.js` bundles `app/src/landing/scene.ts` and `app/src/landing/encoders.ts`, uses the Geist assets and its own card markup, then screenshots the 1200×630 result. Regenerate after changing those renderer inputs or the card content. |
| `app/public/context.md` | `npm run gen:context` | `scripts/generate-context.js` bundles `app/src/tools/registry.ts` and combines it with prose in the generator. Regenerate after changing either the registry or those prose blocks.                                                                      |

Generation is not covered by `npm run build`. Run the named command explicitly, inspect the result, and include the updated committed artefact with the source change that required it.
