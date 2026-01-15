/**
 * Route handler wrapper for Next.js App Router API routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { notify, runWithContext } from '../server'
import { shouldIgnoreRoute } from '../config'

type RouteHandler = (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => NextResponse | Response | Promise<NextResponse | Response>

interface WrapOptions {
  /**
   * Additional context to include with error reports
   */
  context?: Record<string, unknown>
  /**
   * Tags to include with error reports
   */
  tags?: string[]
}

/**
 * Wrap a route handler to automatically report errors to Checkend.
 *
 * @example
 * ```typescript
 * // app/api/users/route.ts
 * import { NextRequest, NextResponse } from 'next/server'
 * import { withCheckendRoute } from '@checkend/nextjs'
 *
 * async function handler(request: NextRequest) {
 *   const users = await db.users.findMany()
 *   return NextResponse.json(users)
 * }
 *
 * export const GET = withCheckendRoute(handler, {
 *   tags: ['api', 'users'],
 * })
 * ```
 */
export function withCheckendRoute(
  handler: RouteHandler,
  options?: WrapOptions
): RouteHandler {
  return async (request: NextRequest, routeContext) => {
    const url = new URL(request.url)
    const pathname = url.pathname

    // Check if this route should be ignored
    if (shouldIgnoreRoute(pathname)) {
      return handler(request, routeContext)
    }

    return runWithContext(async () => {
      try {
        return await handler(request, routeContext)
      } catch (error) {
        if (error instanceof Error) {
          // Resolve params if available
          let params: Record<string, string> | undefined
          try {
            if (routeContext?.params) {
              params = await routeContext.params
            }
          } catch {
            // params might not be available
          }

          notify(error, {
            context: {
              url: pathname,
              method: request.method,
              params,
              searchParams: Object.fromEntries(url.searchParams),
              ...options?.context,
            },
            tags: options?.tags,
          })
        }
        throw error
      }
    })
  }
}
