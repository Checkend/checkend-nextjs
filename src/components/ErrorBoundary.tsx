'use client'

import { Component, ErrorInfo, ReactNode } from 'react'
import { notify } from '../client'

export interface CheckendErrorBoundaryProps {
  children: ReactNode
  /**
   * Fallback UI to render when an error occurs.
   * Can be a ReactNode or a function that receives the error and reset function.
   */
  fallback?:
    | ReactNode
    | ((props: { error: Error; reset: () => void }) => ReactNode)
  /**
   * Called when an error is caught (in addition to reporting to Checkend)
   */
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  /**
   * Called when the error boundary is reset
   */
  onReset?: () => void
  /**
   * Additional context to include with the error report
   */
  context?: Record<string, unknown>
  /**
   * Tags to include with the error report
   */
  tags?: string[]
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Error boundary component that catches errors in child components
 * and reports them to Checkend.
 *
 * @example
 * ```tsx
 * 'use client'
 * import { CheckendErrorBoundary } from '@checkend/nextjs'
 *
 * export default function DashboardLayout({ children }) {
 *   return (
 *     <CheckendErrorBoundary
 *       fallback={({ error, reset }) => (
 *         <div>
 *           <h2>Something went wrong</h2>
 *           <p>{error.message}</p>
 *           <button onClick={reset}>Try again</button>
 *         </div>
 *       )}
 *       context={{ section: 'dashboard' }}
 *       tags={['dashboard']}
 *     >
 *       {children}
 *     </CheckendErrorBoundary>
 *   )
 * }
 * ```
 */
export class CheckendErrorBoundary extends Component<
  CheckendErrorBoundaryProps,
  State
> {
  constructor(props: CheckendErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Report to Checkend
    notify(error, {
      context: {
        ...this.props.context,
        componentStack: errorInfo.componentStack,
        // Next.js adds digest for server component errors
        digest: (errorInfo as any).digest,
      },
      tags: this.props.tags,
    })

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)
  }

  reset = () => {
    this.props.onReset?.()
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const { fallback } = this.props

      if (typeof fallback === 'function') {
        return fallback({ error: this.state.error, reset: this.reset })
      }

      if (fallback !== undefined) {
        return fallback
      }

      // Default fallback
      return (
        <div
          style={{
            padding: '20px',
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <h2 style={{ margin: '0 0 10px' }}>Something went wrong</h2>
          <p style={{ color: '#666', margin: '0 0 15px' }}>
            {this.state.error.message}
          </p>
          <button
            onClick={this.reset}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              cursor: 'pointer',
              backgroundColor: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
            }}
          >
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
