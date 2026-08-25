import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { Achievement, ApiResult, Guide, SteamGame } from '../shared/types'

const steamApi = {
  getConfig: (): Promise<{ apiKey: string; steamId: string; language: string; theme: string }> =>
    ipcRenderer.invoke('steam:get-config'),
  setTheme: (theme: string): Promise<boolean> => ipcRenderer.invoke('theme:set', theme),
  saveConfig: (cfg: { apiKey: string; steamId: string; language?: string }): Promise<boolean> =>
    ipcRenderer.invoke('steam:save-config', cfg),
  clearConfig: (): Promise<boolean> =>
    ipcRenderer.invoke('steam:clear-config'),
  saveLanguage: (lang: string): Promise<boolean> =>
    ipcRenderer.invoke('steam:save-language', lang),
  getCurrentGame: (): Promise<ApiResult<SteamGame>> =>
    ipcRenderer.invoke('steam:get-current-game'),
  getGameArt: (appId: string): Promise<string | null> =>
    ipcRenderer.invoke('steam:get-game-art', appId),
  getAchievements: (appId: string): Promise<ApiResult<Achievement[]>> =>
    ipcRenderer.invoke('steam:get-achievements', appId),
  searchWeb: (appId: string, gameName: string, achievementName: string): Promise<Guide[]> =>
    ipcRenderer.invoke('search:web', { appId, gameName, achievementName }),
  fetchGuideContent: (url: string, achievementName: string, full = false): Promise<{ success: boolean; content: string }> =>
    ipcRenderer.invoke('fetch:guide-content', { url, achievementName, full }),
  openUrl: (url: string): void => ipcRenderer.send('open:url', url),
  minimize: (): void => ipcRenderer.send('window:minimize'),
  close: (): void => ipcRenderer.send('window:close'),
  toggleTop: (): void => ipcRenderer.send('window:toggle-top'),
  isOnTop: (): Promise<boolean> => ipcRenderer.invoke('window:is-on-top'),
  onTopChanged: (cb: (val: boolean) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, val: boolean) => cb(val)
    ipcRenderer.on('window:top-changed', handler)
    return () => ipcRenderer.off('window:top-changed', handler)
  },
  getHotkey: (): Promise<string> => ipcRenderer.invoke('hotkey:get'),
  setHotkey: (accelerator: string): Promise<boolean> => ipcRenderer.invoke('hotkey:set', accelerator),
  onHotkeyChanged: (cb: (val: string) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, val: string) => cb(val)
    ipcRenderer.on('hotkey:changed', handler)
    return () => ipcRenderer.off('hotkey:changed', handler)
  },
  getFocusHotkey: (): Promise<string> => ipcRenderer.invoke('focus-hotkey:get'),
  setFocusHotkey: (accelerator: string): Promise<boolean> => ipcRenderer.invoke('focus-hotkey:set', accelerator),
  resolveVanity: (apiKey: string, vanityUrl: string): Promise<{ success: boolean; steamId?: string; error?: string }> =>
    ipcRenderer.invoke('steam:resolve-vanity', { apiKey, vanityUrl }),
  getOpacity: (): Promise<number> => ipcRenderer.invoke('window:get-opacity'),
  setOpacity: (value: number): void => ipcRenderer.send('window:set-opacity', value),
  resizeFocus: (active: boolean, count: number, height?: number): void =>
    ipcRenderer.send('focus:resize', { active, count, height }),
  onFocusToggle: (cb: () => void): (() => void) => {
    const handler = () => cb()
    ipcRenderer.on('focus:toggle', handler)
    return () => ipcRenderer.off('focus:toggle', handler)
  },
  getPinnedAchievements: (appId: string): Promise<string[]> =>
    ipcRenderer.invoke('pinned:get', appId),
  setPinnedAchievements: (appId: string, pins: string[]): Promise<boolean> =>
    ipcRenderer.invoke('pinned:set', { appId, pins }),
  getPinnedGuides: (appId: string): Promise<Record<string, Guide>> =>
    ipcRenderer.invoke('guidepins:get', appId),
  setPinnedGuides: (appId: string, pins: Record<string, Guide>): Promise<boolean> =>
    ipcRenderer.invoke('guidepins:set', { appId, pins }),
  getManualProgress: (appId: string): Promise<Record<string, { current: number; max: number }>> =>
    ipcRenderer.invoke('manual-progress:get', appId),
  setManualProgress: (appId: string, achApiName: string, current: number, max: number): Promise<boolean> =>
    ipcRenderer.invoke('manual-progress:set', { appId, achApiName, current, max }),
  deleteManualProgress: (appId: string, achApiName: string): Promise<boolean> =>
    ipcRenderer.invoke('manual-progress:delete', { appId, achApiName }),
  getProgressKeys: (): Promise<{ down: string; up: string }> =>
    ipcRenderer.invoke('progress-keys:get'),
  setProgressKeys: (down: string, up: string): Promise<boolean> =>
    ipcRenderer.invoke('progress-keys:set', { down, up }),
  onProgressAdjust: (cb: (delta: number) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, delta: number) => cb(delta)
    ipcRenderer.on('progress:adjust', handler)
    return () => ipcRenderer.off('progress:adjust', handler)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('steamApi', steamApi)
  } catch (error) {
    console.error(error)
  }
} else {
  ;(window as any).electron = electronAPI
  ;(window as any).steamApi = steamApi
}
