import { sign } from 'hono/jwt'

import type { Access } from '$src/middleware/guard'

const TEST_JWT_SECRET = 'test-secret'

export async function createAuthHeaders(role: Access = 'admin', extraClaims: Record<string, unknown> = {}) {
    configureJwtTestEnv()

    const now = Math.floor(Date.now() / 1000)
    const token = await sign({
        sub: 'test-user',
        role,
        iat: now,
        exp: now + 60 * 60,
        ...extraClaims,
    }, TEST_JWT_SECRET, 'HS256')

    return {
        Authorization: `Bearer ${token}`,
    }
}

function configureJwtTestEnv() {
    process.env.JWT_SECRET = TEST_JWT_SECRET
    process.env.JWT_ALG = 'HS256'
    delete process.env.JWT_PUBLIC_KEY
    delete process.env.JWT_JWKS_URI
    delete process.env.JWT_ALLOWED_ALGS
    delete process.env.JWT_ISSUER
    delete process.env.JWT_AUDIENCE
    delete process.env.JWT_ROLE_CLAIM
}
