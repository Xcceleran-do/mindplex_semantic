import type { OpenAPIV3_1 } from 'openapi-types'
import type { DescribeRouteOptions } from 'hono-openapi'
import { availableTones } from '$src/db/schema'

type ParameterObject = OpenAPIV3_1.ParameterObject


export type { DescribeRouteOptions }


/** Wrap an inline parameter object with the correct OpenAPI type */
export const param = (obj: ParameterObject): ParameterObject => obj

export const limitParam: ParameterObject = {
    name: 'limit',
    in: 'query',
    description: 'Maximum number of results',
    schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 }
}

export const pageParam: ParameterObject = {
    name: 'page',
    in: 'query',
    description: 'Page number (starts at 1)',
    schema: { type: 'integer', minimum: 1, default: 1 }
}

export const fieldsParam: ParameterObject = {
    name: 'fields',
    in: 'query',
    description: 'Comma-separated list of fields to return',
    schema: { type: 'string' }
}

export const externalIdParam = (description: string): ParameterObject => ({
    name: 'id',
    in: 'path',
    required: true,
    description,
    schema: { type: 'integer', minimum: 1 }
})

export const toneParam = (description: string, inPath = false): ParameterObject => ({
    name: 'tone',
    in: inPath ? 'path' : 'query',
    required: inPath || undefined,
    description,
    schema: { type: 'string', enum: availableTones }
})


/** Wraps a schema in a standard application/json response object */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const jsonContent = (schema: any, description: string) => ({
    description,
    content: { 'application/json': { schema } }
})

/** Generates an OpenAPI $ref pointer to a named component schema */
export const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` })

export const responses = {
    badRequest: jsonContent(ref('Error'), 'Bad request'),
    notFound: jsonContent(ref('Error'), 'Resource not found'),
    internalError: jsonContent(ref('SuccessError'), 'Internal server error'),
    embeddingError: jsonContent(ref('SuccessError'), 'Embedding service unavailable'),
    conflict: (description: string) => jsonContent(ref('SuccessError'), description),
}

// ─── Component schemas ─────────────────────────────────────────────────────────
// Registered once in openAPISpecs({ documentation: { components: { schemas } } })
// and referenced via $ref throughout route docs.

export const componentSchemas: Record<string, OpenAPIV3_1.SchemaObject> = {
    Error: {
        type: 'object',
        properties: {
            error: { type: 'string', description: 'Human-readable error message' }
        }
    },
    SuccessError: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            error: { type: 'string' }
        }
    },
    Article: {
        type: 'object',
        properties: {
            externalId: { type: 'integer', description: 'External system ID' },
            slug: { type: 'string', description: 'URL-friendly identifier' },
            title: { type: 'string' },
            teaser: { type: 'string', description: 'Brief overview / excerpt' },
            content: { type: 'string', description: 'Full article content' },
            category: { type: 'array', items: { type: 'string' } },
            tags: { type: 'array', items: { type: 'string' } },
            publishedAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
        }
    },
    ArticleSearchResult: {
        allOf: [
            { $ref: '#/components/schemas/Article' },
            {
                type: 'object',
                properties: {
                    score: { type: 'number', format: 'float', description: 'Relevance score (0–1)' }
                }
            }
        ]
    },
    Chunk: {
        type: 'object',
        properties: {
            id: { type: 'integer' },
            chunkIndex: { type: 'integer' },
            rawContent: { type: 'string' },
            chunkToEmbed: { type: 'string' },
            embedding: { type: 'array', items: { type: 'number' }, description: '1024-dimension vector' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
        }
    },
    ChunkResponse: {
        type: 'object',
        properties: {
            externalId: { type: 'integer' },
            totalChunks: { type: 'integer' },
            chunks: { type: 'array', items: { $ref: '#/components/schemas/Chunk' } }
        }
    },
    User: {
        type: 'object',
        properties: {
            externalId: { type: 'integer', description: 'External system ID' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            username: { type: 'string' },
            email: { type: 'string', format: 'email' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
        }
    },
    UserSearchResult: {
        allOf: [
            { $ref: '#/components/schemas/User' },
            {
                type: 'object',
                properties: {
                    score: { type: 'number', format: 'float', description: 'Relevance score' }
                }
            }
        ]
    },
    Summary: {
        type: 'object',
        properties: {
            articleExternalId: { type: 'integer', description: 'Article external ID' },
            tone: { type: 'string', enum: availableTones },
            summary: { type: 'string', description: 'Stored summary text' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
        }
    },
    RetrievedChunk: {
        type: 'object',
        properties: {
            chunk_id: { type: 'string' },
            text: { type: 'string' },
            score: { type: 'number', format: 'float', description: 'Cosine similarity score' },
            metadata: {
                type: 'object',
                properties: { slug: { type: 'string' } }
            }
        }
    }
}
