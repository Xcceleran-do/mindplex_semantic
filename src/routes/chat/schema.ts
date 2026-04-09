import * as v from 'valibot';
import { IdParamSchema } from '$src/lib/validators';
import { resolver } from 'hono-openapi';
import { type DescribeRouteOptions, jsonContent, ref } from '$src/lib/openapi';

// ─── Validation schemas ────────────────────────────────────────────────────────

export const RetrieveChunksSchema = v.object({
  user_query: v.string(),
  k: v.optional(v.pipe(v.number(), v.maxValue(15))),
  filters: v.optional(
    v.object({
      article_id: v.optional(IdParamSchema),
    })
  ),
});

// ─── Route documentation ───────────────────────────────────────────────────────

export const retrieveChunksDocs: DescribeRouteOptions = {
  tags: ['Retrieval'],
  summary: 'Retrieve similar chunks',
  operationId: 'retrieveChunks',
  description: 'Vector similarity search over article chunks for RAG pipelines. Returns the k nearest chunks to the query embedding.',
  requestBody: {
    required: true,
    content: { 'application/json': { schema: resolver(RetrieveChunksSchema) } }
  },
  responses: {
    200: jsonContent(
      { type: 'array', items: ref('RetrievedChunk') },
      'Nearest chunks ranked by similarity score'
    ),
  }
};
