import { Hono } from 'hono'
import { RetrieveChunksSchema, retrieveChunksDocs } from './schema'
import { Embedding } from '$src/lib/Embedding'
import { eq, and, desc, isNotNull } from 'drizzle-orm'
import type { AppContext } from '$src/types'
import { vValidator } from '@hono/valibot-validator'
import { describeRoute } from 'hono-openapi'
import { searchQuerySql } from '$src/lib/sql/SearchQuerySql'

const retrieval = new Hono<AppContext>()

retrieval.post('/chunks', describeRoute(retrieveChunksDocs), vValidator('json', RetrieveChunksSchema), async (c) => {
    const db = c.get('db');
    const { articles, articleChunks } = c.get('schema');
    const body = c.req.valid('json');

    const userQuery = body.user_query;
    const k = body.k ?? 3;
    const articleId = body.filters?.article_id;

    if (!userQuery) return c.json({})

    const embeddingService = new Embedding();
    const queryEmbedding = await embeddingService.getEmbeddings(userQuery);

    const embedding = Array.isArray(queryEmbedding[0]) ? queryEmbedding[0] : queryEmbedding;
    const score = searchQuerySql.similarityScore(articleChunks.embedding, embedding).as('score');
    const conditions = [isNotNull(articleChunks.embedding)];

    if (articleId) conditions.push(eq(articles.externalId, articleId));

    const rows = await db
        .select({
            chunkId: articleChunks.articleId,
            text: articleChunks.rawContent,
            score,
            slug: articles.slug,
        })
        .from(articleChunks)
        .innerJoin(articles, eq(articleChunks.articleId, articles.id))
        .where(and(...conditions))
        .orderBy(desc(score))
        .limit(k);

    return c.json(rows.map((row) => ({
        chunk_id: String(row.chunkId),
        text: row.text,
        score: Number(row.score),
        metadata: { slug: row.slug },
    })), 200);
})

export default retrieval
