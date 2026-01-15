# @checkend/nextjs - Implementation Plan

A unified Next.js SDK that wraps `@checkend/node` and `@checkend/browser` to provide seamless error monitoring across all Next.js runtime contexts.

## Phase 1: Core Foundation

- [x] Initialize npm package with TypeScript, tsup, vitest
- [x] Create shared configuration (`src/config.ts`)
- [x] Create client SDK wrapper (`src/client.ts`)
- [x] Create server SDK wrapper (`src/server.ts`)
- [x] Create edge runtime SDK (`src/edge.ts`)
- [x] Create CheckendProvider component (`src/components/Provider.tsx`)
- [x] Create CheckendErrorBoundary component (`src/components/ErrorBoundary.tsx`)
- [x] Create main exports (`src/index.ts`)
- [x] Write tests for core functionality

## Phase 2: Integration Wrappers

- [x] Create instrumentation helper (`src/integrations/instrumentation.ts`)
- [x] Create middleware wrapper (`src/integrations/middleware.ts`)
- [x] Create server action wrapper (`src/integrations/server-actions.ts`)
- [x] Create route handler wrapper (`src/integrations/route-handler.ts`)
- [ ] Write more integration tests

## Phase 3: Documentation & Examples

- [x] Write comprehensive README.md
- [ ] Create example Next.js app in `examples/` folder
- [x] Document all configuration options

## Phase 4: Build Integration (Future)

- [ ] Source map upload plugin
- [ ] next.config.js wrapper helper
- [ ] Build-time configuration validation

---

## Notes

- Depends on `@checkend/browser` and `@checkend/node` packages
- Targets Next.js 14+ and 15+
- Supports React 18+ and 19+
- Edge runtime uses fetch-only (no Node.js APIs)
