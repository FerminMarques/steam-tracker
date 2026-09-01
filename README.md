# ACHIVIO
### Pin. Focus. Unlock. — Achievement Overlay for Steam

Overlay de escritorio always-on-top para trackear logros de Steam en tiempo real mientras jugás. Fijá lo que cazás, enfocate sin distracciones, desbloqueá más.

![stack](https://img.shields.io/badge/Electron-Vue%203%20--%20Pinia-818cf8)
![brand](https://img.shields.io/badge/brand-ACHIVIO-818cf8)

## Features

- 🎯 **Tracking en vivo** — detecta el juego que estás corriendo y muestra tu progreso de logros al instante
- 📌 **Pins + Focus mode** — pineá los logros que estás persiguiendo y colapsá el overlay a un panel compacto
- 🔢 **Progreso numérico** — detección automática de progreso (ej. 221/300) vía stats de Steam, o tracking manual con hotkeys
- 📖 **Guías integradas** — buscador de guías (Steam Community, YouTube) con lector de texto dentro del overlay, sin salir del juego
- ⌨️ **Global hotkeys** — mostrar/ocultar overlay, toggle focus, +/- progreso manual
- 🎨 **Temas** — 6 colores de acento configurables, opacidad ajustable
- 🌐 **Multi-idioma** — nombres de logros en 12 idiomas

## Cómo funciona

La app consulta la Steam Web API con tu propia API key (se configura en el primer arranque) para detectar tu juego actual y sus logros. Todo se guarda localmente (`userData/config.json`) — no hay backend ni telemetría.

> La API key es personal y gratuita: [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey)

## Desarrollo

```bash
# instalar dependencias
bun install

# dev server con HMR
bun run dev

# build de producción
bun run build
```

Typecheck:

```bash
bunx vue-tsc --noEmit -p tsconfig.web.json    # renderer
bunx vue-tsc --noEmit -p tsconfig.node.json   # main + preload
```

## Branding

**ACHIVIO** — *Pin. Focus. Unlock.*

El nombre viene de *achievement* + *archivo/vivo*. El tagline resume el loop core: pineás (`AchievementCard`), te enfocás (`FocusView`), desbloqueás.

## Stack

Electron (electron-vite) · Vue 3 · Pinia · TypeScript · axios

## Estructura

```
src/
├── main/       # proceso principal: IPC, Steam API, scraping, hotkeys, ventana
├── preload/    # bridge contextBridge → window.steamApi
├── renderer/   # UI Vue 3 (vistas, componentes, store Pinia)
└── shared/     # tipos compartidos entre procesos
```

## Nota

Para ver el overlay sobre el juego, poné el juego en modo **Borderless Windowed**.
