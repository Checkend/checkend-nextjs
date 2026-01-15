# @checkend/nextjs

[![npm version](https://badge.fury.io/js/@checkend%2Fnextjs.svg)](https://badge.fury.io/js/@checkend%2Fnextjs)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Official Next.js SDK for [Checkend](https://github.com/furvur/checkend) error monitoring. Capture and report errors across all Next.js runtime contexts with automatic integrations.

## Features

- **Unified SDK** - Single package handles client, server, and edge runtimes
- **Automatic Error Capture** - Integrates with Next.js instrumentation hooks
- **React Components** - ErrorBoundary and Provider components included
- **Server Actions** - Wrapper for automatic error reporting
- **API Routes** - Wrapper for App Router route handlers
- **Middleware** - Edge-compatible middleware wrapper
- **TypeScript** - Full TypeScript support with type definitions

## Installation

```bash
npm install @checkend/nextjs
# or
yarn add @checkend/nextjs
# or
pnpm add @checkend/nextjs
```

## Quick Start

### 1. Initialize in instrumentation.ts

```typescript
// instrumentation.ts
export async function register() {
  const { register } = await import('@checkend/nextjs')
  register({
    apiKey: process.env.CHECKEND_API_KEY!,
  })
}

// Optional: Capture unhandled request errors
export { onRequestError } from '@checkend/nextjs'
```

### 2. Add Provider to Root Layout

```tsx
// app/layout.tsx
import { CheckendProvider } from '@checkend/nextjs'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html>
      <body>
        <CheckendProvider>
          {children}
        </CheckendProvider>
      </body>
    </html>
  )
}
```

### 3. Add Error Boundary (Optional)

```tsx
// app/error.tsx
'use client'

import { useEffect } from 'react'
import { notify } from '@checkend/nextjs/client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    notify(error)
  }, [error])

  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

## Framework Integrations

### Server Actions

```typescript
// app/actions.ts
'use server'

import { withCheckendAction } from '@checkend/nextjs'

async function createUserImpl(formData: FormData) {
  const email = formData.get('email') as string
  if (!email) throw new Error('Email is required')
  // ... create user
  return { success: true }
}

export const createUser = withCheckendAction(createUserImpl, {
  name: 'createUser',
  tags: ['users'],
})
```

### API Routes

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { withCheckendRoute } from '@checkend/nextjs'

async function handler(request: NextRequest) {
  const users = await db.users.findMany()
  return NextResponse.json(users)
}

export const GET = withCheckendRoute(handler, {
  tags: ['api', 'users'],
})
```

### Middleware

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { withCheckendMiddleware } from '@checkend/nextjs'

async function middleware(request: NextRequest) {
  // Your middleware logic
  return NextResponse.next()
}

export default withCheckendMiddleware(middleware)

export const config = {
  matcher: ['/dashboard/:path*'],
}
```

### Error Boundary Component

```tsx
'use client'

import { CheckendErrorBoundary } from '@checkend/nextjs'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <CheckendErrorBoundary
      fallback={({ error, reset }) => (
        <div>
          <h2>Dashboard Error</h2>
          <p>{error.message}</p>
          <button onClick={reset}>Retry</button>
        </div>
      )}
      context={{ section: 'dashboard' }}
      tags={['dashboard']}
    >
      {children}
    </CheckendErrorBoundary>
  )
}
```

## Manual Error Reporting

### Client Components

```typescript
'use client'

import { notify, setUser, setContext } from '@checkend/nextjs/client'

// Report an error
notify(error, {
  context: { orderId: 123 },
  tags: ['checkout'],
})

// Set user for all future errors
setUser({ id: 'user-1', email: 'user@example.com' })

// Set global context
setContext({ accountId: 'acc-123' })
```

### Server Components / API Routes

```typescript
import { notify, setUser, setContext } from '@checkend/nextjs/server'

// Report an error
notify(error, {
  context: { orderId: 123 },
  tags: ['checkout'],
})

// Set user for all future errors
setUser({ id: 'user-1', email: 'user@example.com' })
```

### Edge Runtime (Middleware)

```typescript
import { notify } from '@checkend/nextjs/edge'

// Report an error with request context
await notify(error, {
  request,
  context: { custom: 'data' },
})
```

## Configuration

```typescript
// instrumentation.ts
export async function register() {
  const { register } = await import('@checkend/nextjs')

  register({
    // Required
    apiKey: process.env.CHECKEND_API_KEY!,

    // Optional - Custom endpoint (default: https://app.checkend.io)
    endpoint: 'https://checkend.example.com',

    // Optional - Environment (default: NODE_ENV)
    environment: 'production',

    // Optional - Enable/disable per runtime
    enableClient: true,  // Browser errors
    enableServer: true,  // Node.js errors
    enableEdge: true,    // Edge runtime errors

    // Optional - Routes to ignore
    ignoredRoutes: ['/health', '/api/internal', /^\/api\/v\d+\/internal/],

    // Optional - Exceptions to ignore
    ignoredExceptions: ['AbortError', /^ECONNRESET/],

    // Optional - Keys to filter from context
    filterKeys: ['password', 'creditCard', 'ssn'],

    // Optional - Callback before sending
    beforeSend: (event) => {
      // Modify event or return null to skip
      event.context = { ...event.context, version: '1.0.0' }
      return event
    },

    // Optional - Debug logging
    debug: process.env.NODE_ENV === 'development',
  })
}
```

## Runtime-Specific Imports

For direct access to runtime-specific APIs, use subpath imports:

```typescript
// Client-side (browser)
import { notify, setUser, setContext, clear } from '@checkend/nextjs/client'

// Server-side (Node.js)
import { notify, setUser, setContext, runWithContext, flush } from '@checkend/nextjs/server'

// Edge runtime
import { notify, notifySync } from '@checkend/nextjs/edge'
```

## Requirements

- Next.js 14.0+ or 15.0+
- React 18.0+ or 19.0+
- Node.js 18.0+

## Dependencies

This package depends on:
- `@checkend/browser` - Browser SDK
- `@checkend/node` - Node.js SDK

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Type check
npm run typecheck
```

## License

MIT License. See [LICENSE](LICENSE) for details.
