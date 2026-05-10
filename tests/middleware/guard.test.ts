import { describe, expect, it } from 'bun:test'
import { Hono } from 'hono'

import { guard } from '$src/middleware/guard'
import type { AppContext } from '$src/types'
import { createAuthHeaders } from '../helpers/auth'

describe('guard middleware', () => {
    it('allows optional access when no token is present', async () => {
        const app = new Hono<AppContext>()
        app.get('/optional', guard('optional'), (c) => c.json({ auth: c.get('auth') }))

        const res = await app.request('/optional')
        expect(res.status).toBe(200)

        const body = await res.json()
        expect(body.auth).toBeNull()
    })

    it('rejects protected access when token is missing', async () => {
        const app = new Hono<AppContext>()
        app.get('/protected', guard('editor'), (c) => c.json({ ok: true }))

        const res = await app.request('/protected')
        expect(res.status).toBe(401)
    })

    it('rejects malformed bearer headers', async () => {
        const app = new Hono<AppContext>()
        app.get('/protected', guard(), (c) => c.json({ ok: true }))

        const res = await app.request('/protected', {
            headers: { Authorization: 'Token nope' },
        })

        expect(res.status).toBe(401)
    })

    it('enforces role hierarchy', async () => {
        const app = new Hono<AppContext>()
        app.get('/protected', guard('editor'), (c) => c.json({ ok: true }))

        const res = await app.request('/protected', {
            headers: await createAuthHeaders('collaborator'),
        })

        expect(res.status).toBe(403)
    })

    it('allows higher roles to satisfy lower thresholds', async () => {
        const app = new Hono<AppContext>()
        app.get('/protected', guard('editor'), (c) => c.json({ ok: true, access: c.get('auth')?.access }))

        const res = await app.request('/protected', {
            headers: await createAuthHeaders('admin'),
        })

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.access).toBe('admin')
    })

    it('supports array-based role claims', async () => {
        process.env.JWT_ROLE_CLAIM = 'roles'

        const app = new Hono<AppContext>()
        app.get('/protected', guard('editor'), (c) => c.json({ roles: c.get('auth')?.roles }))

        const res = await app.request('/protected', {
            headers: await createAuthHeaders('collaborator', { roles: ['collaborator', 'editor'] }),
        })

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.roles).toEqual(['collaborator', 'editor'])
    })
})
