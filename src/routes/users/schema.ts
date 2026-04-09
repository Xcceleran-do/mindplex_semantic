import * as v from 'valibot'
import { users } from '$src/db/schema'
import { createFieldsSchema } from '$src/utils'
import { PaginationLimitSchema, PaginationPageSchema, IdParamSchema } from '$src/lib/validators'
import { resolver } from 'hono-openapi'
import { type DescribeRouteOptions, param, limitParam, pageParam, fieldsParam, externalIdParam, jsonContent, ref, responses } from '$src/lib/openapi'

// ─── Constants ────────────────────────────────────────────────────────────────

export const FORBIDDEN_USER_COLUMNS = new Set(['searchName'])
export const ALLOWED_USER_UPDATE_FIELDS = new Set(['firstName', 'lastName', 'username', 'email'])

// ─── Validation schemas ────────────────────────────────────────────────────────

export const ExternalIdParamsSchema = v.object({
    id: IdParamSchema
})

export const SearchQuerySchema = v.object({
    q: v.optional(v.string()),
    limit: PaginationLimitSchema,
    page: PaginationPageSchema,
    fields: createFieldsSchema(users, FORBIDDEN_USER_COLUMNS),
})

export const GetUserQuerySchema = v.object({
    fields: createFieldsSchema(users, FORBIDDEN_USER_COLUMNS),
})

export const UpdateUserSchema = v.object({
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    username: v.optional(v.string()),
    email: v.optional(v.pipe(v.string(), v.email())),
})

export type SearchQuery = v.InferOutput<typeof SearchQuerySchema>
export type GetUserQuery = v.InferOutput<typeof GetUserQuerySchema>
export type UpdateUser = v.InferOutput<typeof UpdateUserSchema>

// ─── Route documentation ───────────────────────────────────────────────────────

export const searchUsersDocs: DescribeRouteOptions = {
    tags: ['Users'],
    summary: 'Search users',
    operationId: 'searchUsers',
    description: 'Fuzzy text search using trigram similarity across first name, last name, username, and email.',
    parameters: [
        param({ name: 'q', in: 'query', required: true, description: 'Search query', schema: { type: 'string', example: 'john doe' } }),
        limitParam,
        pageParam,
        fieldsParam,
    ],
    responses: {
        200: jsonContent({
            type: 'object',
            properties: {
                users: { type: 'array', items: ref('UserSearchResult') },
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

export const getUserDocs: DescribeRouteOptions = {
    tags: ['Users'],
    summary: 'Get user by ID',
    operationId: 'getUser',
    description: 'Retrieve a single user by their external ID.',
    parameters: [externalIdParam('User external ID'), fieldsParam],
    responses: {
        200: jsonContent(ref('User'), 'User found'),
        404: responses.notFound,
    }
};

export const updateUserDocs: DescribeRouteOptions = {
    tags: ['Users'],
    summary: 'Update user',
    operationId: 'updateUser',
    description: 'Update user information. Only specified fields are updated.',
    parameters: [externalIdParam('User external ID')],
    requestBody: {
        required: true,
        content: { 'application/json': { schema: resolver(UpdateUserSchema) } }
    },
    responses: {
        200: jsonContent({
            type: 'object',
            properties: {
                message: { type: 'string' },
                user: ref('User')
            }
        }, 'User updated'),
        400: responses.badRequest,
        404: responses.notFound,
    }
};

export const deleteUserDocs: DescribeRouteOptions = {
    tags: ['Users'],
    summary: 'Delete user',
    operationId: 'deleteUser',
    description: 'Permanently delete a user.',
    parameters: [externalIdParam('User external ID')],
    responses: {
        200: jsonContent({
            type: 'object',
            properties: {
                message: { type: 'string' },
                externalId: { type: 'integer' }
            }
        }, 'User deleted'),
        404: responses.notFound,
    }
};
