import { BrowserWindow, screen, shell } from 'electron'
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
  const display = screen.getDisplayMatching(win.getBounds())
  if (active) {
    // Compact focus mode — prefer the renderer-measured content height
    const fallback = Math.min(400, 28 + count * 42 + Math.max(0, count - 1) * 2 + 12)
    // Allow the window to grow with expanded guides (capped at 85% of the work area)
    const maxH = Math.floor(display.workAreaSize.height * 0.85)
    const h = Math.max(120, Math.min(height ?? fallback, maxH))
    win.setMinimumSize(280, 80)
    // No animate: instant resize so expanded guide content appears directly
    win.setSize(380, h + 2)
  } else {
    win.setMinimumSize(380, 500)
    // Keep window within current display workArea
    const targetW = 440, targetH = 680
    win.setSize(targetW, targetH, true)
    // Ensure it stays on-screen after language/layout changes
    const bounds = win.getBounds()
    const wa = display.workArea
    if (bounds.x + bounds.width > wa.x + wa.width || bounds.y + bounds.height > wa.y + wa.height) {
      win.setPosition(Math.max(wa.x, Math.min(bounds.x, wa.x + wa.width - targetW)), Math.max(wa.y, Math.min(bounds.y, wa.y + wa.height - targetH)))
    }
  }
}
