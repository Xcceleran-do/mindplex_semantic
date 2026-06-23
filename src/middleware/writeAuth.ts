import { createMiddleware } from 'hono/factory'

import type { AppContext } from '$src/types'
import { authenticateRequest, authMeetsMode, isJwtAuthConfigured, type Access } from '$src/middleware/guard'

type WriteAuthOptions = {
    apiKeyEnvKeys?: string[]
    jwtAccess?: Access | 'authenticated'
}

type ApiKeyStatus = 'valid' | 'invalid' | 'missing' | 'not-configured'

const DEFAULT_API_KEY_ENVS = ['INGEST_API_KEY', 'API_KEY']

export function requireWriteAuth(options: WriteAuthOptions = {}) {
    const apiKeyEnvKeys = options.apiKeyEnvKeys ?? DEFAULT_API_KEY_ENVS
    const jwtAccess = options.jwtAccess ?? 'editor'

    return createMiddleware<AppContext>(async (c, next) => {
        const apiKeyStatus = checkApiKey(c, apiKeyEnvKeys)

        if (apiKeyStatus === 'valid') {
            await next()
            return
        }

        if (apiKeyStatus === 'invalid') {
            return c.json({
                success: false,
                error: 'Invalid API key',
            }, 403)
        }

        const hasBearerToken = isBearerAuthorization(c.req.header('authorization'))
        let jwtConfigured = false
        try {
            jwtConfigured = isJwtAuthConfigured()
        } catch (error) {
            console.error('JWT verification configuration is invalid:', error)
            return c.json({
                success: false,
                error: 'Authentication is not configured',
            }, 500)
        }

        if (hasBearerToken || jwtConfigured) {
            const { auth, response } = await authenticateRequest(c)

            if (response) return response

            if (auth) {
                if (authMeetsMode(auth, jwtAccess)) {
                    await next()
                    return
                }

                return c.json({
                    success: false,
                    error: 'Insufficient permissions',
                }, 403)
            }
        }

        if (apiKeyStatus === 'not-configured' && !jwtConfigured) {
            console.error(`Write protection is enabled, but no JWT verifier or API key env vars are configured: ${apiKeyEnvKeys.join(', ')}`)
            return c.json({
                success: false,
                error: 'Authentication is not configured',
            }, 500)
        }

        return c.json({
            success: false,
            error: 'Authentication required',
        }, 401)
    })
}

function checkApiKey(c: Parameters<ReturnType<typeof createMiddleware<AppContext>>>[0], envKeys: string[]): ApiKeyStatus {
    const configuredApiKey = getConfiguredApiKey(envKeys)
    const providedApiKey = getProvidedApiKey(c)

    if (!configuredApiKey) return 'not-configured'
    if (!providedApiKey) return 'missing'
    return providedApiKey === configuredApiKey ? 'valid' : 'invalid'
}

function getConfiguredApiKey(envKeys: string[]) {
    for (const key of envKeys) {
        const value = process.env[key]
        if (value) return value
    }

    return null
}

function getProvidedApiKey(c: Parameters<ReturnType<typeof createMiddleware<AppContext>>>[0]) {
    const xApiKey = c.req.header('x-api-key')
    if (xApiKey) return xApiKey

    const authorization = c.req.header('authorization')
    if (!authorization) return null

    const [scheme, token] = authorization.split(/\s+/, 2)
    if (!scheme || !token || scheme.toLowerCase() === 'bearer') return null

    return token
}

function isBearerAuthorization(value: string | undefined) {
    return value?.split(/\s+/, 1)[0]?.toLowerCase() === 'bearer'
}
