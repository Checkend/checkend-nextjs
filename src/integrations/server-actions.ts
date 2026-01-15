/**
 * Server action wrapper for Next.js Server Actions
 */

import { headers } from 'next/headers'
import { notify, runWithContext } from '../server'

type ServerAction<TArgs extends unknown[], TResult> = (
  ...args: TArgs
) => Promise<TResult>

interface WrapOptions {
  /**
   * Name of the action for error reporting context
   */
  name?: string
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
 * Wrap a server action to automatically report errors to Checkend.
 *
 * @example
 * ```typescript
 * // app/actions.ts
 * 'use server'
 *
 * import { withCheckendAction } from '@checkend/nextjs'
 *
 * async function createUserImpl(formData: FormData) {
 *   const email = formData.get('email') as string
 *   if (!email) {
 *     throw new Error('Email is required')
 *   }
 *   // Create user...
 *   return { success: true }
 * }
 *
 * export const createUser = withCheckendAction(createUserImpl, {
 *   name: 'createUser',
 *   tags: ['users', 'registration'],
 * })
 * ```
 */
export function withCheckendAction<TArgs extends unknown[], TResult>(
  action: ServerAction<TArgs, TResult>,
  options?: WrapOptions
): ServerAction<TArgs, TResult> {
  const actionName = options?.name || action.name || '<anonymous>'

  return async (...args: TArgs): Promise<TResult> => {
    return runWithContext(async () => {
      try {
        return await action(...args)
      } catch (error) {
        if (error instanceof Error) {
          // Get request context
          let referer: string | null = null
          try {
            const headersList = await headers()
            referer = headersList.get('referer')
          } catch {
            // headers() might not be available in all contexts
          }

          notify(error, {
            context: {
              actionName,
              referer,
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
