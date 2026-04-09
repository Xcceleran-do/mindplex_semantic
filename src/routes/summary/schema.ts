import * as v from 'valibot'
import { summaries, availableTones } from '$src/db/schema'
import { createFieldsSchema } from '$src/utils'
import { IdParamSchema, PaginationLimitSchema, PaginationPageSchema } from '$src/lib/validators'
import { resolver } from 'hono-openapi'
import { type DescribeRouteOptions, limitParam, pageParam, fieldsParam, externalIdParam, toneParam, jsonContent, ref, responses } from '$src/lib/openapi'

// ─── Constants ────────────────────────────────────────────────────────────────

export const FORBIDDEN_COLUMNS = new Set(['embedding', 'id', 'articleId'])

// ─── Validation schemas ────────────────────────────────────────────────────────

export const ToneSchema = v.picklist(availableTones)

export const SummaryArticleParamsSchema = v.object({
    id: IdParamSchema
})

export const SummaryToneParamsSchema = v.object({
    id: IdParamSchema,
    tone: ToneSchema
})

export const SummaryFieldsQuerySchema = v.object({
    fields: createFieldsSchema(summaries, FORBIDDEN_COLUMNS)
})

export const SummaryCollectionQuerySchema = v.object({
    tone: v.optional(ToneSchema),
    limit: PaginationLimitSchema,
    page: PaginationPageSchema,
    fields: createFieldsSchema(summaries, FORBIDDEN_COLUMNS)
})

export const UpsertSummarySchema = v.object({
    summary: v.string()
})

// ─── Route documentation ───────────────────────────────────────────────────────

export const listSummariesDocs: DescribeRouteOptions = {
    tags: ['Summaries'],
    summary: 'List summaries',
    operationId: 'listSummaries',
    description: 'List all summaries across articles with pagination and optional tone filtering.',
    parameters: [limitParam, pageParam, toneParam('Filter by tone'), fieldsParam],
    responses: {
        200: jsonContent({
            type: 'object',
            properties: {
                summaries: { type: 'array', items: ref('Summary') },
                meta: {
                    type: 'object',
                    properties: {
                        page: { type: 'integer' },
                        limit: { type: 'integer' },
                        count: { type: 'integer', description: 'Items in current page' },
                        total: { type: 'integer', description: 'Total matching summaries' }
                    }
                }
            }
        }, 'Paginated summaries'),
        400: responses.badRequest,
    }
};

export const listArticleSummariesDocs: DescribeRouteOptions = {
    tags: ['Summaries'],
    summary: 'List article summaries',
    operationId: 'listArticleSummaries',
    description: 'List all available summaries for a given article external ID.',
    parameters: [externalIdParam('Article external ID'), fieldsParam],
    responses: {
        200: jsonContent({
            type: 'object',
            properties: {
                summaries: { type: 'array', items: ref('Summary') }
            }
        }, 'Article summaries'),
        404: responses.notFound,
    }
};

export const getArticleSummaryDocs: DescribeRouteOptions = {
    tags: ['Summaries'],
    summary: 'Get article summary by tone',
    operationId: 'getArticleSummary',
    description: 'Retrieve a single summary for an article external ID and tone.',
    parameters: [externalIdParam('Article external ID'), toneParam('Summary tone', true), fieldsParam],
    responses: {
        200: jsonContent(ref('Summary'), 'Summary found'),
        404: responses.notFound,
    }
};

export const upsertArticleSummaryDocs: DescribeRouteOptions = {
    tags: ['Summaries'],
    summary: 'Create or update article summary',
    operationId: 'upsertArticleSummary',
    description: 'Idempotently create or replace the summary for an article external ID and tone. Only the `formal` tone generates an embedding.',
    parameters: [externalIdParam('Article external ID'), toneParam('Summary tone', true)],
    requestBody: {
        required: true,
        content: { 'application/json': { schema: resolver(UpsertSummarySchema) } }
    },
    responses: {
        200: jsonContent({
            type: 'object',
            properties: { message: { type: 'string' }, summary: ref('Summary') }
        }, 'Summary updated'),
        201: jsonContent({
            type: 'object',
            properties: { message: { type: 'string' }, summary: ref('Summary') }
        }, 'Summary created'),
        400: responses.badRequest,
        404: responses.notFound,
        502: responses.embeddingError,
    }
};
