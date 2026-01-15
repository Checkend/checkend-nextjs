/**
 * Middleware wrapper for Next.js middleware
 */

import { NextRequest, NextResponse } from 'next/server'
import { notify } from '../edge'
import { shouldIgnoreRoute } from '../config'

type NextMiddleware = (
  request: NextRequest
) => NextResponse | Response | Promise<NextResponse | Response>

/**
 * Wrap your Next.js middleware to automatically report errors to Checkend.
 *
 * @example
 * ```typescript
 * // middleware.ts
 * import { NextRequest, NextResponse } from 'next/server'
 * import { withCheckendMiddleware } from '@checkend/nextjs'
 *
 * async function middleware(request: NextRequest) {
 *   // Your middleware logic
 *   if (!isAuthenticated(request)) {
 *     return NextResponse.redirect(new URL('/login', request.url))
 *   }
 *   return NextResponse.next()
 * }
 *
 * export default withCheckendMiddleware(middleware)
 *
 * export const config = {
 *   matcher: ['/dashboard/:path*'],
 * }
 * ```
 */
export function withCheckendMiddleware(handler: NextMiddleware): NextMiddleware {
  return async (request: NextRequest) => {
    const pathname = new URL(request.url).pathname

    // Check if this route should be ignored
    if (shouldIgnoreRoute(pathname)) {
      return handler(request)
    }

    try {
      return await handler(request)
    } catch (error) {
      if (error instanceof Error) {
        await notify(error, {
          request,
          context: {
            middleware: true,
            pathname,
          },
        })
      }
      throw error
    }
  }
}
