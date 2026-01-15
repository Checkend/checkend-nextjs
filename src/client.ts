'use client'

/**
 * Client-side SDK for @checkend/nextjs
 * Wraps @checkend/browser for use in Next.js client components
 */

import type { CheckendUser } from './config'
import { getConfig, isInitialized, shouldIgnoreException, applyBeforeSend } from './config'

// Re-export types
export type { CheckendUser }

// We'll dynamically import @checkend/browser to avoid SSR issues
let browserSdk: typeof import('@checkend/browser') | null = null
let initialized = false

async function getBrowserSdk() {
  if (!browserSdk) {
    browserSdk = await import('@checkend/browser')
  }
  return browserSdk
}

/**
 * Initialize the client-side SDK.
 * This is called automatically by CheckendProvider.
 */
export async function initClient(): Promise<void> {
  if (initialized) return
  if (typeof window === 'undefined') return

  if (!isInitialized()) {
    console.warn(
      '[Checkend] Client SDK initialized before calling init(). ' +
        'Make sure to call init() in instrumentation.ts'
    )
    return
  }

  const config = getConfig()
  if (!config.enableClient) {
    if (config.debug) {
      console.log('[Checkend] Client SDK disabled')
    }
    return
  }

  try {
    const sdk = await getBrowserSdk()
    sdk.default.configure({
      apiKey: config.apiKey,
      endpoint: config.endpoint,
      environment: config.environment,
      ignoredExceptions: config.ignoredExceptions,
      filterKeys: config.filterKeys,
      debug: config.debug,
      beforeNotify: config.beforeSend
        ? [
            (notice) => {
              const result = applyBeforeSend(notice as any)
              return result !== null
            },
          ]
        : undefined,
    })

    initialized = true

    if (config.debug) {
      console.log('[Checkend] Client SDK initialized')
    }
  } catch (error) {
    console.error('[Checkend] Failed to initialize client SDK:', error)
  }
}

/**
 * Report an error to Checkend (async, non-blocking)
 */
export async function notify(
  error: Error,
  options?: {
    context?: Record<string, unknown>
    user?: CheckendUser
    tags?: string[]
    fingerprint?: string
  }
): Promise<void> {
  if (typeof window === 'undefined') return
  if (shouldIgnoreException(error)) return

  try {
    const sdk = await getBrowserSdk()
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
  if (typeof window === 'undefined') return null
  if (shouldIgnoreException(error)) return null

  try {
    const sdk = await getBrowserSdk()
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
export async function setContext(
  context: Record<string, unknown>
): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    const sdk = await getBrowserSdk()
    sdk.setContext(context)
  } catch (e) {
    console.error('[Checkend] Failed to setContext:', e)
  }
}

/**
 * Set the current user
 */
export async function setUser(user: CheckendUser | null): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    const sdk = await getBrowserSdk()
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
export async function clear(): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    const sdk = await getBrowserSdk()
    sdk.clear()
  } catch (e) {
    console.error('[Checkend] Failed to clear:', e)
  }
}
