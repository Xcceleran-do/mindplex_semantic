import { createMiddleware } from "hono/factory"
import type { AppContext, Access, AuthUser } from "$src/types"
import { ACCESS } from "$src/types"
import { createHmac, createPublicKey, createVerify, timingSafeEqual } from "node:crypto"

// role levels
const ACCESS_RANK: Record<Access, number> = {
    [ACCESS.Collaborator]: 1,
    [ACCESS.Editor]: 2,
    [ACCESS.Admin]: 3,
}

type GuardMode = "optional" | Access

// jwt payload shape
type JwtPayload = {
    sub?: string
    email?: string
    role?: string
    access?: string
    exp?: number
    iat?: number
    iss?: string
    aud?: string | string[]
    [key: string]: unknown
}

// get bearer token from header
// Authorization: Bearer token_here
function getBearerToken(authHeader?: string): string | null {
    if (!authHeader) return null

    const [scheme, token] = authHeader.split(" ")

    if (!scheme || !token) return null
    if (scheme.toLowerCase() !== "bearer") return null

    return token
}

// jwt uses base64url so convert it
function base64UrlToBase64(value: string) {
    return value.replace(/-/g, '+').replace(/_/g, '/')
}

// decode base64url
function decodeBase64Url(value: string) {
    const base64 = base64UrlToBase64(value)
    const pad = '='.repeat((4 - (base64.length % 4)) % 4)
    return Buffer.from(base64 + pad, 'base64')
}

// encode to base64url
function encodeBase64Url(value: Buffer) {
    return value
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '')
}

// verify hs256 token with secret
function verifyHs256(token: string, secret: string) {
    const parts = token.split('.')
    if (parts.length !== 3) throw new Error("Malformed JWT")

    const [headerPart, payloadPart, signaturePart] = parts
    const signingInput = `${headerPart}.${payloadPart}`

    const expected = encodeBase64Url(
        createHmac('sha256', secret).update(signingInput).digest()
    )

    const expectedBuf = Buffer.from(expected)
    const actualBuf = Buffer.from(signaturePart)

    if (expectedBuf.length !== actualBuf.length) return false

    return timingSafeEqual(expectedBuf, actualBuf)
}

// verify rs256 token with public key
function verifyRs256(token: string, publicKey: string) {
    const parts = token.split('.')
    if (parts.length !== 3) throw new Error("Malformed JWT")

    const [headerPart, payloadPart, signaturePart] = parts
    const signingInput = `${headerPart}.${payloadPart}`
    const signature = decodeBase64Url(signaturePart)

    const key = createPublicKey(publicKey)

    return createVerify('RSA-SHA256')
        .update(signingInput)
        .verify(key, signature)
}

// verify full jwt
function verifyJwt(token: string) {
    const parts = token.split(".")
    if (parts.length !== 3) throw new Error("Malformed JWT")

    const [headerPart, payloadPart] = parts

    const header = JSON.parse(
        decodeBase64Url(headerPart).toString("utf8")
    ) as { alg?: string }

    const payload = JSON.parse(
        decodeBase64Url(payloadPart).toString("utf8")
    ) as JwtPayload

    // use env algorithm first or token header
    const algorithm = c.env?.JWT_ALGORITHM || process.env.JWT_ALGORITHM || header.alg || "HS256"

    // verify signature
    if (algorithm === "HS256") {
        const secret = process.env.JWT_SECRET
        if (!secret) throw new Error("JWT_SECRET not configured")

        const valid = verifyHs256(token, secret)
        if (!valid) throw new Error("Invalid signature")
    } else if (algorithm === "RS256") {
        const publicKey = process.env.JWT_PUBLIC_KEY
        if (!publicKey) throw new Error("JWT_PUBLIC_KEY not configured")

        const valid = verifyRs256(token, publicKey)
        if (!valid) throw new Error("Invalid signature")
    } else {
        throw new Error("Unsupported JWT algorithm")
    }

    const now = Math.floor(Date.now() / 1000)

    // check exp
    if (payload.exp && now >= payload.exp) {
        throw new Error("Token expired")
    }

    // check issuer
    if (process.env.JWT_ISSUER && payload.iss !== process.env.JWT_ISSUER) {
        throw new Error("Invalid issuer")
    }

    // check audience
    if (process.env.JWT_AUDIENCE) {
        const audience = payload.aud
        const expectedAudience = process.env.JWT_AUDIENCE

        const validAudience =
            typeof audience === "string"
                ? audience === expectedAudience
                : Array.isArray(audience)
                    ? audience.includes(expectedAudience)
                    : false

        if (!validAudience) {
            throw new Error("Invalid audience")
        }
    }

    return payload
}

// make sure role is valid
function normalizeRole(value: unknown): Access {
    const role = String(value || "").toLowerCase()

    if (role === ACCESS.Admin) return ACCESS.Admin
    if (role === ACCESS.Editor) return ACCESS.Editor
    if (role === ACCESS.Collaborator) return ACCESS.Collaborator

    throw new Error("Missing or invalid role claim")
}

// compare user role with needed role
function canAccess(userRole: Access, required: Access) {
    return ACCESS_RANK[userRole] >= ACCESS_RANK[required]
}

// main middleware
// guard() admin by default
// guard("optional") token optional
// guard("editor") editor and above
// guard("admin") admin only
// guard("collaborator") collaborator and above
export function guard(mode: GuardMode = ACCESS.Admin) {
    return createMiddleware<AppContext>(async (c, next) => {
        const authHeader = c.req.header("Authorization")
        const token = getBearerToken(authHeader)

        // no token
        if (!token) {
            // optional means continue without failing
            if (mode === "optional") {
                await next()
                return
            }

            return c.json({ error: "Unauthorized" }, 401)
        }

        try {
            // verify jwt
            const payload = verifyJwt(token)

            // get role from role or access
            const role = normalizeRole(payload.role ?? payload.access)

            const authUser: AuthUser = {
                sub: typeof payload.sub === "string" ? payload.sub : undefined,
                email: typeof payload.email === "string" ? payload.email : undefined,
                role,
                raw: payload
            }

            // save auth data in context
            c.set("authUser", authUser)
            c.set("authToken", token)

            // if not optional then check role
            if (mode !== "optional") {
                if (!canAccess(role, mode)) {
                    return c.json({ error: "Forbidden" }, 403)
                }
            }

            await next()
        } catch (error) {
            console.error("JWT verification failed", error)
            return c.json({ error: "Invalid token" }, 401)
        }
    })
}