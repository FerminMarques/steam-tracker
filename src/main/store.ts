import { join } from 'path'
import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'fs'

// Simple fs-based config store (avoids ESM/CJS compatibility issues)
export class ConfigStore {
  private filePath!: string
  private data: Record<string, string> = {}

  init(userDataPath: string): void {
    mkdirSync(userDataPath, { recursive: true })
    this.filePath = join(userDataPath, 'config.json')
    try {
      this.data = JSON.parse(readFileSync(this.filePath, 'utf-8'))
    } catch {
      this.data = {}
    }
  }

  get(key: string, fallback = ''): string {
    return this.data[key] ?? fallback
  }

  set(key: string, value: string): void {
    this.data[key] = value
    this.flush()
  }

  /** Write several keys with a single disk write */
  setMany(entries: Record<string, string>): void {
    Object.assign(this.data, entries)
    this.flush()
  }

  private flush(): void {
    if (!this.filePath) return
    const tmp = `${this.filePath}.tmp`
    try {
      writeFileSync(tmp, JSON.stringify(this.data, null, 2), 'utf-8')
      renameSync(tmp, this.filePath)
    } catch (err) {
      console.error('[store] flush failed:', err)
      // best-effort fallback directly to target
      try {
        writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8')
      } catch {}
    }
  }
}

export const store = new ConfigStore()
