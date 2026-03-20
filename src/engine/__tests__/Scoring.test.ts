import { describe, test, expect } from 'vitest'
import { calculateEfficiency, calculateSpeedScore, calculateTotalScore } from '../Scoring'

describe('Scoring', () => {
  describe('calculateEfficiency', () => {
    test('perfect efficiency (actual === reference) = 100', () => {
      expect(calculateEfficiency(3, 3)).toBe(100)
    })
    test('fewer keystrokes than reference caps at 100', () => {
      expect(calculateEfficiency(2, 3)).toBe(100)
    })
    test('double keystrokes = 50 efficiency', () => {
      expect(calculateEfficiency(6, 3)).toBe(50)
    })
    test('triple keystrokes = 33 efficiency', () => {
      expect(calculateEfficiency(9, 3)).toBe(33)
    })
    test('zero actual keystrokes = 0', () => {
      expect(calculateEfficiency(0, 3)).toBe(0)
    })
    test('negative actual keystrokes = 0', () => {
      expect(calculateEfficiency(-1, 3)).toBe(0)
    })
  })

  describe('calculateSpeedScore', () => {
    test('speed score 100 when no time used', () => {
      expect(calculateSpeedScore(0, 10)).toBe(100)
    })
    test('speed score 50 at time limit', () => {
      expect(calculateSpeedScore(10, 10)).toBe(50)
    })
    test('speed score 75 at half time limit', () => {
      expect(calculateSpeedScore(5, 10)).toBe(75)
    })
    test('speed score 0 when double time limit', () => {
      expect(calculateSpeedScore(20, 10)).toBe(0)
    })
    test('speed score 0 when timeLimit is 0', () => {
      expect(calculateSpeedScore(5, 0)).toBe(0)
    })
    test('speed score 25 at 1.5x time limit', () => {
      expect(calculateSpeedScore(15, 10)).toBe(25)
    })
  })

  describe('calculateTotalScore', () => {
    test('total score 100 when both perfect', () => {
      expect(calculateTotalScore(100, 100)).toBe(100)
    })
    test('total score = 60% efficiency + 40% speed', () => {
      expect(calculateTotalScore(100, 50)).toBe(80) // 60 + 20
      expect(calculateTotalScore(50, 100)).toBe(70) // 30 + 40
    })
    test('total score 0 when both zero', () => {
      expect(calculateTotalScore(0, 0)).toBe(0)
    })
  })
})
