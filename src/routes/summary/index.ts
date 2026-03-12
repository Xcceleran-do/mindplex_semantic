import { Hono } from 'hono'
import { Embedding } from '$src/lib/Embedding'
import { AppContext } from '$src/types'
import { eq, and } from 'drizzle-orm'
import { vValidator } from '@hono/valibot-validator';
import { IngestSummarySchema, GetSummaryQuerySchema, FORBIDDEN_COLUMNS } from './schema';
import { buildFieldSelection } from '$src/utils';
import { NotFoundError, EmbeddingError } from '$src/lib/errors';

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
            throw new NotFoundError('Article not found');
        }

        let embeddingData = null;
        if (body.tone.toLowerCase() === 'formal') {
            try {
                const embeddingService = new Embedding();
                embeddingData = await embeddingService.getEmbeddings(body.summary);
            } catch (err: any) {
                console.error('Embedding service failed:', err);
                throw new EmbeddingError('Failed to generate embedding for summary', err.message);
            }
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
        if (error instanceof NotFoundError || error instanceof EmbeddingError) {
            throw error;
        }
        console.error('Error adding summary:', error);
        return c.json({ success: false, error: 'Failed to add summary' }, 500);
    }
});

summary.get('/summary', vValidator('query', GetSummaryQuerySchema), async (c) => {
    const { content_id, tone, fields } = c.req.valid('query')
    const db = c.get('db')
    const { summaries, articles: articleTable } = c.get('schema')

    const baseSelection = buildFieldSelection(
        summaries,
        fields,
        FORBIDDEN_COLUMNS,
        { content_id: articleTable.externalId }
    )

    const conditions = [eq(articleTable.externalId, content_id)]
    if (tone) {
        conditions.push(eq(summaries.tone, tone))
    }

    const summaryData = await db
        .select(baseSelection)
        .from(summaries)
        .innerJoin(articleTable, eq(summaries.articleId, articleTable.id))
        .where(and(...conditions))
        
    if (summaryData.length === 0) {
        return c.json({ error: 'Summary not found' }, 404)
    }

    if (tone) {
        return c.json(summaryData[0])
    }

    return c.json({ summaries: summaryData })
})

export default summary;