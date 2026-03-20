import { describe, test, expect } from 'vitest'
import { themes, defaultTheme } from '@/themes'
import type { Theme } from '@/themes/types'

const REQUIRED_COLOR_KEYS: (keyof Theme['colors'])[] = [
  'background', 'foreground', 'primary', 'secondary', 'accent',
  'muted', 'mutedForeground', 'border',
  'editorBg', 'editorFg', 'editorCursor', 'editorSelection', 'editorGutter',
  'success', 'error', 'warning'
]

describe('Themes', () => {
  test('has exactly 4 themes', () => {
    expect(themes).toHaveLength(4)
  })

  test('all theme classNames are unique', () => {
    const classNames = themes.map(t => t.className)
    expect(new Set(classNames).size).toBe(themes.length)
  })

  test('defaultTheme exists in themes array', () => {
    expect(themes.some(t => t.className === defaultTheme)).toBe(true)
  })

  test.each(themes.map(t => [t.name, t] as [string, Theme]))(
    '%s defines all required color keys',
    (_name, theme) => {
      for (const key of REQUIRED_COLOR_KEYS) {
        expect(theme.colors[key], `Missing key: ${key}`).toBeDefined()
        expect(theme.colors[key]).toMatch(/^#[0-9a-fA-F]{3,8}$/)
      }
    }
  )

  test('all themes have non-empty name and className', () => {
    for (const theme of themes) {
      expect(theme.name.length).toBeGreaterThan(0)
      expect(theme.className.length).toBeGreaterThan(0)
    }
  })
})
