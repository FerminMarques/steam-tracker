import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { store } from './store'

export interface GuidePanelPayload {
  title: string
  url: string
  content: string
}

let panel: BrowserWindow | null = null
let opener: BrowserWindow | null = null
let lastData: GuidePanelPayload | null = null

export function openGuidePanel(parent: BrowserWindow, data: GuidePanelPayload): void {
  lastData = data
  opener = parent
  parent.once('closed', () => closeGuidePanel())

  if (!panel) {
    panel = new BrowserWindow({
      width: 400,
      height: 520,
      minWidth: 280,
      minHeight: 220,
      frame: false,
      resizable: true,
      show: false,
      autoHideMenuBar: true,
      backgroundColor: '#13151e',
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false
      }
    })
    // Same level as the overlay so it stays visible in borderless windowed games
    panel.setAlwaysOnTop(true, 'screen-saver')
    panel.on('closed', () => {
      panel = null
      opener?.webContents.send('guide-panel:closed')
    })
    panel.webContents.on('did-finish-load', () => {
      if (panel && lastData) panel.webContents.send('guide-panel:data', lastData)
    })
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      panel.loadURL(process.env['ELECTRON_RENDERER_URL'] + '#guide-panel')
    } else {
      panel.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'guide-panel' })
    }
    panel.once('ready-to-show', () => positionNear(parent))
  } else {
    // Already loaded — push the new guide straight away
    panel.webContents.send('guide-panel:data', data)
    if (!panel.isVisible()) positionNear(parent)
    panel.show()
    return
  }

  panel.once('ready-to-show', () => panel?.show())
}

export function updateGuidePanel(data: GuidePanelPayload): void {
  lastData = data
  panel?.webContents.send('guide-panel:data', data)
}

/** Renderer pulls initial data to avoid the did-finish-load vs listener-registration race */
export function getGuidePanelData(): GuidePanelPayload | null {
  return lastData
}

/** Sticky panels survive focus mode exit; non-sticky ones auto-close */
export function isGuidePanelSticky(): boolean {
  return store.get('guidePanelSticky', 'true') === 'true'
}

export function setGuidePanelSticky(val: boolean): void {
  store.set('guidePanelSticky', String(val))
}

/** Called by the renderer when focus mode is turned off */
export function onGuidePanelFocusExited(): void {
  if (!isGuidePanelSticky()) closeGuidePanel()
}

export function closeGuidePanel(): void {
  if (panel && !panel.isDestroyed()) panel.close()
  panel = null
}

function positionNear(parent: BrowserWindow): void {
  if (!panel || panel.isDestroyed()) return
  const p = parent.getBounds()
  const wa = screen.getDisplayMatching(p).workArea
  const b = panel.getBounds()
  let x = p.x + p.width + 12
  if (x + b.width > wa.x + wa.width) x = p.x - b.width - 12
  x = Math.max(wa.x, Math.min(x, wa.x + wa.width - b.width))
  const y = Math.max(wa.y, Math.min(p.y, wa.y + wa.height - b.height))
  panel.setPosition(Math.round(x), Math.round(y))
}
