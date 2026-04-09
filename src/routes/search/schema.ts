import * as v from 'valibot';
import { createFieldsSchema } from '$src/utils';
import { articles } from '$src/db/schema';
import { PaginationLimitSchema, PaginationPageSchema } from '$src/lib/validators'
import { type DescribeRouteOptions, param, limitParam, pageParam, fieldsParam, jsonContent, ref, responses } from '$src/lib/openapi';

// ─── Constants ────────────────────────────────────────────────────────────────

export const FORBIDDEN_COLUMNS = new Set(['embedding', 'searchVector']);

// ─── Validation schemas ────────────────────────────────────────────────────────

export const SearchQuerySchema = v.object({
    q: v.optional(v.string()),
    limit: PaginationLimitSchema,
    page: PaginationPageSchema,
    fields: createFieldsSchema(articles, FORBIDDEN_COLUMNS),
});

export type SearchQuery = v.InferOutput<typeof SearchQuerySchema>;

// ─── Route documentation ───────────────────────────────────────────────────────

export const hybridSearchDocs: DescribeRouteOptions = {
    tags: ['Search'],
    summary: 'Hybrid search',
    operationId: 'hybridSearch',
    description: 'Standalone hybrid search combining vector embeddings (70%) and full-text ranking (30%) across articles and their chunks.',
    parameters: [
        param({ name: 'q', in: 'query', required: true, description: 'Search query', schema: { type: 'string', example: 'artificial intelligence ethics' } }),
        limitParam,
        pageParam,
        fieldsParam,
    ],
    responses: {
        200: jsonContent({
            type: 'object',
            properties: {
                articles: { type: 'array', items: ref('ArticleSearchResult') },
                meta: {
                    type: 'object',
                    properties: {
                        query: { type: 'string' },
                        count: { type: 'integer' }
                    }
                }
            }
        }, 'Search results'),
        400: responses.badRequest,
    }
};
