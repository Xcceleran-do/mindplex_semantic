import { describe, it, expect } from 'bun:test'
import retrievalRouter from '$src/routes/chat'
import { createMockDb } from '../helpers/db'
import { createTestApp } from '../helpers/app'

const mockChunkRow = {
    chunkId: 1,
    text: 'This is a relevant chunk of text.',
    score: 0.92,
    slug: 'test-article',
}

describe('POST /chunks', () => {
    it('returns empty object for empty user_query', async () => {
        const app = createTestApp(retrievalRouter, createMockDb())
        const res = await app.request('/chunks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_query: '' }),
        })
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toEqual({})
    })

    it('returns ranked chunks for a valid query', async () => {
        const app = createTestApp(retrievalRouter, createMockDb({
            selectResult: [mockChunkRow],
        }))
        const res = await app.request('/chunks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_query: 'what is machine learning' }),
        })
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(Array.isArray(body)).toBe(true)
        expect(body[0].chunk_id).toBe('1')
        expect(body[0].text).toBe('This is a relevant chunk of text.')
        expect(body[0].metadata.slug).toBe('test-article')
    })

    it('respects the k parameter', async () => {
        const app = createTestApp(retrievalRouter, createMockDb({ selectResult: [mockChunkRow] }))
        const res = await app.request('/chunks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_query: 'deep learning', k: 5 }),
        })
        expect(res.status).toBe(200)
    })

    it('returns 400 when k exceeds maximum (15)', async () => {
        const app = createTestApp(retrievalRouter, createMockDb())
        const res = await app.request('/chunks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_query: 'test', k: 20 }),
        })
        expect(res.status).toBe(400)
    })

    it('filters by article_id when provided', async () => {
        const app = createTestApp(retrievalRouter, createMockDb({ selectResult: [mockChunkRow] }))
        const res = await app.request('/chunks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_query: 'neural networks', filters: { article_id: '42' } }),
        })
        expect(res.status).toBe(200)
    })

    it('returns 400 when user_query field is missing', async () => {
        const app = createTestApp(retrievalRouter, createMockDb())
        const res = await app.request('/chunks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ k: 3 }),
        })
        expect(res.status).toBe(400)
    })
})
