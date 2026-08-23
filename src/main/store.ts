import { join } from 'path'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'

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
    writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8')
  }
}

export const store = new ConfigStore()
