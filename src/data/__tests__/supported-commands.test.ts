import { describe, test, expect } from 'vitest'
import { SUPPORTED_VIM_COMMANDS, UNSUPPORTED_VIM_COMMANDS, SUPPORTED_COMMAND_KEYS } from '@/data/supported-commands'

describe('SUPPORTED_VIM_COMMANDS', () => {
  test('has at least 50 commands', () => {
    expect(Object.keys(SUPPORTED_VIM_COMMANDS).length).toBeGreaterThanOrEqual(50)
  })

  test('every command has a non-empty description', () => {
    for (const [key, cmd] of Object.entries(SUPPORTED_VIM_COMMANDS)) {
      expect(cmd.description.length, `${key} missing description`).toBeGreaterThan(0)
    }
  })

  test('every command has a valid category string', () => {
    const validCategories = [
      'basic-movement', 'word-movement', 'line-movement', 'vertical-movement',
      'insert-mode', 'modes', 'editing', 'operators', 'find', 'search',
      'visual', 'text-objects', 'misc'
    ]
    for (const [key, cmd] of Object.entries(SUPPORTED_VIM_COMMANDS)) {
      expect(validCategories, `${key} has invalid category: ${cmd.category}`)
        .toContain(cmd.category)
    }
  })

  test('UNSUPPORTED commands are NOT in the registry', () => {
    for (const badCmd of UNSUPPORTED_VIM_COMMANDS) {
      expect(SUPPORTED_VIM_COMMANDS, `${badCmd} must NOT be in SUPPORTED_VIM_COMMANDS`)
        .not.toHaveProperty(badCmd)
    }
  })

  test('SUPPORTED_COMMAND_KEYS matches registry keys', () => {
    const registryKeys = new Set(Object.keys(SUPPORTED_VIM_COMMANDS))
    expect(SUPPORTED_COMMAND_KEYS.size).toBe(registryKeys.size)
    for (const key of registryKeys) {
      expect(SUPPORTED_COMMAND_KEYS.has(key), `${key} missing from SUPPORTED_COMMAND_KEYS`).toBe(true)
    }
  })

  test('essential commands are present', () => {
    const essential = ['h', 'j', 'k', 'l', 'w', 'e', 'b', 'dd', 'cc', 'yy', 'p', '/', 'n', 'v', 'u', 'Esc']
    for (const cmd of essential) {
      expect(SUPPORTED_VIM_COMMANDS, `Essential command ${cmd} is missing`).toHaveProperty(cmd)
    }
  })

  test('text object commands include common bracket and quote types', () => {
    const textObjects = ['iw', 'aw', 'i"', 'a"', "i'", "a'", 'i{', 'a{', 'i(', 'a(']
    for (const to of textObjects) {
      expect(SUPPORTED_VIM_COMMANDS, `Text object ${to} is missing`).toHaveProperty(to)
    }
  })
})
