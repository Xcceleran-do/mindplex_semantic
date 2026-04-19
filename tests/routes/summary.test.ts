import { describe, it, expect } from 'bun:test'
import { Hono } from 'hono'
import { createMiddleware } from 'hono/factory'
import summariesRouter, { summaryCollection } from '$src/routes/summary'
import * as schema from '$src/db/schema'
import { createMockDb } from '../helpers/db'
import type { AppContext } from '$src/types'

function createSummaryApp(mockDb: any) {
    const app = new Hono<AppContext>()
    app.use(createMiddleware<AppContext>(async (c, next) => {
        c.set('db', mockDb)
        c.set('schema', schema)
        await next()
    }))
    // Match the real mounting: /articles/:id/summaries
    app.route('/articles/:id/summaries', summariesRouter)
    return app
}

function createSummaryCollectionApp(mockDb: any) {
    const app = new Hono<AppContext>()
    app.use(createMiddleware<AppContext>(async (c, next) => {
        c.set('db', mockDb)
        c.set('schema', schema)
        await next()
    }))
    app.route('/summaries', summaryCollection)
    return app
}

const mockArticle = { id: 1, externalId: 42 }

const mockSummaryRow = {
    articleExternalId: 42,
    tone: 'formal',
    summary: 'A formal summary.',
    createdAt: new Date('2024-01-01').toISOString(),
    updatedAt: new Date('2024-01-01').toISOString(),
}

// ─── Collection endpoint ───────────────────────────────────────────────────────

describe('GET /summaries', () => {
    it('returns paginated summaries with meta', async () => {
        const mockDb = createMockDb({
            selectResult: [mockSummaryRow, { total: 1 }],
        })
        // Override select to return summary rows first, then count
        let callCount = 0
        const selectMock = (_fields?: any) => {
            const result = callCount === 0 ? [mockSummaryRow] : [{ total: 1 }]
            callCount++
            const chain: any = {}
            const methods = ['from', 'where', 'limit', 'offset', 'orderBy', 'leftJoin', 'innerJoin', 'groupBy', 'set', 'values', 'onConflictDoUpdate']
            methods.forEach(m => { chain[m] = () => chain })
            chain.returning = () => Promise.resolve(result)
            chain.as = () => chain
            chain.then = (res: any, rej: any) => Promise.resolve(result).then(res, rej)
            return chain
        }
        const db = { ...mockDb, select: selectMock }
        const app = createSummaryCollectionApp(db)
        const res = await app.request('/summaries')
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.summaries).toBeDefined()
        expect(body.meta).toBeDefined()
        expect(body.meta.page).toBe(1)
    })
})

// ─── Article summary endpoints ─────────────────────────────────────────────────

describe('GET /articles/:id/summaries', () => {
    it('returns 404 when article not found', async () => {
        const app = createSummaryApp(createMockDb({ queryArticle: undefined }))
        const res = await app.request('/articles/99/summaries')
        expect(res.status).toBe(404)
        const body = await res.json()
        expect(body.error).toBe('Article not found')
    })

    it('returns summaries for existing article', async () => {
        const mockDb = createMockDb({
            queryArticle: mockArticle,
            selectResult: [mockSummaryRow],
        })
        const app = createSummaryApp(mockDb)
        const res = await app.request('/articles/42/summaries')
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.summaries).toBeDefined()
    })
})

describe('GET /articles/:id/summaries/:tone', () => {
    it('returns 404 when article not found', async () => {
        const app = createSummaryApp(createMockDb({ queryArticle: undefined }))
        const res = await app.request('/articles/99/summaries/formal')
        expect(res.status).toBe(404)
    })

    it('returns 404 when summary not found for tone', async () => {
        const mockDb = createMockDb({
            queryArticle: mockArticle,
            selectResult: [],
        })
        const app = createSummaryApp(mockDb)
        const res = await app.request('/articles/42/summaries/casual')
        expect(res.status).toBe(404)
        const body = await res.json()
        expect(body.error).toBe('Summary not found')
    })

    it('returns summary when found', async () => {
        const mockDb = createMockDb({
            queryArticle: mockArticle,
            selectResult: [mockSummaryRow],
        })
        const app = createSummaryApp(mockDb)
        const res = await app.request('/articles/42/summaries/formal')
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.tone).toBe('formal')
    })
})

describe('PUT /articles/:id/summaries/:tone', () => {
    it('returns 404 when article not found', async () => {
        const app = createSummaryApp(createMockDb({ queryArticle: undefined }))
        const res = await app.request('/articles/99/summaries/formal', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ summary: 'A formal summary text.' }),
        })
        expect(res.status).toBe(404)
    })

    it('creates a new summary (201)', async () => {
        const saved = { tone: 'formal', summary: 'Created.', createdAt: null, updatedAt: null }
        const mockDb = createMockDb({
            queryArticle: mockArticle,
            querySummary: undefined,  // no existing summary -> create
            insertResult: [saved],
        })
        const app = createSummaryApp(mockDb)
        const res = await app.request('/articles/42/summaries/formal', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ summary: 'Created.' }),
        })
        expect(res.status).toBe(201)
        const body = await res.json()
        expect(body.message).toContain('created')
    })

    it('updates an existing summary (200)', async () => {
        const saved = { tone: 'formal', summary: 'Updated.', createdAt: null, updatedAt: null }
        const mockDb = createMockDb({
            queryArticle: mockArticle,
            querySummary: { id: 5 },  // existing summary -> update
            insertResult: [saved],
        })
        const app = createSummaryApp(mockDb)
        const res = await app.request('/articles/42/summaries/formal', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ summary: 'Updated.' }),
        })
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.message).toContain('updated')
    })

    it('returns 400 for invalid tone', async () => {
        const app = createSummaryApp(createMockDb())
        const res = await app.request('/articles/42/summaries/invalid_tone', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ summary: 'Some text.' }),
        })
        expect(res.status).toBe(400)
    })

    it('returns 400 when summary body is missing', async () => {
        const app = createSummaryApp(createMockDb({ queryArticle: mockArticle }))
        const res = await app.request('/articles/42/summaries/formal', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        })
        expect(res.status).toBe(400)
    })
})
