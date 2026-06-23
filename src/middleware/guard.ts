import { createMiddleware } from 'hono/factory'
import { verify, verifyWithJwks } from 'hono/jwt'

import type { AppContext } from '$src/types'

export const ACCESS = {
    user: 0,
    collaborator: 1,
    editor: 2,
    moderator: 3,
    admin: 4,
} as const

export type Access = keyof typeof ACCESS
export type GuardMode = 'optional' | 'authenticated' | Access

export type AuthTokenPayload = {
    [key: string]: unknown
    sub?: string
    exp?: number
    nbf?: number
    iat?: number
    iss?: string
    aud?: string | string[]
}

export type AuthContextValue = {
    token: string
    payload: AuthTokenPayload
    access: Access | null
    roles: Access[]
    subject: string | null
}

type JwtVerificationConfig =
    | {
        kind: 'secret'
        secret: string
        alg: string
        verification: JwtVerificationOptions
    }
    | {
        kind: 'public-key'
        publicKey: string | Record<string, unknown>
        alg: string
        verification: JwtVerificationOptions
    }
    | {
        kind: 'jwks'
        jwksUri: string
        allowedAlgorithms: string[]
        verification: JwtVerificationOptions
    }

type JwtVerificationOptions = {
    iss?: string
    aud?: string | string[]
}

type AuthenticateResult = {
    auth: AuthContextValue | null
    response: Response | null
}

type MiddlewareContext = Parameters<ReturnType<typeof createMiddleware<AppContext>>>[0]

const ACCESS_ALIASES: Record<string, Access> = {
    admin: 'admin',
    administrator: 'admin',
    collaborator: 'collaborator',
    editor: 'editor',
    moderator: 'moderator',
    user: 'user',
}

const DEFAULT_ROLE_CLAIMS = [
    'role',
    'roles',
    'scope',
    'scp',
    'permissions',
    'realm_access.roles',
] as const

export function guard(mode: GuardMode = 'admin') {
    return createMiddleware<AppContext>(async (c, next) => {
        const { auth, response } = await authenticateRequest(c)

        if (response) return response

        if (mode === 'optional') {
            await next()
            return
        }

        if (!auth) {
            return c.json({
                success: false,
                error: 'Authentication required',
            }, 401)
        }

        if (!authMeetsMode(auth, mode)) {
            return c.json({
                success: false,
                error: 'Insufficient permissions',
            }, 403)
        }

        await next()
    })
}

export async function authenticateRequest(c: MiddlewareContext): Promise<AuthenticateResult> {
    const cached = c.get('auth')
    if (cached !== undefined) {
        return { auth: cached, response: null }
    }

    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
        c.set('auth', null)
        c.set('jwtPayload', null)
        return { auth: null, response: null }
    }

    const token = extractBearerToken(authHeader)
    if (!token) {
        return {
            auth: null,
            response: c.json({
                success: false,
                error: 'Invalid Authorization header',
            }, 401),
        }
    }

    let config: JwtVerificationConfig | null
    try {
        config = getJwtVerificationConfig()
    } catch (error) {
        console.error('JWT verification configuration is invalid:', error)
        return {
            auth: null,
            response: c.json({
                success: false,
                error: 'Authentication is not configured',
            }, 500),
        }
    }

    if (!config) {
        console.error('JWT auth is enabled on a route, but verification is not configured')
        return {
            auth: null,
            response: c.json({
                success: false,
                error: 'Authentication is not configured',
            }, 500),
        }
    }

    try {
        const payload = await verifyJwtToken(token, config)
        const roles = extractAccessRoles(payload)
        const access = roles.length > 0 ? roles[roles.length - 1] : null
        const auth = {
            token,
            payload,
            access,
            roles,
            subject: typeof payload.sub === 'string' ? payload.sub : null,
        } satisfies AuthContextValue

        c.set('auth', auth)
        c.set('jwtPayload', payload)
        return { auth, response: null }
    } catch (error) {
        console.error('JWT verification failed:', error)
        return {
            auth: null,
            response: c.json({
                success: false,
                error: 'Invalid or expired token',
            }, 401),
        }
    }
}

function extractBearerToken(headerValue: string) {
    const [scheme, token] = headerValue.split(/\s+/, 2)
    if (scheme !== 'Bearer' || !token) return null
    return token
}

export function authMeetsMode(auth: AuthContextValue, mode: Exclude<GuardMode, 'optional'>) {
    if (mode === 'authenticated') return true
    return hasRequiredAccess(auth.access, mode)
}

export function hasRequiredAccess(current: Access | null, required: Access) {
    if (!current) return false
    return ACCESS[current] >= ACCESS[required]
}

export function isJwtAuthConfigured() {
    return getJwtVerificationConfig() !== null
}

function getJwtVerificationConfig(): JwtVerificationConfig | null {
    const verification = buildVerificationOptions()
    const secret = process.env.JWT_SECRET?.trim()
    const publicJwk = parseJsonEnv(process.env.JWT_PUBLIC_JWK)
    const publicKey = normalizeMultilineEnv(process.env.JWT_PUBLIC_KEY)
    const jwksUri = process.env.JWT_JWKS_URI?.trim()
    const alg = process.env.JWT_ALG?.trim()

    if (secret) {
        return {
            kind: 'secret',
            secret,
            alg: alg || 'HS256',
            verification,
        }
    }

    if (publicJwk) {
        return {
            kind: 'public-key',
            publicKey: publicJwk,
            alg: alg || inferJwkAlg(publicJwk) || 'EdDSA',
            verification,
        }
    }

    if (publicKey) {
        return {
            kind: 'public-key',
            publicKey,
            alg: alg || 'RS256',
            verification,
        }
    }

    if (jwksUri) {
        const allowedAlgorithms = parseCsv(process.env.JWT_ALLOWED_ALGS)
        return {
            kind: 'jwks',
            jwksUri,
            allowedAlgorithms: allowedAlgorithms.length > 0 ? allowedAlgorithms : (alg ? [alg] : ['EdDSA', 'RS256']),
            verification,
        }
    }

    return null
}

function buildVerificationOptions(): JwtVerificationOptions {
    const issuer = process.env.JWT_ISSUER?.trim()
    const audiences = parseCsv(process.env.JWT_AUDIENCE)

    return {
        ...(issuer ? { iss: issuer } : {}),
        ...(audiences.length === 1 ? { aud: audiences[0] } : audiences.length > 1 ? { aud: audiences } : {}),
    }
}

async function verifyJwtToken(token: string, config: JwtVerificationConfig): Promise<AuthTokenPayload> {
    if (config.kind === 'secret') {
        return await verify(token, config.secret, {
            alg: config.alg as any,
            ...config.verification,
        }) as AuthTokenPayload
    }

    if (config.kind === 'public-key') {
        return await verify(token, config.publicKey, {
            alg: config.alg as any,
            ...config.verification,
        }) as AuthTokenPayload
    }

    return await verifyWithJwks(token, {
        jwks_uri: config.jwksUri,
        allowedAlgorithms: config.allowedAlgorithms as any,
        verification: config.verification,
    }) as AuthTokenPayload
}

function extractAccessRoles(payload: AuthTokenPayload) {
    const claimPaths = getRoleClaimPaths()
    const normalized = new Set<Access>()

    for (const claimPath of claimPaths) {
        const claimValue = readClaim(payload, claimPath)
        for (const candidate of flattenClaimValues(claimValue)) {
            const role = normalizeAccess(candidate)
            if (role) normalized.add(role)
        }
    }

    return [...normalized].sort((left, right) => ACCESS[left] - ACCESS[right])
}

function getRoleClaimPaths() {
    const configured = parseCsv(process.env.JWT_ROLE_CLAIM)
    const claimPaths = configured.length > 0 ? configured : [...DEFAULT_ROLE_CLAIMS]
    return [...new Set(claimPaths)]
}

function readClaim(payload: AuthTokenPayload, path: string): unknown {
    const segments = path.split('.').filter(Boolean)
    let current: unknown = payload

    for (const segment of segments) {
        if (!current || typeof current !== 'object' || !(segment in current)) return undefined
        current = (current as Record<string, unknown>)[segment]
    }

    return current
}

function flattenClaimValues(value: unknown): string[] {
    if (typeof value === 'string') return splitRoleString(value)
    if (Array.isArray(value)) return value.flatMap(flattenClaimValues)
    return []
}

function splitRoleString(value: string) {
    return value
        .split(/[\s,]+/)
        .map((item) => item.trim())
        .filter(Boolean)
}

function normalizeAccess(value: string): Access | null {
    return ACCESS_ALIASES[value.trim().toLowerCase()] ?? null
}

function parseCsv(value: string | undefined) {
    if (!value) return []
    return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
}

function normalizeMultilineEnv(value: string | undefined) {
    if (!value) return undefined
    return value.replace(/\\n/g, '\n').trim()
}

function parseJsonEnv(value: string | undefined) {
    if (!value?.trim()) return null

    try {
        const parsed = JSON.parse(value)
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('JWT_PUBLIC_JWK must be a JSON object')
        }
        return parsed as Record<string, unknown>
    } catch (error) {
        throw new Error(`Invalid JWT_PUBLIC_JWK: ${(error as Error).message}`)
    }
}

function inferJwkAlg(jwk: Record<string, unknown>) {
    if (typeof jwk.alg === 'string') return jwk.alg
    if (jwk.kty === 'OKP' && jwk.crv === 'Ed25519') return 'EdDSA'
    if (jwk.kty === 'RSA') return 'RS256'
    if (jwk.kty === 'EC' && jwk.crv === 'P-256') return 'ES256'
    if (jwk.kty === 'EC' && jwk.crv === 'P-384') return 'ES384'
    if (jwk.kty === 'EC' && jwk.crv === 'P-521') return 'ES512'
    return null
}
