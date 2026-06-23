import { afterEach, describe, expect, it } from 'bun:test'
import { Hono } from 'hono'

import { requireWriteAuth } from '$src/middleware/writeAuth'
import type { AppContext } from '$src/types'
import {
    clearJwtTestEnv,
    configureBackendPublicJwk,
    createBackendJwtFixture,
} from '../helpers/auth'

describe('requireWriteAuth middleware', () => {
    afterEach(() => {
        clearJwtTestEnv()
        delete process.env.API_KEY
        delete process.env.INGEST_API_KEY
    })

    it('allows configured API keys', async () => {
        process.env.API_KEY = 'test-key'
        const app = createProtectedApp()

        const res = await app.request('/protected', {
            method: 'POST',
            headers: { 'x-api-key': 'test-key' },
        })

        expect(res.status).toBe(200)
    })

    it('allows backend JWTs without an API key', async () => {
        const { headers, publicJwk } = await createBackendJwtFixture('editor')
        configureBackendPublicJwk(publicJwk)
        const app = createProtectedApp()

        const res = await app.request('/protected', {
            method: 'POST',
            headers,
        })

        expect(res.status).toBe(200)
    })

    it('rejects valid JWTs below the write role threshold', async () => {
        const { headers, publicJwk } = await createBackendJwtFixture('user')
        configureBackendPublicJwk(publicJwk)
        const app = createProtectedApp()

        const res = await app.request('/protected', {
            method: 'POST',
            headers,
        })

        expect(res.status).toBe(403)
    })
})

function createProtectedApp() {
    const app = new Hono<AppContext>()
    app.post('/protected', requireWriteAuth(), (c) => c.json({ ok: true }))
    return app
}
