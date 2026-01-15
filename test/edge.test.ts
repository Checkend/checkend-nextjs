import { describe, it, expect, beforeEach, vi } from 'vitest'
import { init, reset } from '../src/config'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('edge SDK', () => {
  beforeEach(() => {
    reset()
    mockFetch.mockReset()
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'test-id' }),
    })
  })

  it('sends error to Checkend endpoint', async () => {
    init({ apiKey: 'test-key', enableEdge: true })

    // Dynamic import to get fresh module
    const { notify } = await import('../src/edge')

    const error = new Error('Test error')
    await notify(error)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0]

    expect(url).toBe('https://app.checkend.io/ingest/v1/errors')
    expect(options.method).toBe('POST')
    expect(options.headers['Content-Type']).toBe('application/json')
    expect(options.headers['Checkend-Ingestion-Key']).toBe('test-key')

    const body = JSON.parse(options.body)
    expect(body.error_class).toBe('Error')
    expect(body.message).toBe('Test error')
  })

  it('uses custom endpoint when configured', async () => {
    init({
      apiKey: 'test-key',
      endpoint: 'https://custom.checkend.io',
      enableEdge: true,
    })

    const { notify } = await import('../src/edge')

    await notify(new Error('Test'))

    const [url] = mockFetch.mock.calls[0]
    expect(url).toBe('https://custom.checkend.io/ingest/v1/errors')
  })

  it('includes request info when provided', async () => {
    init({ apiKey: 'test-key', enableEdge: true })

    const { notify } = await import('../src/edge')

    const request = new Request('https://example.com/api/users?page=1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Test/1.0',
      },
    })

    await notify(new Error('Test'), { request })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.request.url).toBe('/api/users?page=1')
    expect(body.request.method).toBe('POST')
    expect(body.request.user_agent).toBe('Test/1.0')
  })

  it('filters sensitive headers', async () => {
    init({ apiKey: 'test-key', enableEdge: true })

    const { notify } = await import('../src/edge')

    const request = new Request('https://example.com/api', {
      headers: {
        Authorization: 'Bearer secret-token',
        Cookie: 'session=abc123',
        'Content-Type': 'application/json',
      },
    })

    await notify(new Error('Test'), { request })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.request.headers.authorization).toBe('[FILTERED]')
    expect(body.request.headers.cookie).toBe('[FILTERED]')
    expect(body.request.headers['content-type']).toBe('application/json')
  })

  it('does not send when enableEdge is false', async () => {
    init({ apiKey: 'test-key', enableEdge: false })

    const { notify } = await import('../src/edge')

    await notify(new Error('Test'))

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('notifySync returns id on success', async () => {
    init({ apiKey: 'test-key', enableEdge: true })

    const { notifySync } = await import('../src/edge')

    const result = await notifySync(new Error('Test'))

    expect(result).toEqual({ id: 'test-id' })
  })

  it('notifySync returns null on failure', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 })
    init({ apiKey: 'test-key', enableEdge: true })

    const { notifySync } = await import('../src/edge')

    const result = await notifySync(new Error('Test'))

    expect(result).toBeNull()
  })

  it('silently handles fetch errors', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))
    init({ apiKey: 'test-key', enableEdge: true })

    const { notify } = await import('../src/edge')

    // Should not throw
    await expect(notify(new Error('Test'))).resolves.toBeUndefined()
  })

  it('includes context and tags', async () => {
    init({ apiKey: 'test-key', enableEdge: true })

    const { notify } = await import('../src/edge')

    await notify(new Error('Test'), {
      context: { userId: '123' },
      tags: ['api', 'critical'],
      fingerprint: 'custom-fingerprint',
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.context).toEqual({ userId: '123' })
    expect(body.tags).toEqual(['api', 'critical'])
    expect(body.fingerprint).toBe('custom-fingerprint')
  })
})
