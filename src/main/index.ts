import { app, BrowserWindow, ipcMain, shell, globalShortcut, clipboard } from 'electron'
import { join } from 'path'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { store } from './store'
import {
  registerHotkeys,
  setStoredHotkey,
  DEFAULT_HOTKEY,
  DEFAULT_FOCUS_HOTKEY,
  DEFAULT_PROGRESS_DOWN,
  DEFAULT_PROGRESS_UP
} from './hotkeys'
import { createWindow, focusResize } from './window'
import { getCurrentGame, getAchievements, getGameArt, resolveVanity } from './steam'
import { searchWeb, getBestGuides } from './search'
import { fetchGuideContent } from './scrape'
import { openGuidePanel, updateGuidePanel, closeGuidePanel, getGuidePanelData, isGuidePanelSticky, setGuidePanelSticky, onGuidePanelFocusExited } from './guidePanel'
import type { Guide } from '../shared/types'

app.whenReady().then(() => {
  store.init(app.getPath('userData'))
  electronApp.setAppUserModelId('com.steam-tracker')
  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))

  // --- Config ---
  ipcMain.handle('steam:get-config', () => ({
    apiKey: store.get('apiKey', '') as string,
    steamId: store.get('steamId', '') as string,
    language: store.get('language', 'english') as string,
    theme: store.get('theme', 'violet') as string
  }))
  ipcMain.handle('config:get-path', () => join(app.getPath('userData'), 'config.json'))
  ipcMain.handle('config:open-path', () => {
    shell.showItemInFolder(join(app.getPath('userData'), 'config.json'))
    return true
  })
  ipcMain.handle('clipboard:read', () => clipboard.readText())

  ipcMain.handle('theme:set', (_, theme: string) => {
    store.set('theme', theme)
    return true
  })

  ipcMain.handle('steam:save-config', (_, cfg: { apiKey: string; steamId: string; language?: string }) => {
    const entries: Record<string, string> = { apiKey: cfg.apiKey, steamId: cfg.steamId }
    if (cfg.language) entries.language = cfg.language
    store.setMany(entries)
    return true
  })

  // --- Current game ---
  ipcMain.handle('steam:get-current-game', () => getCurrentGame())

  // --- Achievements ---
  ipcMain.handle('steam:get-achievements', (_, appId: string) => getAchievements(appId))

  // --- Game header art ---
  ipcMain.handle('steam:get-game-art', (_, appId: string) => getGameArt(appId))

  // --- Web search (DuckDuckGo + static fallbacks) ---
  ipcMain.handle('search:web', (_, { appId, gameName, achievementName }: { appId: string; gameName: string; achievementName: string }) =>
    searchWeb(appId, gameName, achievementName)
  )

  // --- Known 100% guides for a game ---
  ipcMain.handle('best-guides:get', (_, appId: string) => getBestGuides(appId))

  // --- Open URL in default browser (http(s) only: scraped guide URLs are untrusted) ---
  ipcMain.on('open:url', (_, url: string) => {
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        console.warn(`[open:url] blocked non-http protocol: ${parsed.protocol}`)
        return
      }
      void shell.openExternal(parsed.toString())
    } catch {
      console.warn('[open:url] blocked invalid URL')
    }
  })

  // --- Window controls ---
  ipcMain.on('window:minimize', (e) => BrowserWindow.fromWebContents(e.sender)?.minimize())
  ipcMain.on('window:close', (e) => BrowserWindow.fromWebContents(e.sender)?.close())
  ipcMain.on('window:toggle-top', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (win) {
      const next = !win.isAlwaysOnTop()
      // 'screen-saver' level: stays on top of games in borderless windowed
      if (next) win.setAlwaysOnTop(true, 'screen-saver')
      else win.setAlwaysOnTop(false)
      win.webContents.send('window:top-changed', next)
    }
  })
  ipcMain.handle('window:is-on-top', (e) =>
    BrowserWindow.fromWebContents(e.sender)?.isAlwaysOnTop() ?? false
  )
  ipcMain.handle('steam:clear-config', () => {
    store.setMany({ apiKey: '', steamId: '' })
    return true
  })

  // --- Hotkey ---
  ipcMain.handle('hotkey:get', () => store.get('hotkey', DEFAULT_HOTKEY))
  ipcMain.handle('hotkey:set', (_, accelerator: string) => {
    const ok = setStoredHotkey('hotkey', accelerator)
    if (ok) {
      const win = BrowserWindow.getAllWindows()[0]
      win?.webContents.send('hotkey:changed', accelerator)
    }
    return ok
  })

  // --- Focus Hotkey ---
  ipcMain.handle('focus-hotkey:get', () => store.get('focusHotkey', DEFAULT_FOCUS_HOTKEY))
  ipcMain.handle('focus-hotkey:set', (_, accelerator: string) =>
    setStoredHotkey('focusHotkey', accelerator)
  )

  // --- Progress +/- Keys ---
  ipcMain.handle('progress-keys:get', () => ({
    down: store.get('progressDownKey', DEFAULT_PROGRESS_DOWN),
    up: store.get('progressUpKey', DEFAULT_PROGRESS_UP)
  }))
  ipcMain.handle('progress-keys:set', (_, { down, up }: { down: string; up: string }) => {
    const wins = BrowserWindow.getAllWindows()
    if (!wins.length) return false
    store.setMany({ progressDownKey: down, progressUpKey: up })
    registerHotkeys(wins[0], store.get('hotkey', DEFAULT_HOTKEY))
    return true
  })

  // --- Focus mode resize ---
  ipcMain.on('focus:resize', (e, payload) => focusResize(e, payload))

  // --- Window opacity ---
  ipcMain.handle('window:get-opacity', (e) =>
    BrowserWindow.fromWebContents(e.sender)?.getOpacity() ?? 1
  )
  ipcMain.on('window:set-opacity', (e, value: number) => {
    BrowserWindow.fromWebContents(e.sender)?.setOpacity(Math.max(0.1, Math.min(1, value)))
  })

  // --- Resolve Steam vanity URL → Steam ID64 ---
  ipcMain.handle('steam:resolve-vanity', (_, { apiKey, vanityUrl }: { apiKey: string; vanityUrl: string }) =>
    resolveVanity(apiKey, vanityUrl)
  )

  // --- Save language ---
  ipcMain.handle('steam:save-language', (_, lang: string) => {
    store.set('language', lang)
    return true
  })

  // --- Pinned achievements persistence ---
  ipcMain.handle('pinned:get', (_, appId: string): string[] => {
    try {
      return JSON.parse(store.get(`pins_${appId}`, '[]'))
    } catch {
      return []
    }
  })
  ipcMain.handle('pinned:set', (_, { appId, pins }: { appId: string; pins: string[] }) => {
    try {
      store.set(`pins_${appId}`, JSON.stringify(pins))
      return true
    } catch {
      return false
    }
  })

  // --- Pinned guides persistence ---
  // Stored per game as JSON: { achApiName: Guide } (content field is never persisted)
  ipcMain.handle('guidepins:get', (_, appId: string): Record<string, Guide> => {
    try {
      return JSON.parse(store.get(`guidepins_${appId}`, '{}'))
    } catch {
      return {}
    }
  })
  ipcMain.handle('guidepins:set', (_, { appId, pins }: { appId: string; pins: Record<string, Guide> }) => {
    try {
      store.set(`guidepins_${appId}`, JSON.stringify(pins))
      return true
    } catch {
      return false
    }
  })

  // --- Manual progress tracking ---
  // Stored per game as JSON: { achApiName: { current, max } }
  ipcMain.handle('manual-progress:get', (_, appId: string) => {
    try {
      return JSON.parse(store.get(`mp_${appId}`, '{}'))
    } catch {
      return {}
    }
  })

  ipcMain.handle('manual-progress:set', (_, { appId, achApiName, current, max }: { appId: string; achApiName: string; current: number; max: number }) => {
    try {
      const data = JSON.parse(store.get(`mp_${appId}`, '{}'))
      data[achApiName] = { current: Math.max(0, Math.min(current, max)), max }
      store.set(`mp_${appId}`, JSON.stringify(data))
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('manual-progress:delete', (_, { appId, achApiName }: { appId: string; achApiName: string }) => {
    try {
      const data = JSON.parse(store.get(`mp_${appId}`, '{}'))
      delete data[achApiName]
      store.set(`mp_${appId}`, JSON.stringify(data))
      return true
    } catch {
      return false
    }
  })

  // --- Guide panel window (separate resizable/draggable panel) ---
  ipcMain.on('guide-panel:open', (e, data) => {
    const parent = BrowserWindow.fromWebContents(e.sender)
    if (parent) openGuidePanel(parent, data)
  })
  ipcMain.on('guide-panel:update', (_, data) => updateGuidePanel(data))
  ipcMain.handle('guide-panel:get-data', () => getGuidePanelData())
  ipcMain.handle('guide-panel:get-sticky', () => isGuidePanelSticky())
  ipcMain.on('guide-panel:set-sticky', (_, val: boolean) => setGuidePanelSticky(val))
  ipcMain.on('guide-panel:focus-exited', () => onGuidePanelFocusExited())
  ipcMain.on('guide-panel:close', () => closeGuidePanel())

  // --- Fetch guide content ---
  ipcMain.handle('fetch:guide-content', (_, { url, achievementName, full }: { url: string; achievementName: string; full?: boolean }) =>
    fetchGuideContent(url, achievementName, full ?? false)
  )

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll()
  if (process.platform !== 'darwin') app.quit()
})
