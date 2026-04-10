import { Hono } from 'hono'
import { AppContext } from '$src/types'
import { vValidator } from '@hono/valibot-validator'
import { describeRoute } from 'hono-openapi'
import { FORBIDDEN_COLUMNS, SearchQuerySchema, hybridSearchDocs } from './schema'
import { sql, eq, gt, desc } from 'drizzle-orm'
import { Embedding } from '$src/lib/Embedding'
import { unionAll } from 'drizzle-orm/pg-core'
import { buildFieldSelection } from '$src/utils'
import { searchQuerySql } from '$src/lib/sql/SearchQuerySql'

const search = new Hono<AppContext>()

search.get('/', describeRoute(hybridSearchDocs), vValidator('query', SearchQuerySchema), async (c) => {
    const db = c.get('db')
    const { articles, articleChunks } = c.get('schema')
    const { q: searchQuery, limit, page, fields } = c.req.valid('query')
    const offset = (page - 1) * limit

    if (!searchQuery) return c.json({ articles: [] })

    const embeddingService = new Embedding()
    const queryEmbedding = await embeddingService.getEmbeddings(searchQuery)

    const articleScore = searchQuerySql.hybridScore(articles.embedding, articles.searchVector, queryEmbedding, searchQuery)
    const chunkScore = searchQuerySql.hybridScore(articleChunks.embedding, articleChunks.searchVector, queryEmbedding, searchQuery)

    const articleMatches = db.select({ articleId: articles.id, score: articleScore.as('score') })
        .from(articles).where(gt(articleScore, searchQuerySql.articleThreshold))

    const chunkMatches = db.select({ articleId: articleChunks.articleId, score: chunkScore.as('score') })
        .from(articleChunks).where(gt(chunkScore, searchQuerySql.chunkThreshold))

    const allMatches = unionAll(articleMatches, chunkMatches).as('all_matches')

    const distinctMatches = db.select({
        id: allMatches.articleId,
        finalScore: sql`MAX(${allMatches.score})`.as('final_score')
    })
        .from(allMatches)
        .groupBy(allMatches.articleId)
        .orderBy(desc(sql`final_score`))
        .limit(limit)
        .offset(offset)
        .as('distinct_matches')

    const selection = buildFieldSelection(articles, fields, FORBIDDEN_COLUMNS, { id: articles.id, score: distinctMatches.finalScore })

    const results = await db.select(selection)
        .from(distinctMatches)
        .innerJoin(articles, eq(articles.id, distinctMatches.id))
        .orderBy(desc(distinctMatches.finalScore))

    return c.json({ articles: results, meta: { query: searchQuery, count: results.length } })
})

export default search
