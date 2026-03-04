import * as v from 'valibot';

export const IngestSummarySchema = v.object({
    content_id: v.union([
        v.number(),
        v.pipe(v.string(), v.transform(Number))
    ]),
    tone: v.string(),
    summary: v.string(),
});

export const GetSummaryQuerySchema = v.object({
    content_id: v.union([
        v.number(),
        v.pipe(v.string(), v.transform(Number))
    ]),
    tone: v.string(),
});