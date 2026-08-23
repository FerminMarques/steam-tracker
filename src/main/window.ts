import { BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { store } from './store'
import { registerHotkeys, DEFAULT_HOTKEY } from './hotkeys'

export function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 440,
    height: 680,
    minWidth: 380,
    minHeight: 500,
    frame: false,
    transparent: true,
    resizable: true,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    // Pin on top by default
    mainWindow.setAlwaysOnTop(true, 'screen-saver')
    mainWindow.show()
    // Notify renderer of initial pin state (may have mounted before ready-to-show)
    mainWindow.webContents.send('window:top-changed', true)
    // Register hotkeys once window is ready
    registerHotkeys(mainWindow, store.get('hotkey', DEFAULT_HOTKEY))
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

export function focusResize(e: Electron.IpcMainEvent, { active, count, height }: { active: boolean; count: number; height?: number }): void {
  const win = BrowserWindow.fromWebContents(e.sender)
  if (!win) return
  if (active) {
    // Compact focus mode — prefer the renderer-measured content height
    const fallback = Math.min(400, 28 + count * 42 + Math.max(0, count - 1) * 2 + 12)
    const h = Math.max(120, Math.min(height ?? fallback, 600))
    win.setMinimumSize(280, 80)
    win.setSize(380, h + 2, true)
  } else {
    win.setMinimumSize(380, 500)
    win.setSize(440, 680, true)
  }
}
