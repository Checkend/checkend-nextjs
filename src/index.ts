/**
 * @checkend/nextjs - Next.js SDK for Checkend error monitoring
 *
 * Provides seamless error monitoring across all Next.js runtime contexts:
 * - Client Components (browser)
 * - Server Components (Node.js)
 * - API Routes (Node.js)
 * - Middleware (Edge)
 * - Server Actions (Node.js)
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
 *
 * @example
 * ```tsx
 * // app/layout.tsx
 * import { CheckendProvider } from '@checkend/nextjs'
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <CheckendProvider>
 *           {children}
 *         </CheckendProvider>
 *       </body>
 *     </html>
 *   )
 * }
 * ```
 */

// Configuration
export {
  init,
  getConfig,
  isInitialized,
  reset,
  getFilterKeys,
  applyBeforeSend,
  sanitize,
  log,
  DEFAULT_FILTER_KEYS,
  type CheckendNextConfig,
  type CheckendUser,
  type CheckendEvent,
  type CheckendLogger,
  type BeforeSendCallback,
} from './config'

// Components
export {
  CheckendProvider,
  useCheckend,
  type CheckendProviderProps,
} from './components/Provider'

export {
  CheckendErrorBoundary,
  type CheckendErrorBoundaryProps,
} from './components/ErrorBoundary'

// Instrumentation
export { register, onRequestError } from './integrations/instrumentation'

// Integration wrappers
export { withCheckendMiddleware } from './integrations/middleware'
export { withCheckendAction } from './integrations/server-actions'
export { withCheckendRoute } from './integrations/route-handler'

// For runtime-specific APIs, use subpath imports:
// import { notify, setContext, setUser } from '@checkend/nextjs/client'
// import { notify, setContext, setUser } from '@checkend/nextjs/server'
// import { notify } from '@checkend/nextjs/edge'

// For testing utilities, use:
// import { setup, teardown, notices } from '@checkend/nextjs/testing'
