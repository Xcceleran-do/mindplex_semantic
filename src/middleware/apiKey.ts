import { createMiddleware } from 'hono/factory'

import type { AppContext } from '$src/types'

type ApiKeyOptions = {
    envKeys?: string[]
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
    return authorization?.split(/\s+/, 2)[1] ?? null
}

export function requireApiKey(options: ApiKeyOptions = {}) {
    const envKeys = options.envKeys ?? ['INGEST_API_KEY', 'API_KEY']

    return createMiddleware<AppContext>(async (c, next) => {
        const configuredApiKey = getConfiguredApiKey(envKeys)

        if (!configuredApiKey) {
            console.error(`API key protection is enabled, but none of these env vars are configured: ${envKeys.join(', ')}`)
            return c.json({
                success: false,
                error: 'API key authentication is not configured',
            }, 500)
        }

        const providedApiKey = getProvidedApiKey(c)

        if (!providedApiKey) {
            return c.json({
                success: false,
                error: 'API key required',
            }, 401)
        }

        if (providedApiKey !== configuredApiKey) {
            return c.json({
                success: false,
                error: 'Invalid API key',
            }, 403)
        }

        await next()
    })
}
