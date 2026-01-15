/**
 * Instrumentation helpers for Next.js instrumentation.ts
 */

import { init, CheckendNextConfig } from '../config'
import { initServer } from '../server'

/**
 * Register Checkend in your Next.js instrumentation.ts file.
 *
 * @example
 * ```typescript
 * // instrumentation.ts
 * export async function register() {
 *   const { register } = await import('@checkend/nextjs')
 *   register({
 *     apiKey: process.env.CHECKEND_API_KEY!,
 *   })
 * }
 * ```
 */
export function register(config: CheckendNextConfig): void {
  // Initialize shared config
  init(config)

  // Initialize the appropriate SDK based on runtime
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    initServer()
  }
  // Edge runtime uses lightweight SDK, initialized per-request
}

/**
 * Error handler for Next.js onRequestError hook.
 * Use this in instrumentation.ts to capture unhandled request errors.
 *
 * @example
 * ```typescript
 * // instrumentation.ts
 * import { register, onRequestError } from '@checkend/nextjs'
 *
 * export { onRequestError }
 *
 * export async function register() {
 *   register({ apiKey: process.env.CHECKEND_API_KEY! })
 * }
 * ```
 */
export async function onRequestError(
  error: Error,
  request: {
    path: string
    method: string
    headers: { [key: string]: string }
  },
  context: {
    routerKind: 'Pages Router' | 'App Router'
    routePath: string
    routeType: 'render' | 'route' | 'action' | 'middleware'
    renderSource?: 'react-server-components' | 'react-server-components-payload'
    revalidateReason?: 'on-demand' | 'stale' | undefined
    renderType?: 'dynamic' | 'dynamic-resume'
  }
): Promise<void> {
  // Dynamic import to handle both Node.js and Edge runtimes
  if (process.env.NEXT_RUNTIME === 'edge') {
    const { notify } = await import('../edge')
    await notify(error, {
      context: {
        routerKind: context.routerKind,
        routePath: context.routePath,
        routeType: context.routeType,
        renderSource: context.renderSource,
        revalidateReason: context.revalidateReason,
        renderType: context.renderType,
      },
    })
  } else {
    const { notify } = await import('../server')
    notify(error, {
      context: {
        path: request.path,
        method: request.method,
        routerKind: context.routerKind,
        routePath: context.routePath,
        routeType: context.routeType,
        renderSource: context.renderSource,
        revalidateReason: context.revalidateReason,
        renderType: context.renderType,
      },
    })
  }
}
