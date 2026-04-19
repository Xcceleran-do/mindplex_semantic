import { describe, it, expect } from 'bun:test'
import ingestRouter from '$src/routes/ingest'
import { createMockDb } from '../helpers/db'
import { createTestApp } from '../helpers/app'

const validArticleBody = {
    post: {
        id: 100,
        post_title: 'AI Ethics',
        post_name: 'ai-ethics',
        post_content: '<p>Artificial intelligence raises important ethical questions.</p>',
        brief_overview: 'Overview of AI ethics.',
        author_name: 'Alice',
        post_date: '2024-01-01',
        tag: { name: 'ai' },
        category: { name: 'technology' },
        other_authors: [],
        co_authors: [],
        post_editors: [],
    },
}

const validUserBody = {
    id: 200,
    firstName: 'Bob',
    lastName: 'Jones',
    username: 'bob',
    email: 'bob@example.com',
}

describe('POST /articles', () => {
    it('ingests a new article and returns success', async () => {
        const app = createTestApp(ingestRouter, createMockDb({
            selectResult: [],  // article doesn't exist yet
            transactionInserts: [[{ id: 1 }], []],
        }))
        const res = await app.request('/articles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validArticleBody),
        })
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.success).toBe(true)
        expect(typeof body.chunksCreated).toBe('number')
    })

    it('returns 409 when article already exists', async () => {
        const app = createTestApp(ingestRouter, createMockDb({
            selectResult: [{ id: 1 }],  // article already exists
        }))
        const res = await app.request('/articles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validArticleBody),
        })
        expect(res.status).toBe(409)
        const body = await res.json()
        expect(body.success).toBe(false)
        expect(body.error).toBe('Article already exists')
    })

    it('returns 400 for missing required fields', async () => {
        const app = createTestApp(ingestRouter, createMockDb())
        const res = await app.request('/articles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ post: { id: 1 } }),  // incomplete
        })
        expect(res.status).toBe(400)
    })

    it('accepts numeric id as string (transform)', async () => {
        const bodyWithStringId = {
            post: { ...validArticleBody.post, id: '100' },
        }
        const app = createTestApp(ingestRouter, createMockDb({
            selectResult: [],
            transactionInserts: [[{ id: 1 }], []],
        }))
        const res = await app.request('/articles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyWithStringId),
        })
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.success).toBe(true)
    })
})

describe('POST /users', () => {
    it('ingests a new user and returns success', async () => {
        const app = createTestApp(ingestRouter, createMockDb({
            selectResult: [],  // user doesn't exist yet
            insertResult: [],
        }))
        const res = await app.request('/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validUserBody),
        })
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.success).toBe(true)
        expect(body.message).toBe('User created successfully')
    })

    it('returns 409 when user already exists', async () => {
        const app = createTestApp(ingestRouter, createMockDb({
            selectResult: [{ id: 1 }],
        }))
        const res = await app.request('/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validUserBody),
        })
        expect(res.status).toBe(409)
        const body = await res.json()
        expect(body.success).toBe(false)
        expect(body.error).toBe('User already exists')
    })

    it('returns 400 for missing required user fields', async () => {
        const app = createTestApp(ingestRouter, createMockDb())
        const res = await app.request('/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: 1 }),  // incomplete
        })
        expect(res.status).toBe(400)
    })
})
