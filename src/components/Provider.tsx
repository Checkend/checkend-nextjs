'use client'

import { ReactNode, useEffect, useState, createContext, useContext } from 'react'
import { initClient, setUser, setContext, clear } from '../client'
import type { CheckendUser } from '../config'

interface CheckendContextValue {
  isReady: boolean
  setUser: (user: CheckendUser | null) => Promise<void>
  setContext: (context: Record<string, unknown>) => Promise<void>
  clear: () => Promise<void>
}

const CheckendContext = createContext<CheckendContextValue | null>(null)

export interface CheckendProviderProps {
  children: ReactNode
  /**
   * Optional user to set on initialization
   */
  user?: CheckendUser
  /**
   * Optional context to set on initialization
   */
  context?: Record<string, unknown>
}

/**
 * Provider component that initializes the Checkend client SDK.
 * Wrap your app with this component in your root layout.
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
export function CheckendProvider({
  children,
  user: initialUser,
  context: initialContext,
}: CheckendProviderProps) {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    async function initialize() {
      await initClient()

      if (initialContext) {
        await setContext(initialContext)
      }

      if (initialUser) {
        await setUser(initialUser)
      }

      setIsReady(true)
    }

    initialize()
  }, [initialUser, initialContext])

  const value: CheckendContextValue = {
    isReady,
    setUser,
    setContext,
    clear,
  }

  return (
    <CheckendContext.Provider value={value}>
      {children}
    </CheckendContext.Provider>
  )
}

/**
 * Hook to access Checkend context methods.
 * Must be used within a CheckendProvider.
 *
 * @example
 * ```tsx
 * 'use client'
 * import { useCheckend } from '@checkend/nextjs'
 *
 * function UserProfile({ user }) {
 *   const { setUser } = useCheckend()
 *
 *   useEffect(() => {
 *     setUser({ id: user.id, email: user.email })
 *   }, [user])
 *
 *   return <div>...</div>
 * }
 * ```
 */
export function useCheckend(): CheckendContextValue {
  const context = useContext(CheckendContext)

  if (!context) {
    throw new Error('useCheckend must be used within a CheckendProvider')
  }

  return context
}
