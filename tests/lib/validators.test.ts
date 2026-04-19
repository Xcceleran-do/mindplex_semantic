import { describe, it, expect } from 'bun:test'
import * as v from 'valibot'
import {
    PaginationLimitSchema,
    PaginationPageSchema,
    IdParamSchema,
    PAGINATION_RULES,
} from '$src/lib/validators'

const parse = (schema: any, value: any) => v.parse(schema, value)
const safeParse = (schema: any, value: any) => v.safeParse(schema, value)

describe('PaginationLimitSchema', () => {
    it('defaults to 10 when value is undefined', () => {
        expect(parse(PaginationLimitSchema, undefined)).toBe(10)
    })

    it('converts string to number', () => {
        expect(parse(PaginationLimitSchema, '25')).toBe(25)
    })

    it('accepts maximum value', () => {
        expect(parse(PaginationLimitSchema, '100')).toBe(100)
    })

    it('rejects value above maximum', () => {
        const result = safeParse(PaginationLimitSchema, '101')
        expect(result.success).toBe(false)
    })

    it('rejects zero', () => {
        const result = safeParse(PaginationLimitSchema, '0')
        expect(result.success).toBe(false)
    })

    it('rejects negative values', () => {
        const result = safeParse(PaginationLimitSchema, '-1')
        expect(result.success).toBe(false)
    })

    it('rejects non-integer strings', () => {
        const result = safeParse(PaginationLimitSchema, 'abc')
        expect(result.success).toBe(false)
    })
})

describe('PaginationPageSchema', () => {
    it('defaults to 1 when value is undefined', () => {
        expect(parse(PaginationPageSchema, undefined)).toBe(1)
    })

    it('converts string to number', () => {
        expect(parse(PaginationPageSchema, '3')).toBe(3)
    })

    it('rejects non-integer strings', () => {
        const result = safeParse(PaginationPageSchema, 'abc')
        expect(result.success).toBe(false)
    })

    it('rejects float strings', () => {
        const result = safeParse(PaginationPageSchema, '1.5')
        expect(result.success).toBe(false)
    })
})

describe('IdParamSchema', () => {
    it('parses valid positive integer string', () => {
        expect(parse(IdParamSchema, '42')).toBe(42)
    })

    it('parses "1" (minimum valid value)', () => {
        expect(parse(IdParamSchema, '1')).toBe(1)
    })

    it('rejects zero', () => {
        const result = safeParse(IdParamSchema, '0')
        expect(result.success).toBe(false)
    })

    it('rejects negative values', () => {
        const result = safeParse(IdParamSchema, '-5')
        expect(result.success).toBe(false)
    })

    it('rejects non-numeric strings', () => {
        const result = safeParse(IdParamSchema, 'abc')
        expect(result.success).toBe(false)
    })

    it('rejects float strings', () => {
        const result = safeParse(IdParamSchema, '1.9')
        expect(result.success).toBe(false)
    })
})
