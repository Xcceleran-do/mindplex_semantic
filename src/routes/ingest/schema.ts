import * as v from 'valibot';
import { resolver } from 'hono-openapi';
import { type DescribeRouteOptions, jsonContent, responses } from '$src/lib/openapi';

// ─── Validation schemas ────────────────────────────────────────────────────────

const NameObjectSchema = v.object({ name: v.string() });
const ObjectOrEmptyArray = v.union([
    NameObjectSchema,
    v.tuple([])
]);

export const IngestArticleSchema = v.object({
    post: v.object({
        id: v.union([
            v.number(),
            v.pipe(v.string(), v.transform(Number))
        ]),
        post_title: v.string(),
        post_name: v.string(),
        post_content: v.string(),
        brief_overview: v.string(),
        author_name: v.string(),
        post_date: v.string(),
        tag: v.optional(ObjectOrEmptyArray, []),
        category: v.optional(ObjectOrEmptyArray, []),
        other_authors: v.optional(v.tuple([]), []),
        co_authors: v.optional(v.tuple([]), []),
        post_editors: v.optional(v.tuple([]), []),
    })
});

export const IngestUserSchema = v.object({
    id: v.number(),
    firstName: v.string(),
    lastName: v.string(),
    username: v.string(),
    email: v.string(),
});

// ─── Route documentation ───────────────────────────────────────────────────────

export const ingestArticleDocs: DescribeRouteOptions = {
    tags: ['Ingest'],
    summary: 'Ingest article',
    operationId: 'ingestArticle',
    description: `Create a new article with full processing:
- Generate embeddings for title and teaser
- Chunk content into searchable segments
- Generate embeddings for each chunk
- Create full-text search vectors

This is a heavy operation and may take several seconds.`,
    requestBody: {
        required: true,
        content: { 'application/json': { schema: resolver(IngestArticleSchema) } }
    },
    responses: {
        200: jsonContent({
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                chunksCreated: { type: 'integer' }
            }
        }, 'Article ingested successfully'),
        409: responses.conflict('Article already exists'),
        500: responses.internalError,
        502: responses.embeddingError,
    }
};

export const ingestUserDocs: DescribeRouteOptions = {
    tags: ['Ingest'],
    summary: 'Ingest user',
    operationId: 'ingestUser',
    description: 'Create a new user with search index generation.',
    requestBody: {
        required: true,
        content: { 'application/json': { schema: resolver(IngestUserSchema) } }
    },
    responses: {
        200: jsonContent({
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                message: { type: 'string' }
            }
        }, 'User ingested successfully'),
        409: responses.conflict('User already exists'),
        500: responses.internalError,
    }
};
