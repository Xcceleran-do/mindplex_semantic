import { Hono } from 'hono'
import { sql } from 'drizzle-orm'
import { SearchQuerySchema } from './schema'
import { AppContext } from '$src/types'
import { vValidator } from '@hono/valibot-validator';

const users = new Hono<AppContext>()

export const getSearchScoreSql = (query: string) => sql`
  (
    word_similarity(${query}, users.search_name)
    + (CASE WHEN users.first_name ILIKE ${query} THEN 2.0 ELSE 0 END) -- Tier 1: Exact Name (+2.0)
    + (CASE WHEN users.first_name ILIKE ${query} || '%' THEN 1.2 ELSE 0 END) -- Tier 2: Name Start (+1.2)
    + (CASE WHEN users.username ILIKE ${query} || '%' THEN 0.8 ELSE 0 END) -- Tier 3: Username Start (+0.8)
    + (CASE WHEN users.email ILIKE ${query} || '%' THEN 0.5 ELSE 0 END) -- Tier 4: Email Start (+0.5)
    - (LENGTH(users.first_name) - LENGTH(${query})) * 0.01 -- Tie-breaker: Length penalty (-0.01 per char diff)
  )
`;

users.get('/', vValidator('query', SearchQuerySchema), async (c) => {
    const { limit, offset, q: searchQuery } = c.req.valid('query');

    const db = c.get('db')
    const schema = c.get('schema')

    if (!searchQuery) {
        return c.json({ users: [] })
    }

    const threshold = searchQuery.length < 5 ? 0.39 : 0.3;

    const users = await db.select({
        id: schema.users.id,
        firstName: schema.users.firstName,
        username: schema.users.username,
        email: schema.users.email,
        score: getSearchScoreSql(searchQuery).as('relevance_score')
    })
        .from(schema.users)
        .where(sql`
        (${schema.users.firstName} ILIKE ${searchQuery} || '%') 
        OR (${schema.users.username} ILIKE ${searchQuery} || '%') 
        OR (${schema.users.email} ILIKE ${searchQuery} || '%')
        OR (word_similarity(${searchQuery}, ${schema.users.searchName}) > ${threshold})
    `)
        .orderBy(sql`relevance_score DESC`)
        .limit(limit)
        .offset(offset);

    return c.json({ users, query: searchQuery, limit, offset, total: users.length })
})

export default users