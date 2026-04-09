import * as v from 'valibot';
import { articles, articleChunks } from '$src/db/schema';
import { createFieldsSchema } from '$src/utils';
import { PaginationLimitSchema, PaginationPageSchema, IdParamSchema } from '$src/lib/validators';
import { resolver } from 'hono-openapi';
import { type DescribeRouteOptions, param, limitParam, pageParam, fieldsParam, externalIdParam, jsonContent, ref, responses } from '$src/lib/openapi';


export const FORBIDDEN_COLUMNS = new Set(['embedding', 'searchVector', 'id']);
export const ALLOWED_UPDATE_FIELDS = new Set(['title', 'teaser', 'content', 'category', 'tags', 'slug']);


export const SearchQuerySchema = v.object({
    q: v.optional(v.string()),
    limit: PaginationLimitSchema,
    page: PaginationPageSchema,
    fields: createFieldsSchema(articles, FORBIDDEN_COLUMNS),
});

export const ExternalIdParamsSchema = v.object({
    id: IdParamSchema
});

export const GetArticleQuerySchema = v.object({
    fields: createFieldsSchema(articles, FORBIDDEN_COLUMNS),
});

export const UpdateArticleSchema = v.object({
    title: v.optional(v.string()),
    teaser: v.optional(v.string()),
    content: v.optional(v.string()),
    category: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
});

export const RelatedArticlesQuerySchema = v.object({
    limit: PaginationLimitSchema,
    fields: createFieldsSchema(articles, FORBIDDEN_COLUMNS),
});

export const GetChunksQuerySchema = v.object({
    fields: createFieldsSchema(articleChunks, new Set([])),
});

// ─── Route documentation ───────────────────────────────────────────────────────

export const searchArticlesDocs: DescribeRouteOptions = {
    tags: ['Articles'],
    summary: 'Search articles',
    operationId: 'searchArticles',
    description: 'Hybrid semantic search combining vector embeddings and full-text search. Returns articles ranked by relevance score (70% vector, 30% text).',
    parameters: [
        param({ name: 'q', in: 'query', required: true, description: 'Search query (semantic + full-text)', schema: { type: 'string', example: 'machine learning best practices' } }),
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
                        count: { type: 'integer' },
                        limit: { type: 'integer' },
                        offset: { type: 'integer' }
                    }
                }
            }
        }, 'Search results'),
        400: responses.badRequest,
    }
};

export const listArticlesDocs: DescribeRouteOptions = {
    tags: ['Articles'],
    summary: 'List articles',
    operationId: 'listArticles',
    parameters: [limitParam, pageParam],
    responses: {
        200: jsonContent({
            type: 'object',
            properties: {
                articles: { type: 'array', items: ref('Article') },
                meta: {
                    type: 'object',
                    properties: {
                        page: { type: 'integer' },
                        limit: { type: 'integer' }
                    }
                }
            }
        }, 'Paginated list of articles'),
    }
};

export const getArticleDocs: DescribeRouteOptions = {
    tags: ['Articles'],
    summary: 'Get article by ID',
    operationId: 'getArticle',
    description: 'Retrieve a single article by its external ID.',
    parameters: [externalIdParam('Article external ID'), fieldsParam],
    responses: {
        200: jsonContent(ref('Article'), 'Article found'),
        404: responses.notFound,
    }
};

export const updateArticleDocs: DescribeRouteOptions = {
    tags: ['Articles'],
    summary: 'Update article',
    operationId: 'updateArticle',
    description: 'Update article metadata. Does not re-generate embeddings. Only specified fields are updated.',
    parameters: [externalIdParam('Article external ID')],
    requestBody: {
        required: true,
        content: { 'application/json': { schema: resolver(UpdateArticleSchema) } }
    },
    responses: {
        200: jsonContent({
            type: 'object',
            properties: {
                message: { type: 'string' },
                article: ref('Article')
            }
        }, 'Article updated'),
        400: responses.badRequest,
        404: responses.notFound,
    }
};

export const deleteArticleDocs: DescribeRouteOptions = {
    tags: ['Articles'],
    summary: 'Delete article',
    operationId: 'deleteArticle',
    description: 'Permanently delete an article and all its chunks.',
    parameters: [externalIdParam('Article external ID')],
    responses: {
        200: jsonContent({
            type: 'object',
            properties: {
                message: { type: 'string' },
                externalId: { type: 'integer' }
            }
        }, 'Article deleted'),
        404: responses.notFound,
    }
};

export const getArticleChunksDocs: DescribeRouteOptions = {
    tags: ['Articles'],
    summary: 'Get article chunks',
    operationId: 'getArticleChunks',
    description: 'Retrieve the processed text segments used for RAG and embeddings.',
    parameters: [externalIdParam('Article external ID'), fieldsParam],
    responses: {
        200: jsonContent(ref('ChunkResponse'), 'Article chunks'),
        404: responses.notFound,
    }
};

export const getRelatedArticlesDocs: DescribeRouteOptions = {
    tags: ['Articles'],
    summary: 'Get related articles',
    operationId: 'getRelatedArticles',
    description: 'Find semantically similar articles using vector distance. Falls back to full-text search if the article has no embedding.',
    parameters: [
        externalIdParam('Article external ID'),
        limitParam,
        fieldsParam,
    ],
    responses: {
        200: jsonContent({
            type: 'object',
            properties: {
                articles: { type: 'array', items: ref('Article') },
                meta: {
                    type: 'object',
                    properties: {
                        limit: { type: 'integer' },
                        count: { type: 'integer' },
                        strategy: { type: 'string', enum: ['vector', 'fts_fallback'] }
                    }
                }
            }
        }, 'Related articles'),
        404: responses.notFound,
    }
};
