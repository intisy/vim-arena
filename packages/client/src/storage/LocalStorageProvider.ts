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
    }
  }

  remove(key: string): void {
    try {
      localStorage.removeItem(key)
    } catch {
    }
  }

  clear(): void {
    try {
      const keysToRemove = this.getKeys()
      keysToRemove.forEach(key => localStorage.removeItem(key))
    } catch {
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
