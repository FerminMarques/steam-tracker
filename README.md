# ACHIVIO
### Pin. Focus. Unlock. — Achievement Overlay for Steam

Overlay de escritorio always-on-top para trackear logros de Steam en tiempo real mientras jugás. Fijá lo que cazás, enfocate sin distracciones, desbloqueá más.

![stack](https://img.shields.io/badge/Electron-Vue%203%20--%20Pinia-818cf8)
![brand](https://img.shields.io/badge/brand-ACHIVIO-818cf8)

## Descarga e instalación

Bajá el último release de la pestaña **Releases** de GitHub. Tenés dos opciones:

- **Portable** (`Achivio-*-portable.exe`) — un solo archivo, lo ejecutás y listo. Ideal para probar.
- **Instalador** (`Achivio Setup *.exe`) — instala con acceso directo y desinstalador.

Requisitos: Windows 10/11 x64, Steam instalado y el juego en modo **Borderless Windowed** (si no, el overlay queda detrás del juego).

> Los exes no están firmados con certificado, así que Windows SmartScreen muestra una advertencia la primera vez — es normal en builds indie: *Más información → Ejecutar de todas formas*.

## Primer arranque

1. Conseguí tu **Steam Web API key** gratuita en [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey) y pegala.
2. Pegá tu **SteamID de 17 dígitos** (o tu vanity URL/nombre — con la API key lo resuelve solo). Si no sabés cuál es, el botón *Find your SteamID →* te lleva a averiguarlo.
3. Elegí idioma y hotkey, *Save & Start Tracking* e iniciá un juego de Steam.

## Features

- 🎯 **Tracking en vivo** — detecta el juego que estás corriendo y muestra tu progreso de logros al instante
- 📌 **Pins + Focus mode** — pineá los logros que estás persiguiendo y colapsá el overlay a un panel compacto
- 🖱️ **Click-through** — deja pasar los clics al juego (ideal point-and-clicks), con hotkey global configurable
- 🔢 **Progreso numérico** — detección automática de progreso (ej. 221/300) vía stats de Steam, o tracking manual con hotkeys
- 📖 **Guías integradas** — buscador de guías (Steam Community, YouTube) con lector de texto dentro del overlay, sin salir del juego
- 🪟 **Panel de guías separado** — abrí una guía en su propia ventana redimensionable siempre visible
- ⌨️ **Global hotkeys** — mostrar/ocultar overlay, toggle focus, click-through, +/- progreso manual
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

# instalador + portable (.exe) en dist/
bun run dist
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
