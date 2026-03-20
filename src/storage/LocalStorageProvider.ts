import type { IStorageProvider } from './types'

export class LocalStorageProvider implements IStorageProvider {
  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key)
      if (item === null) return null
      return JSON.parse(item) as T
    } catch {
      return null
    }
  }

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // localStorage may be unavailable (private browsing, quota exceeded)
    }
  }

  remove(key: string): void {
    try {
      localStorage.removeItem(key)
    } catch {
      // ignore
    }
  }

  clear(): void {
    try {
      // Only clear our own keys (prefix filter)
      const keysToRemove = this.getKeys()
      keysToRemove.forEach(key => localStorage.removeItem(key))
    } catch {
      // ignore
    }
  }

  getKeys(): string[] {
    try {
      return Object.keys(localStorage).filter(k => k.startsWith('vim-arena-'))
    } catch {
      return []
    }
  }
}

export const storageProvider = new LocalStorageProvider()
