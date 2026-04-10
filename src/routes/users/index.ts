import { Hono } from 'hono'
import { eq, sql } from 'drizzle-orm'
import {
    ALLOWED_USER_UPDATE_FIELDS,
    FORBIDDEN_USER_COLUMNS,
    ExternalIdParamsSchema,
    GetUserQuerySchema,
    SearchQuerySchema,
    UpdateUserSchema,
    searchUsersDocs,
    getUserDocs,
    updateUserDocs,
    deleteUserDocs,
} from './schema'
import { AppContext } from '$src/types'
import { vValidator } from '@hono/valibot-validator'
import { describeRoute } from 'hono-openapi'
import { buildFieldSelection, sanitizeUpdates } from '$src/utils'
import { searchQuerySql } from '$src/lib/sql/SearchQuerySql'

const users = new Hono<AppContext>()

users.get('/search', describeRoute(searchUsersDocs), vValidator('query', SearchQuerySchema), async (c) => {
    const { limit, page, q: searchQuery, fields } = c.req.valid('query');
    const offset = (page - 1) * limit
    const db = c.get('db')
    const { users } = c.get('schema')

    if (!searchQuery) return c.json({ users: [] })

    const relevanceScore = searchQuerySql.userSearchScore(searchQuery, users).as('relevance_score')

    const selection = buildFieldSelection(users, fields, FORBIDDEN_USER_COLUMNS, {
        id: users.id,
        score: relevanceScore
    })

    const threshold = searchQuery.length < 5 ? 0.39 : 0.3;

    const result = await db.select(selection)
        .from(users)
        .where(searchQuerySql.userSearchFilter(searchQuery, users, threshold))
        .orderBy(sql`relevance_score DESC`)
        .limit(limit)
        .offset(offset);

    return c.json({ users: result, meta: { query: searchQuery, count: result.length, limit, offset } })
})

users.get('/:id', describeRoute(getUserDocs), vValidator('param', ExternalIdParamsSchema), vValidator('query', GetUserQuerySchema), async (c) => {
    const { id: externalId } = c.req.valid('param')
    const { fields } = c.req.valid('query')
    const db = c.get('db')
    const { users } = c.get('schema')

    const selection = buildFieldSelection(users, fields, FORBIDDEN_USER_COLUMNS, { id: users.id })
    const [result] = await db.select(selection).from(users).where(eq(users.externalId, externalId))

    if (!result) return c.json({ error: 'User not found' }, 404)

    return c.json(result)
})

users.patch('/:id', describeRoute(updateUserDocs), vValidator('param', ExternalIdParamsSchema), vValidator('json', UpdateUserSchema), async (c) => {
    const { id: externalId } = c.req.valid('param')
    const updates = c.req.valid('json')
    const db = c.get('db')
    const { users } = c.get('schema')

    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.externalId, externalId))
    if (!existing) return c.json({ error: 'User not found' }, 404)

    const sanitizedUpdates = sanitizeUpdates(updates, ALLOWED_USER_UPDATE_FIELDS)
    if (Object.keys(sanitizedUpdates).length === 0) return c.json({ error: 'No valid fields to update' }, 400)

    const [updated] = await db.update(users).set(sanitizedUpdates).where(eq(users.externalId, externalId)).returning()

    return c.json({ message: 'User updated successfully', user: updated })
})

users.delete('/:id', describeRoute(deleteUserDocs), vValidator('param', ExternalIdParamsSchema), async (c) => {
    const { id: externalId } = c.req.valid('param')
    const db = c.get('db')
    const { users } = c.get('schema')

    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.externalId, externalId))
    if (!existing) return c.json({ error: 'User not found' }, 404)

    await db.delete(users).where(eq(users.externalId, externalId))

    return c.json({ message: 'User deleted successfully', externalId })
})

export default users
