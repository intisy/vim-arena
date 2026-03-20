import { describe, test, expect, beforeEach } from 'vitest'
import { LocalStorageProvider } from '@/storage/LocalStorageProvider'

describe('LocalStorageProvider', () => {
  let provider: LocalStorageProvider

  beforeEach(() => {
    localStorage.clear()
    provider = new LocalStorageProvider()
  })

  test('set and get a string value', () => {
    provider.set('vim-arena-test', 'hello')
    expect(provider.get<string>('vim-arena-test')).toBe('hello')
  })

  test('set and get an object', () => {
    const obj = { count: 5, active: true }
    provider.set('vim-arena-obj', obj)
    expect(provider.get<typeof obj>('vim-arena-obj')).toEqual(obj)
  })

  test('returns null for missing key', () => {
    expect(provider.get('vim-arena-nonexistent')).toBeNull()
  })

  test('remove deletes a key', () => {
    provider.set('vim-arena-temp', 'data')
    provider.remove('vim-arena-temp')
    expect(provider.get('vim-arena-temp')).toBeNull()
  })

  test('getKeys returns only vim-arena keys', () => {
    localStorage.setItem('other-key', 'value')
    provider.set('vim-arena-lesson-progress', '{}')
    const keys = provider.getKeys()
    expect(keys).toContain('vim-arena-lesson-progress')
    expect(keys).not.toContain('other-key')
  })

  test('clear removes only vim-arena keys', () => {
    localStorage.setItem('other-key', 'value')
    provider.set('vim-arena-lesson-progress', '{}')
    provider.clear()
    expect(provider.get('vim-arena-lesson-progress')).toBeNull()
    expect(localStorage.getItem('other-key')).toBe('value')
  })
})
