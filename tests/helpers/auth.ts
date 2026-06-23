import { sign } from 'hono/jwt'

import type { Access } from '$src/middleware/guard'

const TEST_JWT_SECRET = 'test-secret'
const BACKEND_JWT_KID = 'backend-test-key'

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
    delete process.env.JWT_PUBLIC_JWK
    delete process.env.JWT_PUBLIC_KEY
    delete process.env.JWT_JWKS_URI
    delete process.env.JWT_ALLOWED_ALGS
    delete process.env.JWT_ISSUER
    delete process.env.JWT_AUDIENCE
    delete process.env.JWT_ROLE_CLAIM
}

export async function createBackendJwtFixture(role: Access = 'editor', extraClaims: Record<string, unknown> = {}) {
    const keyPair = await crypto.subtle.generateKey({ name: 'Ed25519', namedCurve: 'Ed25519' }, true, ['sign', 'verify'])
    const privateJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey) as Record<string, unknown>
    const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey) as Record<string, unknown>

    Object.assign(privateJwk, { alg: 'EdDSA', kid: BACKEND_JWT_KID, use: 'sig' })
    Object.assign(publicJwk, { alg: 'EdDSA', kid: BACKEND_JWT_KID, use: 'sig' })

    const now = Math.floor(Date.now() / 1000)
    const token = await sign({
        sub: 'backend-user',
        role,
        sid: 'session-1',
        iss: 'mindplex',
        aud: 'mindplex-api',
        iat: now,
        nbf: now,
        exp: now + 60 * 60,
        ...extraClaims,
    }, privateJwk as any, 'EdDSA')

    return {
        publicJwk,
        token,
        headers: {
            Authorization: `Bearer ${token}`,
        },
    }
}

export function configureBackendPublicJwk(publicJwk: Record<string, unknown>) {
    clearJwtTestEnv()
    process.env.JWT_PUBLIC_JWK = JSON.stringify(publicJwk)
    process.env.JWT_ALG = 'EdDSA'
    process.env.JWT_ISSUER = 'mindplex'
    process.env.JWT_AUDIENCE = 'mindplex-api'
}

export function configureBackendJwksUri(uri: string) {
    clearJwtTestEnv()
    process.env.JWT_JWKS_URI = uri
    process.env.JWT_ISSUER = 'mindplex'
    process.env.JWT_AUDIENCE = 'mindplex-api'
}

export function clearJwtTestEnv() {
    delete process.env.JWT_SECRET
    delete process.env.JWT_PUBLIC_JWK
    delete process.env.JWT_PUBLIC_KEY
    delete process.env.JWT_JWKS_URI
    delete process.env.JWT_ALG
    delete process.env.JWT_ALLOWED_ALGS
    delete process.env.JWT_ISSUER
    delete process.env.JWT_AUDIENCE
    delete process.env.JWT_ROLE_CLAIM
}
