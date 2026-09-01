import { BrowserWindow, globalShortcut } from 'electron'
import { store } from './store'

export const DEFAULT_HOTKEY = 'CommandOrControl+Shift+S'
export const DEFAULT_FOCUS_HOTKEY = 'CommandOrControl+Shift+F'
export const DEFAULT_PROGRESS_DOWN = '9'
export const DEFAULT_PROGRESS_UP = '0'

export function registerHotkeys(win: BrowserWindow, overlayAccelerator: string): boolean {
  globalShortcut.unregisterAll()
  let allOk = true
  const tryRegister = (acc: string, handler: () => void): boolean => {
    const ok = globalShortcut.register(acc, handler)
    if (!ok) {
      console.error(`[hotkeys] failed to register "${acc}" — already in use`)
      allOk = false
    }
    return ok
  }
  // Main hotkey: show/hide overlay
  tryRegister(overlayAccelerator, () => {
    if (win.isVisible()) {
      win.hide()
    } else {
      win.showInactive()
    }
  })
  // Focus mode hotkey: toggle without going through renderer
  const focusAccelerator = store.get('focusHotkey', DEFAULT_FOCUS_HOTKEY)
  tryRegister(focusAccelerator, () => {
    win.webContents.send('focus:toggle')
  })
  // Progress +/- hotkeys — single chars are more collision-prone, log but don't fail hard
  const progressDown = store.get('progressDownKey', DEFAULT_PROGRESS_DOWN)
  const progressUp = store.get('progressUpKey', DEFAULT_PROGRESS_UP)
  if (progressDown) {
    tryRegister(progressDown, () => {
      win.webContents.send('progress:adjust', -1)
    })
  }
  if (progressUp) {
    tryRegister(progressUp, () => {
      win.webContents.send('progress:adjust', 1)
    })
  }
  return allOk
}

/** Test whether an accelerator can be registered (leaves shortcuts untouched on return) */
export function canRegisterAccelerator(accelerator: string): boolean {
  globalShortcut.unregisterAll()
  const ok = globalShortcut.register(accelerator, () => {})
  globalShortcut.unregisterAll()
  return ok
}

/**
 * Validate + persist a hotkey and re-register all hotkeys.
 * Returns false (and keeps the previous hotkey) if the accelerator is taken.
 */
export function setStoredHotkey(storeKey: string, accelerator: string): boolean {
  const wins = BrowserWindow.getAllWindows()
  if (!wins.length) return false
  if (!canRegisterAccelerator(accelerator)) {
    registerHotkeys(wins[0], store.get('hotkey', DEFAULT_HOTKEY))
    return false
  }
  store.set(storeKey, accelerator)
  registerHotkeys(wins[0], store.get('hotkey', DEFAULT_HOTKEY))
  return true
}
