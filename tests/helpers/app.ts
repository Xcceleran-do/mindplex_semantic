import { Hono } from 'hono'
import { createMiddleware } from 'hono/factory'
import * as schema from '$src/db/schema'
import type { AppContext } from '$src/types'

export function createTestApp(router: Hono<AppContext>, mockDb: any, mountPath = '/') {
    const app = new Hono<AppContext>()

    app.use(
        createMiddleware<AppContext>(async (c, next) => {
            c.set('db', mockDb)
            c.set('schema', schema)
            await next()
        })
    )

    app.route(mountPath, router)
    return app
}
