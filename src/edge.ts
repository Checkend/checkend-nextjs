/**
 * Edge runtime SDK for @checkend/nextjs
 * Lightweight implementation using only fetch (no Node.js APIs)
 * For use in Next.js middleware and edge functions
 */

import type { CheckendUser, CheckendEvent } from './config'
import { getConfig, isInitialized, shouldIgnoreException, applyBeforeSend } from './config'

// Re-export types
export type { CheckendUser, CheckendEvent }

interface EdgeNotice {
  error_class: string
  message: string
  backtrace: Array<{
    file: string
    method: string
    number: number
  }>
  context?: Record<string, unknown>
  request?: {
    url: string
    method: string
    headers: Record<string, string>
    user_agent?: string
  }
  user?: CheckendUser
  tags?: string[]
  fingerprint?: string
  notifier: {
    name: string
    version: string
    url: string
  }
}

/**
 * Parse a stack trace string into structured backtrace
 */
function parseStackTrace(
  stack: string | undefined
): Array<{ file: string; method: string; number: number }> {
  if (!stack) return []

  const lines = stack.split('\n').slice(1) // Skip the error message line
  const backtrace: Array<{ file: string; method: string; number: number }> = []

  for (const line of lines) {
    // Match patterns like "at functionName (file:line:col)" or "at file:line:col"
    const match = line.match(/at\s+(?:(.+?)\s+\()?(.+?):(\d+)(?::\d+)?\)?/)
    if (match) {
      backtrace.push({
        method: match[1] || '<anonymous>',
        file: match[2] || '<unknown>',
        number: parseInt(match[3], 10) || 0,
      })
    }
  }

  return backtrace
}

/**
 * Filter sensitive data from headers
 */
function filterHeaders(
  headers: Headers,
  filterKeys: string[] = []
): Record<string, string> {
  const sensitiveKeys = [
    'authorization',
    'cookie',
    'x-api-key',
    'x-auth-token',
    ...filterKeys.map((k) => k.toLowerCase()),
  ]

  const filtered: Record<string, string> = {}

  headers.forEach((value, key) => {
    if (sensitiveKeys.includes(key.toLowerCase())) {
      filtered[key] = '[FILTERED]'
    } else {
      filtered[key] = value
    }
  })

  return filtered
}

/**
 * Report an error to Checkend from Edge runtime
 */
export async function notify(
  error: Error,
  options?: {
    context?: Record<string, unknown>
    request?: Request
    user?: CheckendUser
    tags?: string[]
    fingerprint?: string
  }
): Promise<void> {
  if (!isInitialized()) {
    console.warn('[Checkend] Edge SDK: not initialized')
    return
  }

  if (shouldIgnoreException(error)) return

  const config = getConfig()
  if (!config.enableEdge) {
    if (config.debug) {
      console.log('[Checkend] Edge SDK disabled, skipping notification')
    }
    return
  }

  const endpoint = config.endpoint || 'https://app.checkend.io'

  const notice: EdgeNotice = {
    error_class: error.name,
    message: error.message,
    backtrace: parseStackTrace(error.stack),
    context: options?.context,
    user: options?.user,
    tags: options?.tags,
    fingerprint: options?.fingerprint,
    notifier: {
      name: '@checkend/nextjs',
      version: '0.1.0',
      url: 'https://github.com/Checkend/checkend-nextjs',
    },
  }

  if (options?.request) {
    const url = new URL(options.request.url)
    notice.request = {
      url: `${url.pathname}${url.search}`,
      method: options.request.method,
      headers: filterHeaders(options.request.headers, config.filterKeys),
      user_agent: options.request.headers.get('user-agent') || undefined,
    }
  }

  // Apply beforeSend callbacks
  if (config.beforeSend) {
    const event: CheckendEvent = {
      errorClass: notice.error_class,
      message: notice.message,
      backtrace: notice.backtrace.map(
        (b) => `${b.file}:${b.number}:in \`${b.method}\``
      ),
      context: notice.context,
      user: notice.user,
      tags: notice.tags,
      fingerprint: notice.fingerprint,
    }

    const result = applyBeforeSend(event)
    if (result === null) {
      if (config.debug) {
        console.log('[Checkend] Edge: beforeSend returned null, skipping')
      }
      return
    }
  }

  try {
    const response = await fetch(`${endpoint}/ingest/v1/errors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Checkend-Ingestion-Key': config.apiKey,
      },
      body: JSON.stringify(notice),
    })

    if (config.debug) {
      console.log('[Checkend] Edge: sent notification, status:', response.status)
    }
  } catch (e) {
    // Silently fail - don't crash the edge function
    if (config.debug) {
      console.error('[Checkend] Edge: failed to send notification:', e)
    }
  }
}

/**
 * Report an error and wait for confirmation
 */
export async function notifySync(
  error: Error,
  options?: {
    context?: Record<string, unknown>
    request?: Request
    user?: CheckendUser
    tags?: string[]
    fingerprint?: string
  }
): Promise<{ id: string } | null> {
  if (!isInitialized()) {
    console.warn('[Checkend] Edge SDK: not initialized')
    return null
  }

  if (shouldIgnoreException(error)) return null

  const config = getConfig()
  if (!config.enableEdge) return null

  const endpoint = config.endpoint || 'https://app.checkend.io'

  const notice: EdgeNotice = {
    error_class: error.name,
    message: error.message,
    backtrace: parseStackTrace(error.stack),
    context: options?.context,
    user: options?.user,
    tags: options?.tags,
    fingerprint: options?.fingerprint,
    notifier: {
      name: '@checkend/nextjs',
      version: '0.1.0',
      url: 'https://github.com/Checkend/checkend-nextjs',
    },
  }

  if (options?.request) {
    const url = new URL(options.request.url)
    notice.request = {
      url: `${url.pathname}${url.search}`,
      method: options.request.method,
      headers: filterHeaders(options.request.headers, config.filterKeys),
      user_agent: options.request.headers.get('user-agent') || undefined,
    }
  }

  try {
    const response = await fetch(`${endpoint}/ingest/v1/errors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Checkend-Ingestion-Key': config.apiKey,
      },
      body: JSON.stringify(notice),
    })

    if (response.ok) {
      const data = await response.json()
      return { id: data.id || 'unknown' }
    }

    return null
  } catch (e) {
    if (config.debug) {
      console.error('[Checkend] Edge: failed to send notification:', e)
    }
    return null
  }
}
