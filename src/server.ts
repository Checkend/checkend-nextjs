/**
 * Server-side SDK for @checkend/nextjs
 * Wraps @checkend/node for use in Next.js server components, API routes, and server actions
 */

import type { CheckendUser } from './config'
import { getConfig, isInitialized, shouldIgnoreException, applyBeforeSend } from './config'

// Re-export types
export type { CheckendUser }

// Import the Node SDK
let nodeSdk: typeof import('@checkend/node') | null = null
let initialized = false

function getNodeSdk(): typeof import('@checkend/node') {
  if (!nodeSdk) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    nodeSdk = require('@checkend/node')
  }
  return nodeSdk!
}

/**
 * Initialize the server-side SDK.
 * Call this in instrumentation.ts after init().
 */
export function initServer(): void {
  if (initialized) return

  if (!isInitialized()) {
    console.warn(
      '[Checkend] Server SDK initialized before calling init(). ' +
        'Make sure to call init() first in instrumentation.ts'
    )
    return
  }

  const config = getConfig()
  if (!config.enableServer) {
    if (config.debug) {
      console.log('[Checkend] Server SDK disabled')
    }
    return
  }

  try {
    const sdk = getNodeSdk()
    sdk.default.configure({
      apiKey: config.apiKey,
      endpoint: config.endpoint,
      environment: config.environment,
      ignoredExceptions: config.ignoredExceptions,
      filterKeys: config.filterKeys,
      debug: config.debug,
      // Don't capture process-level errors - Next.js handles these
      captureUncaughtExceptions: false,
      captureUnhandledRejections: false,
      beforeNotify: config.beforeSend
        ? [
            (notice: unknown) => {
              const result = applyBeforeSend(notice as any)
              return result !== null
            },
          ]
        : undefined,
    })

    initialized = true

    if (config.debug) {
      console.log('[Checkend] Server SDK initialized')
    }
  } catch (error) {
    console.error('[Checkend] Failed to initialize server SDK:', error)
  }
}

/**
 * Report an error to Checkend (async, non-blocking)
 */
export function notify(
  error: Error,
  options?: {
    context?: Record<string, unknown>
    user?: CheckendUser
    tags?: string[]
    fingerprint?: string
  }
): void {
  if (shouldIgnoreException(error)) return

  try {
    const sdk = getNodeSdk()
    sdk.notify(error, options)
  } catch (e) {
    console.error('[Checkend] Failed to notify:', e)
  }
}

/**
 * Report an error to Checkend (sync, returns promise)
 */
export async function notifySync(
  error: Error,
  options?: {
    context?: Record<string, unknown>
    user?: CheckendUser
    tags?: string[]
    fingerprint?: string
  }
): Promise<{ id: string } | null> {
  if (shouldIgnoreException(error)) return null

  try {
    const sdk = getNodeSdk()
    const result = await sdk.notifySync(error, options)
    if (result && 'id' in result) {
      return { id: String(result.id) }
    }
    return null
  } catch (e) {
    console.error('[Checkend] Failed to notifySync:', e)
    return null
  }
}

/**
 * Set global context that will be included with all errors
 */
export function setContext(context: Record<string, unknown>): void {
  try {
    const sdk = getNodeSdk()
    sdk.setContext(context)
  } catch (e) {
    console.error('[Checkend] Failed to setContext:', e)
  }
}

/**
 * Set the current user
 */
export function setUser(user: CheckendUser | null): void {
  try {
    const sdk = getNodeSdk()
    if (user) {
      sdk.setUser(user)
    } else {
      sdk.clear()
    }
  } catch (e) {
    console.error('[Checkend] Failed to setUser:', e)
  }
}

/**
 * Clear all context and user data
 */
export function clear(): void {
  try {
    const sdk = getNodeSdk()
    sdk.clear()
  } catch (e) {
    console.error('[Checkend] Failed to clear:', e)
  }
}

/**
 * Run a function with isolated context (using AsyncLocalStorage)
 */
export function runWithContext<T>(fn: () => T): T {
  try {
    const sdk = getNodeSdk()
    return sdk.runWithContext(fn)
  } catch (e) {
    console.error('[Checkend] Failed to runWithContext:', e)
    return fn()
  }
}

/**
 * Flush pending notices and wait for them to be sent
 */
export async function flush(): Promise<void> {
  try {
    const sdk = getNodeSdk()
    await sdk.default.flush()
  } catch (e) {
    console.error('[Checkend] Failed to flush:', e)
  }
}
