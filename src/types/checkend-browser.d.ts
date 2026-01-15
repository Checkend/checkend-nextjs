/**
 * Type declarations for @checkend/browser
 * This allows the package to build without the actual dependency
 */

declare module '@checkend/browser' {
  export interface CheckendBrowserConfig {
    apiKey: string
    endpoint?: string
    environment?: string
    ignoredExceptions?: (string | RegExp)[]
    filterKeys?: string[]
    debug?: boolean
    beforeNotify?: Array<(notice: unknown) => boolean>
  }

  export interface CheckendUser {
    id: string
    email?: string
    name?: string
    [key: string]: unknown
  }

  export interface NotifyOptions {
    context?: Record<string, unknown>
    user?: CheckendUser
    tags?: string[]
    fingerprint?: string
  }

  export interface CheckendBrowser {
    configure(config: CheckendBrowserConfig): void
  }

  const checkend: CheckendBrowser
  export default checkend

  export function notify(error: Error, options?: NotifyOptions): void
  export function notifySync(error: Error, options?: NotifyOptions): Promise<{ id: string } | null>
  export function setContext(context: Record<string, unknown>): void
  export function setUser(user: CheckendUser): void
  export function clear(): void
}
