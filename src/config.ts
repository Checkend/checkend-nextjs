/**
 * Shared configuration for @checkend/nextjs
 */

export interface CheckendUser {
  id: string
  email?: string
  name?: string
  [key: string]: unknown
}

export interface CheckendEvent {
  errorClass: string
  message: string
  backtrace: string[]
  context?: Record<string, unknown>
  request?: Record<string, unknown>
  user?: CheckendUser
  tags?: string[]
  fingerprint?: string
}

/**
 * Logger interface for debug output.
 */
export interface CheckendLogger {
  debug: (message: string, ...args: unknown[]) => void
  info: (message: string, ...args: unknown[]) => void
  warn: (message: string, ...args: unknown[]) => void
  error: (message: string, ...args: unknown[]) => void
}

/**
 * Default keys to filter from context and request data.
 * These are automatically redacted to prevent sensitive data leakage.
 */
export const DEFAULT_FILTER_KEYS = [
  // Authentication
  'password',
  'passwd',
  'secret',
  'token',
  'api_key',
  'apiKey',
  'api-key',
  'authorization',
  'auth',
  'credentials',
  'session',
  'sessionId',
  'session_id',

  // Financial
  'credit_card',
  'creditCard',
  'card_number',
  'cardNumber',
  'cvv',
  'cvc',
  'ccv',
  'expiry',
  'expiration',

  // Personal
  'ssn',
  'social_security',
  'socialSecurity',
  'sin',
  'national_id',
  'nationalId',

  // Access control
  'private_key',
  'privateKey',
  'private-key',
  'access_token',
  'accessToken',
  'access-token',
  'refresh_token',
  'refreshToken',
  'refresh-token',
  'bearer',

  // Common sensitive patterns
  'stripe_key',
  'stripeKey',
  'aws_secret',
  'awsSecret',
  'database_url',
  'databaseUrl',
  'connection_string',
  'connectionString',
]

export interface CheckendNextConfig {
  /**
   * Your Checkend ingestion API key (required)
   */
  apiKey: string

  /**
   * Checkend server endpoint
   * @default 'https://app.checkend.io'
   */
  endpoint?: string

  /**
   * Environment name (e.g., 'production', 'staging', 'development')
   * @default process.env.NODE_ENV
   */
  environment?: string

  /**
   * Application name for identification
   */
  appName?: string

  /**
   * Application revision/version (e.g., git SHA, package version)
   */
  revision?: string

  /**
   * Enable client-side error capturing
   * @default true
   */
  enableClient?: boolean

  /**
   * Enable server-side error capturing
   * @default true
   */
  enableServer?: boolean

  /**
   * Enable edge runtime error capturing
   * @default true
   */
  enableEdge?: boolean

  /**
   * Routes to ignore (won't report errors from these routes)
   */
  ignoredRoutes?: (string | RegExp)[]

  /**
   * Exception patterns to ignore
   */
  ignoredExceptions?: (string | RegExp)[]

  /**
   * Keys to filter from context/request data (e.g., 'password', 'creditCard')
   * These are merged with DEFAULT_FILTER_KEYS
   */
  filterKeys?: string[]

  /**
   * Whether to use default filter keys in addition to custom ones
   * @default true
   */
  useDefaultFilterKeys?: boolean

  /**
   * Callback before sending an event. Return null to skip sending.
   * You can have multiple callbacks by passing an array.
   */
  beforeSend?: BeforeSendCallback | BeforeSendCallback[]

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean

  /**
   * Custom logger for debug output
   * @default console
   */
  logger?: CheckendLogger

  /**
   * HTTP request timeout in milliseconds
   * @default 30000
   */
  timeout?: number

  /**
   * HTTP connection timeout in milliseconds
   * @default 10000
   */
  connectTimeout?: number

  /**
   * Maximum number of errors to queue for async sending
   * @default 1000
   */
  maxQueueSize?: number

  /**
   * Timeout in milliseconds to wait for pending errors on shutdown
   * @default 5000
   */
  shutdownTimeout?: number
}

/**
 * Callback type for beforeSend hooks
 */
export type BeforeSendCallback = (event: CheckendEvent) => CheckendEvent | null

let globalConfig: CheckendNextConfig | null = null
let configuredLogger: CheckendLogger | null = null

/**
 * Initialize Checkend with your configuration.
 * Call this once at application startup.
 */
export function init(options: CheckendNextConfig): CheckendNextConfig {
  if (!options.apiKey) {
    throw new Error('Checkend: apiKey is required')
  }

  globalConfig = {
    enableClient: true,
    enableServer: true,
    enableEdge: true,
    debug: false,
    useDefaultFilterKeys: true,
    timeout: 30000,
    connectTimeout: 10000,
    maxQueueSize: 1000,
    shutdownTimeout: 5000,
    ...options,
  }

  // Set up logger
  configuredLogger = globalConfig.logger || createDefaultLogger(globalConfig.debug ?? false)

  if (globalConfig.debug) {
    log('debug', 'Initialized with config:', {
      ...globalConfig,
      apiKey: globalConfig.apiKey.slice(0, 8) + '...',
    })
  }

  return globalConfig
}

/**
 * Get the current configuration. Throws if not initialized.
 */
export function getConfig(): CheckendNextConfig {
  if (!globalConfig) {
    throw new Error(
      'Checkend not initialized. Call init() first, typically in instrumentation.ts'
    )
  }
  return globalConfig
}

/**
 * Check if Checkend has been initialized.
 */
export function isInitialized(): boolean {
  return globalConfig !== null
}

/**
 * Reset configuration (mainly for testing)
 */
export function reset(): void {
  globalConfig = null
  configuredLogger = null
}

/**
 * Check if a route should be ignored based on configuration.
 */
export function shouldIgnoreRoute(route: string): boolean {
  const config = getConfig()
  if (!config.ignoredRoutes?.length) return false

  return config.ignoredRoutes.some((pattern) => {
    if (typeof pattern === 'string') {
      return route === pattern || route.startsWith(pattern)
    }
    return pattern.test(route)
  })
}

/**
 * Check if an exception should be ignored based on configuration.
 */
export function shouldIgnoreException(error: Error): boolean {
  const config = getConfig()
  if (!config.ignoredExceptions?.length) return false

  const errorString = `${error.name}: ${error.message}`

  return config.ignoredExceptions.some((pattern) => {
    if (typeof pattern === 'string') {
      return error.name === pattern || error.message.includes(pattern)
    }
    return pattern.test(errorString)
  })
}

/**
 * Get the effective filter keys (default + custom)
 */
export function getFilterKeys(): string[] {
  const config = getConfig()
  const customKeys = config.filterKeys || []

  if (config.useDefaultFilterKeys !== false) {
    // Merge and deduplicate
    return [...new Set([...DEFAULT_FILTER_KEYS, ...customKeys])]
  }

  return customKeys
}

/**
 * Apply all beforeSend callbacks to an event.
 * Returns null if any callback returns null (event should be dropped).
 */
export function applyBeforeSend(event: CheckendEvent): CheckendEvent | null {
  const config = getConfig()
  if (!config.beforeSend) return event

  const callbacks = Array.isArray(config.beforeSend)
    ? config.beforeSend
    : [config.beforeSend]

  let result: CheckendEvent | null = event

  for (const callback of callbacks) {
    if (result === null) break
    try {
      result = callback(result)
    } catch (err) {
      log('error', 'beforeSend callback threw an error:', err)
      // Continue with unmodified event
    }
  }

  return result
}

/**
 * Log a message using the configured logger.
 */
export function log(
  level: 'debug' | 'info' | 'warn' | 'error',
  message: string,
  ...args: unknown[]
): void {
  if (!configuredLogger) return

  const prefixedMessage = `[Checkend] ${message}`
  configuredLogger[level](prefixedMessage, ...args)
}

/**
 * Create a default console logger.
 */
function createDefaultLogger(debug: boolean): CheckendLogger {
  return {
    debug: debug
      ? (message: string, ...args: unknown[]) => console.debug(message, ...args)
      : () => {},
    info: (message: string, ...args: unknown[]) => console.info(message, ...args),
    warn: (message: string, ...args: unknown[]) => console.warn(message, ...args),
    error: (message: string, ...args: unknown[]) => console.error(message, ...args),
  }
}

/**
 * Sanitize data by filtering sensitive keys.
 */
export function sanitize<T extends Record<string, unknown>>(
  data: T,
  maxDepth: number = 10
): T {
  const filterKeys = getFilterKeys()
  const filterPattern = new RegExp(filterKeys.join('|'), 'i')

  function sanitizeValue(value: unknown, depth: number): unknown {
    if (depth > maxDepth) return '[MAX_DEPTH]'

    if (value === null || value === undefined) return value

    if (typeof value === 'string') {
      // Truncate very long strings
      return value.length > 10000 ? value.slice(0, 10000) + '...[TRUNCATED]' : value
    }

    if (Array.isArray(value)) {
      return value.map((item) => sanitizeValue(item, depth + 1))
    }

    if (typeof value === 'object') {
      const result: Record<string, unknown> = {}
      for (const [key, val] of Object.entries(value)) {
        if (filterPattern.test(key)) {
          result[key] = '[FILTERED]'
        } else {
          result[key] = sanitizeValue(val, depth + 1)
        }
      }
      return result
    }

    return value
  }

  return sanitizeValue(data, 0) as T
}
