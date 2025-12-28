import * as v from 'valibot';

const DEFAULT_LIMIT = "10";
const DEFAULT_OFFSET = "0";
const MAX_LIMIT = 100;

export const SearchQuerySchema = v.object({
    q: v.optional(v.string()),
    limit: v.optional(
        v.pipe(
            v.string(),
            v.transform(Number),
            v.integer(),
            v.minValue(1),
            v.maxValue(MAX_LIMIT)
        ),
        DEFAULT_LIMIT
    ),
    offset: v.optional(
        v.pipe(
            v.string(),
            v.transform(Number),
            v.integer(),
            v.minValue(0)
        ),
        DEFAULT_OFFSET
    ),
});

export type SearchQuery = v.InferOutput<typeof SearchQuerySchema>;