/**
 * Testing utilities for @checkend/nextjs
 *
 * Provides a test mode that captures notices instead of sending them,
 * making it easy to assert on errors in your tests.
 *
 * @example
 * ```typescript
 * import { setup, teardown, notices, lastNotice, clear } from '@checkend/nextjs/testing'
 *
 * describe('MyComponent', () => {
 *   beforeEach(() => {
 *     setup()
 *   })
 *
 *   afterEach(() => {
 *     teardown()
 *   })
 *
 *   it('reports errors', () => {
 *     // ... trigger an error ...
 *     expect(notices()).toHaveLength(1)
 *     expect(lastNotice()?.errorClass).toBe('ValidationError')
 *   })
 * })
 * ```
 */

import { init, reset, type CheckendNextConfig } from './config'

/**
 * A captured notice from Checkend during test mode
 */
export interface CapturedNotice {
  /** The error class name */
  errorClass: string
  /** The error message */
  message: string
  /** Stack trace lines */
  backtrace: string[]
  /** Additional context */
  context?: Record<string, unknown>
  /** Request information */
  request?: Record<string, unknown>
  /** User information */
  user?: { id: string; email?: string; name?: string; [key: string]: unknown }
  /** Tags for categorization */
  tags?: string[]
  /** Custom fingerprint for grouping */
  fingerprint?: string
  /** When the error occurred */
  occurredAt: Date
  /** Runtime where the error was captured */
  runtime: 'client' | 'server' | 'edge'
}

// Storage for captured notices
let capturedNotices: CapturedNotice[] = []
let isTestMode = false
let originalFetch: typeof globalThis.fetch | null = null

/**
 * Enable test mode. Notices will be captured instead of sent to the server.
 *
 * @param config - Optional configuration overrides for testing
 */
export function setup(config?: Partial<CheckendNextConfig>): void {
  if (isTestMode) {
    console.warn('[Checkend Testing] Already in test mode. Call teardown() first.')
    return
  }

  // Reset any existing configuration
  reset()

  // Initialize with test configuration
  init({
    apiKey: 'test-api-key',
    endpoint: 'https://test.checkend.io',
    environment: 'test',
    debug: false,
    ...config,
  })

  // Clear any existing notices
  capturedNotices = []

  // Mock fetch to intercept API calls
  originalFetch = globalThis.fetch
  globalThis.fetch = createMockFetch()

  isTestMode = true
}

/**
 * Disable test mode and restore normal behavior.
 */
export function teardown(): void {
  if (!isTestMode) {
    return
  }

  // Restore original fetch
  if (originalFetch) {
    globalThis.fetch = originalFetch
    originalFetch = null
  }

  // Reset configuration
  reset()

  // Clear notices
  capturedNotices = []

  isTestMode = false
}

/**
 * Get all captured notices.
 */
export function notices(): readonly CapturedNotice[] {
  assertTestMode()
  return [...capturedNotices]
}

/**
 * Get the most recently captured notice, or undefined if none.
 */
export function lastNotice(): CapturedNotice | undefined {
  assertTestMode()
  return capturedNotices[capturedNotices.length - 1]
}

/**
 * Get the first captured notice, or undefined if none.
 */
export function firstNotice(): CapturedNotice | undefined {
  assertTestMode()
  return capturedNotices[0]
}

/**
 * Get the number of captured notices.
 */
export function noticeCount(): number {
  assertTestMode()
  return capturedNotices.length
}

/**
 * Check if any notices have been captured.
 */
export function hasNotices(): boolean {
  assertTestMode()
  return capturedNotices.length > 0
}

/**
 * Clear all captured notices.
 */
export function clearNotices(): void {
  assertTestMode()
  capturedNotices = []
}

/**
 * Check if test mode is currently active.
 */
export function isActive(): boolean {
  return isTestMode
}

/**
 * Find notices matching a predicate.
 */
export function findNotices(
  predicate: (notice: CapturedNotice) => boolean
): CapturedNotice[] {
  assertTestMode()
  return capturedNotices.filter(predicate)
}

/**
 * Find notices by error class name.
 */
export function findNoticesByClass(errorClass: string): CapturedNotice[] {
  return findNotices((n) => n.errorClass === errorClass)
}

/**
 * Find notices by tag.
 */
export function findNoticesByTag(tag: string): CapturedNotice[] {
  return findNotices((n) => n.tags?.includes(tag) ?? false)
}

/**
 * Find notices by runtime.
 */
export function findNoticesByRuntime(
  runtime: 'client' | 'server' | 'edge'
): CapturedNotice[] {
  return findNotices((n) => n.runtime === runtime)
}

/**
 * Assert that exactly N notices were captured.
 * Throws if the count doesn't match.
 */
export function assertNoticeCount(expected: number): void {
  const actual = noticeCount()
  if (actual !== expected) {
    throw new Error(
      `Expected ${expected} notice(s), but got ${actual}. ` +
        `Notices: ${JSON.stringify(capturedNotices.map((n) => n.errorClass))}`
    )
  }
}

/**
 * Assert that no notices were captured.
 * Throws if any notices exist.
 */
export function assertNoNotices(): void {
  if (hasNotices()) {
    throw new Error(
      `Expected no notices, but got ${noticeCount()}. ` +
        `Notices: ${JSON.stringify(capturedNotices.map((n) => `${n.errorClass}: ${n.message}`))}`
    )
  }
}

// Internal helpers

function assertTestMode(): void {
  if (!isTestMode) {
    throw new Error(
      '[Checkend Testing] Not in test mode. Call setup() first.'
    )
  }
}

function createMockFetch(): typeof globalThis.fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url

    // Intercept Checkend API calls
    if (url.includes('/ingest/') || url.includes('checkend')) {
      try {
        const body = init?.body
        if (body) {
          const payload = JSON.parse(typeof body === 'string' ? body : new TextDecoder().decode(body as ArrayBuffer))

          // Determine runtime from URL or context
          let runtime: 'client' | 'server' | 'edge' = 'server'
          if (typeof window !== 'undefined') {
            runtime = 'client'
          } else if (url.includes('edge') || init?.headers?.toString().includes('edge')) {
            runtime = 'edge'
          }

          const notice: CapturedNotice = {
            errorClass: payload.error_class || payload.errorClass || 'Error',
            message: payload.message || '',
            backtrace: payload.backtrace || [],
            context: payload.context,
            request: payload.request,
            user: payload.user,
            tags: payload.tags,
            fingerprint: payload.fingerprint,
            occurredAt: new Date(),
            runtime,
          }

          capturedNotices.push(notice)
        }
      } catch {
        // Ignore parse errors, still return success
      }

      // Return a successful response
      return new Response(
        JSON.stringify({ id: `test-${Date.now()}-${Math.random().toString(36).slice(2)}` }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Pass through non-Checkend requests to original fetch
    if (originalFetch) {
      return originalFetch(input, init)
    }

    throw new Error('Original fetch not available')
  }
}

/**
 * Manually add a notice for testing purposes.
 * Useful when you want to simulate errors without going through the SDK.
 */
export function addNotice(notice: Partial<CapturedNotice> & { errorClass: string; message: string }): void {
  assertTestMode()
  capturedNotices.push({
    backtrace: [],
    occurredAt: new Date(),
    runtime: 'server',
    ...notice,
  })
}
