# AGENTS.md

Electron overlay app for tracking Steam achievements (electron-vite + Vue 3 + Pinia + TypeScript). Not a git repo; no tests, lint, or CI exist.

## Commands

**NEVER use npm — always use bun** (`bun run dev`, `bunx` instead of `npx`, etc.), no exceptions.
- `bun run dev` — dev server with HMR (main, preload, renderer)
- `bun run build` / `bun run preview` — production build / preview
- Typecheck: `bunx vue-tsc --noEmit -p tsconfig.web.json` (renderer) **and** `-p tsconfig.node.json` (main + preload) — two separate composite projects, no script defined for either

## Architecture

Three electron-vite targets under `src/`, plus shared types:

- **Main** (`src/main/`) — split by concern: `index.ts` is only app lifecycle + IPC wiring; real logic lives in `store.ts` (ConfigStore), `steam.ts` (Steam Web API + progress heuristics), `search.ts` (DuckDuckGo scrape), `scrape.ts` (guide content extraction), `hotkeys.ts` (globalShortcut), `window.ts` (BrowserWindow creation/resize).
- **Preload** (`src/preload/index.ts`) — exposes `window.steamApi` via contextBridge; every IPC method is wrapped here.
- **Renderer** (`src/renderer/src/`) — Vue 3 SFCs + Pinia store in `stores/app.ts`; alias `@renderer` → `src/renderer/src`.
- **Shared** (`src/shared/types.ts`) — `Achievement`, `Guide`, `SteamGame`, `ApiResult<T>` used by all three targets. Alias `@shared` exists only in the renderer/vite config; main/preload import it relatively. Don't duplicate these types elsewhere.

### Adding an IPC endpoint requires 3 edits

1. Handler in a `src/main/` module + registration in `src/main/index.ts`
2. Wrapper method in `src/preload/index.ts` (channels are string-based, e.g. `steam:get-config`)
3. Matching signature in `src/preload/index.d.ts` (`SteamApi` interface)

The renderer picks up the types via the triple-slash reference in `src/renderer/src/env.d.ts` — remove it and every `window.steamApi` usage stops typechecking.

## Conventions & gotchas

- Config persistence is a custom `ConfigStore` class (`src/main/store.ts`) writing plain JSON to Electron's `userData/config.json`. It deliberately avoids `electron-store` for ESM/CJS compatibility reasons — don't swap it out. Use `setMany()` when writing several keys to get one disk write.
- Steam API handlers return `ApiResult<T>` (`{ data, error }`) instead of throwing or returning bare `null`. Normal "nothing detected" is `{ data: null, error: null }`; real failures carry a human-readable `error` shown as a banner in DashboardView.
- Hotkeys are registered via `globalShortcut` and re-registered as a set: any change to one hotkey handler must keep `registerHotkeys()`'s `unregisterAll()` behavior intact. New hotkeys are validated with `canRegisterAccelerator()`.
- Polling pauses while the overlay window is hidden (`document.hidden` guard in `pollCurrentGame`); visibilitychange triggers an immediate poll on show.
- The window is frameless, transparent, always-on-top by default; window controls (minimize/close/toggle-top/opacity) go through IPC, not native chrome.
- Vue templates cannot access `window` — route anything through the store or a script-setup function (this was a real bug once in FocusView).
- Achievement progress detection uses heuristics (token matching between achievement api names and stat names) in `src/main/steam.ts` — treat that block carefully; it's game-specific guesswork.
