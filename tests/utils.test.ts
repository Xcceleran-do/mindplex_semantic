import { describe, it, expect } from 'bun:test'
import { toNames, buildFieldSelection, getAllowedFields, sanitizeUpdates } from '$src/utils'
import { articles } from '$src/db/schema'


describe('toNames', () => {
    it('returns empty string for falsy input', () => {
        expect(toNames(null as any)).toBe('')
        expect(toNames(undefined as any)).toBe('')
    })

    it('returns name from object with name property', () => {
        expect(toNames({ name: 'Alice' })).toBe('Alice')
    })

    it('joins array of name objects with commas', () => {
        expect(toNames([{ name: 'Alice' }, { name: 'Bob' }])).toBe('Alice,Bob')
    })

    it('handles empty array', () => {
        expect(toNames([] as any)).toBe('')
    })

    it('handles single-element array', () => {
        expect(toNames([{ name: 'Solo' }])).toBe('Solo')
    })
})


describe('getAllowedFields', () => {
    it('returns column names excluding forbidden ones', () => {
        const forbidden = new Set(['embedding', 'searchVector'])
        const allowed = getAllowedFields(articles, forbidden)
        expect(allowed).not.toContain('embedding')
        expect(allowed).not.toContain('searchVector')
        expect(allowed).toContain('title')
        expect(allowed).toContain('slug')
        expect(allowed).toContain('externalId')
    })

    it('returns all columns when forbidden set is empty', () => {
        const allowed = getAllowedFields(articles, new Set())
        expect(allowed).toContain('embedding')
        expect(allowed).toContain('searchVector')
        expect(allowed).toContain('title')
    })
})


describe('buildFieldSelection', () => {
    const forbidden = new Set(['embedding', 'searchVector'])

    it('returns only requested fields when fields param is given', () => {
        const sel = buildFieldSelection(articles, 'title,slug', forbidden)
        expect(Object.keys(sel)).toEqual(['title', 'slug'])
    })

    it('excludes forbidden fields when no specific fields requested', () => {
        const sel = buildFieldSelection(articles, undefined, forbidden)
        expect('embedding' in sel).toBe(false)
        expect('searchVector' in sel).toBe(false)
        expect('title' in sel).toBe(true)
    })

    it('merges baseSelection with requested fields', () => {
        const base = { score: 'mock_score_col' }
        const sel = buildFieldSelection(articles, 'title', forbidden, base)
        expect(sel.score).toBe('mock_score_col')
        expect('title' in sel).toBe(true)
    })

    it('merges baseSelection with all allowed fields when no fields given', () => {
        const base = { score: 'mock_score_col' }
        const sel = buildFieldSelection(articles, undefined, forbidden, base)
        expect(sel.score).toBe('mock_score_col')
        expect('embedding' in sel).toBe(false)
    })

    it('ignores unknown field names in the fields param', () => {
        const sel = buildFieldSelection(articles, 'title,nonExistentColumn', forbidden)
        expect('title' in sel).toBe(true)
        expect('nonExistentColumn' in sel).toBe(false)
    })
})


describe('sanitizeUpdates', () => {
    const allowed = new Set(['title', 'content', 'tags'])

    it('strips fields not in the allowed set', () => {
        const result = sanitizeUpdates({ title: 'New', id: 999, embedding: [0.1] }, allowed)
        expect(result).toEqual({ title: 'New' })
        expect('id' in result).toBe(false)
        expect('embedding' in result).toBe(false)
    })

    it('keeps all allowed fields when all are present', () => {
        const result = sanitizeUpdates({ title: 'T', content: 'C', tags: ['a'] }, allowed)
        expect(result).toEqual({ title: 'T', content: 'C', tags: ['a'] })
    })

    it('returns empty object when no allowed fields match', () => {
        const result = sanitizeUpdates({ id: 1, embedding: [] }, allowed)
        expect(result).toEqual({})
    })

    it('returns empty object for empty input', () => {
        const result = sanitizeUpdates({}, allowed)
        expect(result).toEqual({})
    })
})
