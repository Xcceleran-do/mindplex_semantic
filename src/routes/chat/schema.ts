import * as v from 'valibot';
import { IdParamSchema } from '$src/lib/validators';

export const RetrieveChunksSchema = v.object({
  user_query: v.string(),
  k: v.optional(v.pipe(v.number(), v.maxValue(15))),
  filters: v.optional(
    v.object({
      article_id: v.optional(IdParamSchema),
    })
  ),
});