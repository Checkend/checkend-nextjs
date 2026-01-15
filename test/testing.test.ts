import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  setup,
  teardown,
  notices,
  lastNotice,
  firstNotice,
  noticeCount,
  hasNotices,
  clearNotices,
  isActive,
  findNotices,
  findNoticesByClass,
  findNoticesByTag,
  assertNoticeCount,
  assertNoNotices,
  addNotice,
} from '../src/testing'

describe('Testing Utilities', () => {
  afterEach(() => {
    if (isActive()) {
      teardown()
    }
  })

  describe('setup/teardown', () => {
    it('enables test mode', () => {
      expect(isActive()).toBe(false)
      setup()
      expect(isActive()).toBe(true)
    })

    it('disables test mode on teardown', () => {
      setup()
      teardown()
      expect(isActive()).toBe(false)
    })

    it('allows custom configuration', () => {
      setup({
        apiKey: 'custom-key',
        environment: 'staging',
      })
      expect(isActive()).toBe(true)
    })

    it('warns if already in test mode', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      setup()
      setup() // Should warn
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Already in test mode'))
      warnSpy.mockRestore()
    })
  })

  describe('notice capture', () => {
    beforeEach(() => {
      setup()
    })

    it('starts with no notices', () => {
      expect(notices()).toHaveLength(0)
      expect(hasNotices()).toBe(false)
    })

    it('captures manually added notices', () => {
      addNotice({ errorClass: 'TestError', message: 'Test message' })
      expect(notices()).toHaveLength(1)
      expect(hasNotices()).toBe(true)
    })

    it('returns the last notice', () => {
      addNotice({ errorClass: 'First', message: 'First' })
      addNotice({ errorClass: 'Second', message: 'Second' })
      expect(lastNotice()?.errorClass).toBe('Second')
    })

    it('returns the first notice', () => {
      addNotice({ errorClass: 'First', message: 'First' })
      addNotice({ errorClass: 'Second', message: 'Second' })
      expect(firstNotice()?.errorClass).toBe('First')
    })

    it('returns notice count', () => {
      addNotice({ errorClass: 'Error1', message: 'msg' })
      addNotice({ errorClass: 'Error2', message: 'msg' })
      addNotice({ errorClass: 'Error3', message: 'msg' })
      expect(noticeCount()).toBe(3)
    })

    it('clears notices', () => {
      addNotice({ errorClass: 'Error', message: 'msg' })
      clearNotices()
      expect(notices()).toHaveLength(0)
    })
  })

  describe('finding notices', () => {
    beforeEach(() => {
      setup()
      addNotice({ errorClass: 'ValidationError', message: 'Invalid input', tags: ['validation', 'user-input'] })
      addNotice({ errorClass: 'NetworkError', message: 'Connection failed', tags: ['network'] })
      addNotice({ errorClass: 'ValidationError', message: 'Missing field', tags: ['validation'] })
    })

    it('finds notices by predicate', () => {
      const found = findNotices((n) => n.message.includes('Invalid'))
      expect(found).toHaveLength(1)
      expect(found[0].message).toBe('Invalid input')
    })

    it('finds notices by class', () => {
      const found = findNoticesByClass('ValidationError')
      expect(found).toHaveLength(2)
    })

    it('finds notices by tag', () => {
      const found = findNoticesByTag('validation')
      expect(found).toHaveLength(2)
    })
  })

  describe('assertions', () => {
    beforeEach(() => {
      setup()
    })

    it('assertNoticeCount passes when count matches', () => {
      addNotice({ errorClass: 'Error', message: 'msg' })
      addNotice({ errorClass: 'Error', message: 'msg' })
      expect(() => assertNoticeCount(2)).not.toThrow()
    })

    it('assertNoticeCount fails when count does not match', () => {
      addNotice({ errorClass: 'Error', message: 'msg' })
      expect(() => assertNoticeCount(2)).toThrow(/Expected 2 notice/)
    })

    it('assertNoNotices passes when no notices', () => {
      expect(() => assertNoNotices()).not.toThrow()
    })

    it('assertNoNotices fails when notices exist', () => {
      addNotice({ errorClass: 'Error', message: 'msg' })
      expect(() => assertNoNotices()).toThrow(/Expected no notices/)
    })
  })

  describe('error handling', () => {
    it('throws when accessing notices without setup', () => {
      expect(() => notices()).toThrow(/Not in test mode/)
    })

    it('throws when clearing notices without setup', () => {
      expect(() => clearNotices()).toThrow(/Not in test mode/)
    })
  })
})
