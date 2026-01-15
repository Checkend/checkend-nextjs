# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Testing utilities module (`@checkend/nextjs/testing`) for capturing notices in tests
- Default filter keys for automatic sensitive data redaction
- Enhanced configuration options:
  - `appName` - Application name for identification
  - `revision` - Application version/git SHA
  - `timeout` - HTTP request timeout
  - `connectTimeout` - HTTP connection timeout
  - `maxQueueSize` - Maximum async queue size
  - `shutdownTimeout` - Graceful shutdown timeout
  - `logger` - Custom logger interface
  - `useDefaultFilterKeys` - Toggle default filter keys
- Support for multiple `beforeSend` callbacks (array)
- `sanitize()` function for filtering sensitive data with depth limits
- `getFilterKeys()` function to get effective filter keys
- `applyBeforeSend()` function for processing callbacks
- `log()` function for consistent logging
- Pre-commit hook for secret detection
- GitHub Actions CI workflow (test on Node 18, 20, 22)
- GitHub Actions publish workflow with changelog generation
- git-cliff configuration for changelog generation

## [0.1.0] - 2024-01-01

### Added
- Initial release
- Client SDK wrapper for browser error monitoring
- Server SDK wrapper for Node.js error monitoring
- Edge SDK for middleware error monitoring
- React components: `CheckendProvider`, `CheckendErrorBoundary`
- Integration wrappers:
  - `register()` for instrumentation.ts
  - `onRequestError()` for error capture
  - `withCheckendMiddleware()` for middleware
  - `withCheckendAction()` for server actions
  - `withCheckendRoute()` for route handlers
- Configuration with `init()`, `getConfig()`, `isInitialized()`, `reset()`
- Route and exception filtering
- TypeScript support with full type definitions
- ESM and CommonJS dual exports
