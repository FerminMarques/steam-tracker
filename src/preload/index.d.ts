import type { Achievement, ApiResult, Guide, SteamGame } from '../shared/types'

export type { Achievement, ApiResult, Guide, SteamGame }

export interface SteamApi {
  getConfig(): Promise<{ apiKey: string; steamId: string; language: string; theme: string }>
  setTheme(theme: string): Promise<boolean>
  saveConfig(cfg: { apiKey: string; steamId: string; language?: string }): Promise<boolean>
  clearConfig(): Promise<boolean>
  saveLanguage(lang: string): Promise<boolean>
  getCurrentGame(): Promise<ApiResult<SteamGame>>
  getGameArt(appId: string): Promise<string | null>
  getAchievements(appId: string): Promise<ApiResult<Achievement[]>>
  searchWeb(appId: string, gameName: string, achievementName: string): Promise<Guide[]>
  fetchGuideContent(url: string, achievementName: string, full?: boolean): Promise<{ success: boolean; content: string }>
  openUrl(url: string): void
  minimize(): void
  close(): void
  toggleTop(): void
  isOnTop(): Promise<boolean>
  onTopChanged(cb: (val: boolean) => void): () => void
  getHotkey(): Promise<string>
  setHotkey(accelerator: string): Promise<boolean>
  onHotkeyChanged(cb: (val: string) => void): () => void
  getFocusHotkey(): Promise<string>
  setFocusHotkey(accelerator: string): Promise<boolean>
  resolveVanity(apiKey: string, vanityUrl: string): Promise<{ success: boolean; steamId?: string; error?: string }>
  getOpacity(): Promise<number>
  setOpacity(value: number): void
  resizeFocus(active: boolean, count: number, height?: number): void
  onFocusToggle(cb: () => void): () => void
  getPinnedAchievements(appId: string): Promise<string[]>
  setPinnedAchievements(appId: string, pins: string[]): Promise<boolean>
  getManualProgress(appId: string): Promise<Record<string, { current: number; max: number }>>
  setManualProgress(appId: string, achApiName: string, current: number, max: number): Promise<boolean>
  deleteManualProgress(appId: string, achApiName: string): Promise<boolean>
  getProgressKeys(): Promise<{ down: string; up: string }>
  setProgressKeys(down: string, up: string): Promise<boolean>
  onProgressAdjust(cb: (delta: number) => void): () => void
}

declare global {
  interface Window {
    steamApi: SteamApi
  }
}
