import { describe, it, expect } from 'bun:test'
import articlesRouter from '$src/routes/articles'
import { createMockDb } from '../helpers/db'
import { createTestApp } from '../helpers/app'

const mockArticle = {
    id: 1,
    externalId: 42,
    title: 'Test Article',
    slug: 'test-article',
    teaser: 'A teaser',
    content: 'Full content here.',
    tags: ['tech'],
    category: ['science'],
    publishedAt: new Date('2024-01-01').toISOString(),
    createdAt: new Date('2024-01-01').toISOString(),
    updatedAt: new Date('2024-01-01').toISOString(),
}

describe('GET /search', () => {
    it('returns empty articles array when query is missing', async () => {
        const app = createTestApp(articlesRouter, createMockDb())
        const res = await app.request('/search')
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toEqual({ articles: [] })
    })

    it('returns empty articles array when q param is empty string', async () => {
        const app = createTestApp(articlesRouter, createMockDb())
        const res = await app.request('/search?q=')
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toEqual({ articles: [] })
    })
})

describe('GET /', () => {
    it('returns articles list with pagination meta', async () => {
        const app = createTestApp(articlesRouter, createMockDb({ selectResult: [mockArticle] }))
        const res = await app.request('/')
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.articles).toHaveLength(1)
        expect(body.meta).toBeDefined()
        expect(body.meta.page).toBe(1)
    })

    it('returns empty array when no articles exist', async () => {
        const app = createTestApp(articlesRouter, createMockDb({ selectResult: [] }))
        const res = await app.request('/')
        const body = await res.json()
        expect(body.articles).toEqual([])
    })
})

describe('GET /:id', () => {
    it('returns article when found', async () => {
        const app = createTestApp(articlesRouter, createMockDb({ selectResult: [mockArticle] }))
        const res = await app.request('/42')
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.externalId).toBe(42)
    })

    it('returns 404 when article not found', async () => {
        const app = createTestApp(articlesRouter, createMockDb({ selectResult: [] }))
        const res = await app.request('/99')
        expect(res.status).toBe(404)
        const body = await res.json()
        expect(body.error).toBe('Article not found')
    })

    it('returns 400 for invalid id param', async () => {
        const app = createTestApp(articlesRouter, createMockDb())
        const res = await app.request('/invalid')
        expect(res.status).toBe(400)
    })
})

describe('PATCH /:id', () => {
    it('updates article and returns updated data', async () => {
        const updated = { ...mockArticle, title: 'Updated Title' }
        const app = createTestApp(articlesRouter, createMockDb({
            selectResult: [{ id: 1 }],
            updateResult: [updated],
        }))
        const res = await app.request('/42', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'Updated Title' }),
        })
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.message).toBe('Article updated successfully')
        expect(body.article.title).toBe('Updated Title')
    })

    it('returns 404 when article does not exist', async () => {
        const app = createTestApp(articlesRouter, createMockDb({ selectResult: [] }))
        const res = await app.request('/99', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'New' }),
        })
        expect(res.status).toBe(404)
    })

    it('returns 400 when no valid fields are provided', async () => {
        const app = createTestApp(articlesRouter, createMockDb({ selectResult: [{ id: 1 }] }))
        const res = await app.request('/42', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embedding: [0.1], searchVector: 'invalid' }),
        })
        expect(res.status).toBe(400)
    })
})

describe('DELETE /:id', () => {
    it('deletes article and returns confirmation', async () => {
        const app = createTestApp(articlesRouter, createMockDb({ selectResult: [{ id: 1 }] }))
        const res = await app.request('/42', { method: 'DELETE' })
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.message).toBe('Article deleted successfully')
        expect(body.externalId).toBe(42)
    })

    it('returns 404 when article does not exist', async () => {
        const app = createTestApp(articlesRouter, createMockDb({ selectResult: [] }))
        const res = await app.request('/99', { method: 'DELETE' })
        expect(res.status).toBe(404)
    })
})

describe('GET /:id/chunks', () => {
    it('returns chunks for a found article', async () => {
        const mockChunk = { id: 1, chunkIndex: 0, rawContent: 'chunk text', chunkToEmbed: 'embed text' }
        // First select returns the article, second returns chunks
        let callCount = 0
        const mockDb = {
            ...createMockDb(),
            select: (_fields?: any) => {
                callCount++
                if (callCount === 1) {
                    const chain: any = {}
                    const methods = ['from', 'where', 'limit', 'offset', 'orderBy', 'leftJoin', 'innerJoin', 'groupBy', 'set', 'values', 'onConflictDoUpdate']
                    methods.forEach(m => { chain[m] = () => chain })
                    chain.returning = () => Promise.resolve([{ id: 1 }])
                    chain.as = () => chain
                    chain.then = (res: any, rej: any) => Promise.resolve([{ id: 1 }]).then(res, rej)
                    return chain
                }
                const chain: any = {}
                const methods = ['from', 'where', 'limit', 'offset', 'orderBy', 'leftJoin', 'innerJoin', 'groupBy', 'set', 'values', 'onConflictDoUpdate']
                methods.forEach(m => { chain[m] = () => chain })
                chain.returning = () => Promise.resolve([mockChunk])
                chain.as = () => chain
                chain.then = (res: any, rej: any) => Promise.resolve([mockChunk]).then(res, rej)
                return chain
            },
            query: { articles: { findFirst: async () => undefined }, summaries: { findFirst: async () => undefined } },
            insert: (_t: any) => ({ values: () => ({ returning: () => Promise.resolve([]) }), then: (r: any) => Promise.resolve([]).then(r) }),
            update: (_t: any) => ({ set: () => ({ where: () => ({ returning: () => Promise.resolve([]) }) }) }),
            delete: (_t: any) => ({ where: () => ({ then: (r: any) => Promise.resolve([]).then(r) }) }),
            transaction: async (fn: any) => fn({ insert: () => ({ values: () => ({ returning: () => Promise.resolve([]) }) }) }),
        }
        const app = createTestApp(articlesRouter, mockDb)
        const res = await app.request('/42/chunks')
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.externalId).toBe(42)
        expect(body.chunks).toBeDefined()
    })

    it('returns 404 when article not found', async () => {
        const app = createTestApp(articlesRouter, createMockDb({ selectResult: [] }))
        const res = await app.request('/99/chunks')
        expect(res.status).toBe(404)
    })
})

describe('GET /:id/related', () => {
    it('returns 404 when article not found', async () => {
        const app = createTestApp(articlesRouter, createMockDb({ selectResult: [] }))
        const res = await app.request('/99/related')
        expect(res.status).toBe(404)
    })

    it('returns empty articles with fallback when no embedding and no title', async () => {
        const app = createTestApp(articlesRouter, createMockDb({
            selectResult: [{ id: 1, embedding: null, title: '', teaser: '' }],
        }))
        const res = await app.request('/42/related')
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.articles).toEqual([])
        expect(body.meta.fallback).toBe(true)
    })
})
