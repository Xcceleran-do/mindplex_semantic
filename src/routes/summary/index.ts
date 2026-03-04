import { Hono } from 'hono'
import { Embedding } from '$src/lib/Embedding'
import { AppContext } from '$src/types'
import { eq, and } from 'drizzle-orm'
import { vValidator } from '@hono/valibot-validator';
import { IngestSummarySchema, GetSummaryQuerySchema } from './schema';

const summary = new Hono<AppContext>()

summary.post('/summary', vValidator('json', IngestSummarySchema), async (c) => {
    const body = c.req.valid('json');
    const db = c.get('db');
    const schema = c.get('schema');

    try {
        const article = await db.query.articles.findFirst({
            where: eq(schema.articles.externalId, body.content_id),
            columns: { id: true }
        });

        if (!article) {
            return c.json({ success: false, error: 'Article not found' }, 404);
        }

        let embeddingData = null;
        if (body.tone.toLowerCase() === 'formal') {
            const embeddingService = new Embedding();
            embeddingData = await embeddingService.getEmbeddings(body.summary);
        }

        await db.insert(schema.summaries)
            .values({
                articleId: article.id,
                tone: body.tone,
                summary: body.summary,
                embedding: embeddingData
            })
            .onConflictDoUpdate({
                target: [schema.summaries.articleId, schema.summaries.tone],
                set: {
                    summary: body.summary,
                    embedding: embeddingData,
                    updatedAt: new Date()
                }
            });

        return c.json({ success: true, message: 'Summary added successfully' });
    } catch (error) {
        console.error('Error adding summary:', error);
        return c.json({ success: false, error: 'Failed to add summary' }, 500);
    }
});

summary.get('/summary', vValidator('query', GetSummaryQuerySchema), async (c) => {
    const { content_id, tone } = c.req.valid('query')
    const db = c.get('db')
    const { summaries, articles: articleTable } = c.get('schema')

    const summaryData = await db
        .select({
            content_id: articleTable.externalId,
            tone: summaries.tone,
            summary: summaries.summary
        })
        .from(summaries)
        .innerJoin(articleTable, eq(summaries.articleId, articleTable.id))
        .where(
            and(
                eq(articleTable.externalId, content_id),
                eq(summaries.tone, tone)
            )
        )
        .limit(1)

    if (summaryData.length === 0) {
        return c.json({ error: 'Summary not found' }, 404)
    }

    return c.json(summaryData[0])
})

export default summary;