import { describe, it, expect } from 'bun:test'
import usersRouter from '$src/routes/users'
import { createMockDb } from '../helpers/db'
import { createTestApp } from '../helpers/app'

const mockUser = {
    id: 1,
    externalId: 10,
    firstName: 'Alice',
    lastName: 'Smith',
    username: 'alice',
    email: 'alice@example.com',
    createdAt: new Date('2024-01-01').toISOString(),
    updatedAt: new Date('2024-01-01').toISOString(),
}

describe('GET /search', () => {
    it('returns empty users array when no query provided', async () => {
        const app = createTestApp(usersRouter, createMockDb())
        const res = await app.request('/search')
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toEqual({ users: [] })
    })

    it('returns matching users', async () => {
        const app = createTestApp(usersRouter, createMockDb({ selectResult: [mockUser] }))
        const res = await app.request('/search?q=alice')
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.users).toHaveLength(1)
        expect(body.meta.query).toBe('alice')
    })
})

describe('GET /:id', () => {
    it('returns user when found', async () => {
        const app = createTestApp(usersRouter, createMockDb({ selectResult: [mockUser] }))
        const res = await app.request('/10')
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.externalId).toBe(10)
    })

    it('returns 404 when user not found', async () => {
        const app = createTestApp(usersRouter, createMockDb({ selectResult: [] }))
        const res = await app.request('/99')
        expect(res.status).toBe(404)
        const body = await res.json()
        expect(body.error).toBe('User not found')
    })

    it('returns 400 for non-numeric id', async () => {
        const app = createTestApp(usersRouter, createMockDb())
        const res = await app.request('/invalid')
        expect(res.status).toBe(400)
    })
})

describe('PATCH /:id', () => {
    it('updates user and returns updated data', async () => {
        const updated = { ...mockUser, firstName: 'Bob' }
        const app = createTestApp(usersRouter, createMockDb({
            selectResult: [{ id: 1 }],
            updateResult: [updated],
        }))
        const res = await app.request('/10', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firstName: 'Bob' }),
        })
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.message).toBe('User updated successfully')
        expect(body.user.firstName).toBe('Bob')
    })

    it('returns 404 when user does not exist', async () => {
        const app = createTestApp(usersRouter, createMockDb({ selectResult: [] }))
        const res = await app.request('/99', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firstName: 'Bob' }),
        })
        expect(res.status).toBe(404)
    })

    it('returns 400 when no valid fields are provided', async () => {
        const app = createTestApp(usersRouter, createMockDb({ selectResult: [{ id: 1 }] }))
        const res = await app.request('/10', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: 999, searchName: 'hacked' }),
        })
        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body.error).toBe('No valid fields to update')
    })
})

describe('DELETE /:id', () => {
    it('deletes user and returns confirmation', async () => {
        const app = createTestApp(usersRouter, createMockDb({ selectResult: [{ id: 1 }] }))
        const res = await app.request('/10', { method: 'DELETE' })
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.message).toBe('User deleted successfully')
        expect(body.externalId).toBe(10)
    })

    it('returns 404 when user does not exist', async () => {
        const app = createTestApp(usersRouter, createMockDb({ selectResult: [] }))
        const res = await app.request('/99', { method: 'DELETE' })
        expect(res.status).toBe(404)
    })
})
