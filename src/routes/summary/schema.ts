import * as v from 'valibot';
import { summaries, availableTones } from '$src/db/schema';
import { createFieldsSchema } from '$src/utils';

export const FORBIDDEN_COLUMNS = new Set(['embedding', 'id', 'articleId']);

export const ToneSchema = v.picklist(availableTones);

export const IngestSummarySchema = v.object({
    content_id: v.union([
        v.number(),
        v.pipe(v.string(), v.transform(Number))
    ]),
    tone: ToneSchema,
    summary: v.string(),
});

export const GetSummaryQuerySchema = v.object({
    content_id: v.union([
        v.number(),
        v.pipe(v.string(), v.transform(Number))
    ]),
    tone: v.optional(ToneSchema),
    fields: createFieldsSchema(summaries, FORBIDDEN_COLUMNS),
});