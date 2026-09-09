# ACHIVIO
### Pin. Focus. Unlock. — Achievement Overlay for Steam

Always-on-top desktop overlay to track your Steam achievements in real time while you play. Pin what you're hunting, focus without distractions, unlock more.

![stack](https://img.shields.io/badge/Electron-Vue%203%20--%20Pinia-818cf8)
![brand](https://img.shields.io/badge/brand-ACHIVIO-818cf8)

## Download & install

Grab the latest release from the **Releases** tab on GitHub. Two options:

- **Portable** (`Achivio-*-portable.exe`) — single file, just run it. Best for trying it out.
- **Installer** (`Achivio Setup *.exe`) — installs with a shortcut and uninstaller.

Requirements: Windows 10/11 x64, Steam installed, and your game in **Borderless Windowed** mode (otherwise the overlay stays behind the game).

> The exes are not code-signed, so Windows SmartScreen shows a warning on first run — normal for indie builds: *More info → Run anyway*.

## First run

1. Get your free **Steam Web API key** at [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey) and paste it.
2. Paste your **17-digit SteamID** (or your vanity URL/name — it resolves automatically with the API key). Don't know it? The *Find your SteamID →* button takes you there.
3. Pick a language and hotkey, *Save & Start Tracking*, then launch a Steam game.

## Features

- 🎯 **Live tracking** — detects the game you're running and shows your achievement progress instantly
- 📌 **Pins + Focus mode** — pin the achievements you're chasing and collapse the overlay into a compact panel
- 🖱️ **Click-through** — let clicks pass through to the game (ideal for point-and-clicks), with a configurable global hotkey
- 🔢 **Numeric progress** — automatic progress detection (e.g. 221/300) via Steam stats, or manual tracking with hotkeys
- 📖 **Built-in guides** — guide search (Steam Community, YouTube) with an in-overlay text reader, no need to leave the game
- 🪟 **Detached guide panel** — open a guide in its own resizable always-on-top window
- ⌨️ **Global hotkeys** — show/hide overlay, toggle focus, click-through, manual progress +/-
- 🎨 **Themes** — 6 configurable accent colors, adjustable opacity
- 🌐 **Multi-language** — achievement names in 12 languages

## Support the project

ACHIVIO is free and open-source. If it helps you, buy me a coffee:

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/fmarquesdev)

Or donate crypto (double-check the network before sending):

- **BTC** (Bitcoin network): `bc1pukyc69jwtkczp65glskjl8vs3rtd0w9erpw5uq72v3n48zzdyl9qngqjm2`
- **USDT** (Tron / TRC20 network): `TW3PAf7xiKcaA6kpmcVuXnMbQ2Kvnrjfdd`

## How it works

The app queries the Steam Web API with your own API key (configured on first run) to detect your current game and its achievements. Everything is stored locally (`userData/config.json`) — no backend, no telemetry.

> The API key is personal and free: [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey)

## Development

```bash
# install dependencies
bun install

# dev server with HMR
bun run dev

# production build
bun run build

# installer + portable (.exe) into dist/
bun run dist
```

Typecheck:

```bash
bunx vue-tsc --noEmit -p tsconfig.web.json    # renderer
bunx vue-tsc --noEmit -p tsconfig.node.json   # main + preload
```

## Branding

**ACHIVIO** — *Pin. Focus. Unlock.*

The name comes from *achievement* + *archivo/vivo* (Spanish for file/alive). The tagline sums up the core loop: you pin (`AchievementCard`), you focus (`FocusView`), you unlock.

## Stack

Electron (electron-vite) · Vue 3 · Pinia · TypeScript · axios

## Structure

```
src/
├── main/       # main process: IPC, Steam API, scraping, hotkeys, window
├── preload/    # contextBridge bridge → window.steamApi
├── renderer/   # Vue 3 UI (views, components, Pinia store)
└── shared/     # types shared between processes
```

## Note

To see the overlay on top of your game, set the game to **Borderless Windowed** mode.
