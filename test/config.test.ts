import { describe, it, expect, beforeEach } from 'vitest'
import {
  init,
  getConfig,
  isInitialized,
  reset,
  shouldIgnoreRoute,
  shouldIgnoreException,
  getFilterKeys,
  applyBeforeSend,
  sanitize,
  DEFAULT_FILTER_KEYS,
} from '../src/config'

describe('config', () => {
  beforeEach(() => {
    reset()
  })

  describe('init', () => {
    it('initializes with required apiKey', () => {
      const config = init({ apiKey: 'test-key' })
      expect(config.apiKey).toBe('test-key')
    })

    it('throws if apiKey is missing', () => {
      expect(() => init({ apiKey: '' })).toThrow('apiKey is required')
    })

    it('sets default values', () => {
      const config = init({ apiKey: 'test-key' })
      expect(config.enableClient).toBe(true)
      expect(config.enableServer).toBe(true)
      expect(config.enableEdge).toBe(true)
      expect(config.debug).toBe(false)
      expect(config.useDefaultFilterKeys).toBe(true)
      expect(config.timeout).toBe(30000)
      expect(config.connectTimeout).toBe(10000)
      expect(config.maxQueueSize).toBe(1000)
      expect(config.shutdownTimeout).toBe(5000)
    })

    it('allows overriding defaults', () => {
      const config = init({
        apiKey: 'test-key',
        enableClient: false,
        enableServer: false,
        debug: true,
        timeout: 60000,
        maxQueueSize: 500,
      })
      expect(config.enableClient).toBe(false)
      expect(config.enableServer).toBe(false)
      expect(config.debug).toBe(true)
      expect(config.timeout).toBe(60000)
      expect(config.maxQueueSize).toBe(500)
    })

    it('accepts appName and revision', () => {
      const config = init({
        apiKey: 'test-key',
        appName: 'my-app',
        revision: 'abc123',
      })
      expect(config.appName).toBe('my-app')
      expect(config.revision).toBe('abc123')
    })
  })

  describe('getConfig', () => {
    it('returns config after initialization', () => {
      init({ apiKey: 'test-key' })
      const config = getConfig()
      expect(config.apiKey).toBe('test-key')
    })

    it('throws if not initialized', () => {
      expect(() => getConfig()).toThrow('Checkend not initialized')
    })
  })

  describe('isInitialized', () => {
    it('returns false before init', () => {
      expect(isInitialized()).toBe(false)
    })

    it('returns true after init', () => {
      init({ apiKey: 'test-key' })
      expect(isInitialized()).toBe(true)
    })

    it('returns false after reset', () => {
      init({ apiKey: 'test-key' })
      reset()
      expect(isInitialized()).toBe(false)
    })
  })

  describe('shouldIgnoreRoute', () => {
    it('returns false when no ignored routes configured', () => {
      init({ apiKey: 'test-key' })
      expect(shouldIgnoreRoute('/api/users')).toBe(false)
    })

    it('ignores exact string matches', () => {
      init({
        apiKey: 'test-key',
        ignoredRoutes: ['/health', '/api/internal'],
      })
      expect(shouldIgnoreRoute('/health')).toBe(true)
      expect(shouldIgnoreRoute('/api/internal')).toBe(true)
      expect(shouldIgnoreRoute('/api/users')).toBe(false)
    })

    it('ignores prefix matches', () => {
      init({
        apiKey: 'test-key',
        ignoredRoutes: ['/api/internal'],
      })
      expect(shouldIgnoreRoute('/api/internal/health')).toBe(true)
      expect(shouldIgnoreRoute('/api/users')).toBe(false)
    })

    it('ignores regex matches', () => {
      init({
        apiKey: 'test-key',
        ignoredRoutes: [/^\/api\/v\d+\/internal/],
      })
      expect(shouldIgnoreRoute('/api/v1/internal/health')).toBe(true)
      expect(shouldIgnoreRoute('/api/v2/internal/status')).toBe(true)
      expect(shouldIgnoreRoute('/api/v1/users')).toBe(false)
    })
  })

  describe('shouldIgnoreException', () => {
    it('returns false when no ignored exceptions configured', () => {
      init({ apiKey: 'test-key' })
      const error = new Error('Test error')
      expect(shouldIgnoreException(error)).toBe(false)
    })

    it('ignores by error name', () => {
      init({
        apiKey: 'test-key',
        ignoredExceptions: ['TypeError', 'SyntaxError'],
      })
      const typeError = new TypeError('Invalid type')
      const syntaxError = new SyntaxError('Unexpected token')
      const error = new Error('Generic error')

      expect(shouldIgnoreException(typeError)).toBe(true)
      expect(shouldIgnoreException(syntaxError)).toBe(true)
      expect(shouldIgnoreException(error)).toBe(false)
    })

    it('ignores by message content', () => {
      init({
        apiKey: 'test-key',
        ignoredExceptions: ['ECONNRESET', 'timeout'],
      })
      const connectionError = new Error('ECONNRESET: Connection reset')
      const timeoutError = new Error('Request timeout after 30s')
      const error = new Error('Generic error')

      expect(shouldIgnoreException(connectionError)).toBe(true)
      expect(shouldIgnoreException(timeoutError)).toBe(true)
      expect(shouldIgnoreException(error)).toBe(false)
    })

    it('ignores by regex pattern', () => {
      init({
        apiKey: 'test-key',
        ignoredExceptions: [/^Error: ECONNRE/],
      })
      const resetError = new Error('ECONNRESET')
      const refusedError = new Error('ECONNREFUSED')
      const error = new Error('Generic error')

      expect(shouldIgnoreException(resetError)).toBe(true)
      expect(shouldIgnoreException(refusedError)).toBe(true)
      expect(shouldIgnoreException(error)).toBe(false)
    })
  })

  describe('getFilterKeys', () => {
    it('returns default filter keys', () => {
      init({ apiKey: 'test-key' })
      const keys = getFilterKeys()
      expect(keys).toContain('password')
      expect(keys).toContain('apiKey')
      expect(keys).toContain('creditCard')
      expect(keys).toContain('ssn')
    })

    it('merges custom filter keys with defaults', () => {
      init({
        apiKey: 'test-key',
        filterKeys: ['customSecret', 'internalToken'],
      })
      const keys = getFilterKeys()
      expect(keys).toContain('password')
      expect(keys).toContain('customSecret')
      expect(keys).toContain('internalToken')
    })

    it('uses only custom keys when useDefaultFilterKeys is false', () => {
      init({
        apiKey: 'test-key',
        filterKeys: ['onlyThis'],
        useDefaultFilterKeys: false,
      })
      const keys = getFilterKeys()
      expect(keys).toEqual(['onlyThis'])
      expect(keys).not.toContain('password')
    })
  })

  describe('applyBeforeSend', () => {
    it('returns event unchanged when no callback', () => {
      init({ apiKey: 'test-key' })
      const event = { errorClass: 'Error', message: 'test', backtrace: [] }
      expect(applyBeforeSend(event)).toEqual(event)
    })

    it('applies single callback', () => {
      init({
        apiKey: 'test-key',
        beforeSend: (event) => ({ ...event, message: 'modified' }),
      })
      const event = { errorClass: 'Error', message: 'original', backtrace: [] }
      expect(applyBeforeSend(event)?.message).toBe('modified')
    })

    it('applies multiple callbacks in order', () => {
      init({
        apiKey: 'test-key',
        beforeSend: [
          (event) => ({ ...event, message: event.message + '1' }),
          (event) => ({ ...event, message: event.message + '2' }),
        ],
      })
      const event = { errorClass: 'Error', message: 'msg', backtrace: [] }
      expect(applyBeforeSend(event)?.message).toBe('msg12')
    })

    it('returns null when callback returns null', () => {
      init({
        apiKey: 'test-key',
        beforeSend: () => null,
      })
      const event = { errorClass: 'Error', message: 'test', backtrace: [] }
      expect(applyBeforeSend(event)).toBeNull()
    })

    it('stops processing when callback returns null', () => {
      let secondCalled = false
      init({
        apiKey: 'test-key',
        beforeSend: [
          () => null,
          () => {
            secondCalled = true
            return null
          },
        ],
      })
      const event = { errorClass: 'Error', message: 'test', backtrace: [] }
      applyBeforeSend(event)
      expect(secondCalled).toBe(false)
    })
  })

  describe('sanitize', () => {
    beforeEach(() => {
      init({ apiKey: 'test-key' })
    })

    it('filters sensitive keys', () => {
      const data = {
        username: 'john',
        password: 'secret123',
        email: 'john@example.com',
      }
      const result = sanitize(data)
      expect(result.username).toBe('john')
      expect(result.password).toBe('[FILTERED]')
      expect(result.email).toBe('john@example.com')
    })

    it('filters nested objects', () => {
      const data = {
        user: {
          name: 'john',
          apiKey: 'key123',
        },
      }
      const result = sanitize(data)
      expect(result.user.name).toBe('john')
      expect(result.user.apiKey).toBe('[FILTERED]')
    })

    it('filters arrays', () => {
      const data = {
        items: [
          { id: 1, token: 'abc' },
          { id: 2, token: 'def' },
        ],
      }
      const result = sanitize(data)
      expect(result.items[0].id).toBe(1)
      expect(result.items[0].token).toBe('[FILTERED]')
      expect(result.items[1].token).toBe('[FILTERED]')
    })

    it('truncates long strings', () => {
      const longString = 'a'.repeat(15000)
      const data = { content: longString }
      const result = sanitize(data)
      expect(result.content.length).toBeLessThan(15000)
      expect(result.content).toContain('[TRUNCATED]')
    })

    it('handles max depth', () => {
      let deepData: Record<string, unknown> = { value: 'deep' }
      for (let i = 0; i < 15; i++) {
        deepData = { nested: deepData }
      }
      const result = sanitize(deepData)
      // Should not throw, and deep values should be replaced
      expect(JSON.stringify(result)).toContain('[MAX_DEPTH]')
    })

    it('handles null and undefined', () => {
      const data = { a: null, b: undefined, c: 'value' }
      const result = sanitize(data)
      expect(result.a).toBeNull()
      expect(result.b).toBeUndefined()
      expect(result.c).toBe('value')
    })
  })

  describe('DEFAULT_FILTER_KEYS', () => {
    it('contains common sensitive keys', () => {
      expect(DEFAULT_FILTER_KEYS).toContain('password')
      expect(DEFAULT_FILTER_KEYS).toContain('secret')
      expect(DEFAULT_FILTER_KEYS).toContain('token')
      expect(DEFAULT_FILTER_KEYS).toContain('apiKey')
      expect(DEFAULT_FILTER_KEYS).toContain('creditCard')
      expect(DEFAULT_FILTER_KEYS).toContain('ssn')
      expect(DEFAULT_FILTER_KEYS).toContain('authorization')
    })
  })
})
