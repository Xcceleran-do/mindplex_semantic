import { describe, it, expect } from 'bun:test'
import { Chunk } from '$src/lib/Chunk'
import type { PostData } from '$src/types'

const basePost: PostData = {
    id: 1,
    post_title: 'Test Article',
    post_name: 'test-article',
    brief_overview: 'A brief overview.',
    post_date: '2024-01-01',
    author_name: 'Alice',
    tag: { name: 'tech' },
    category: { name: 'Science' },
    other_authors: [],
    co_authors: [],
    post_editors: [],
    post_content: '',
}

describe('Chunk.processChunk', () => {
    it('returns empty array for empty content', () => {
        const chunk = new Chunk()
        const result = chunk.processChunk({ ...basePost, post_content: '' })
        expect(result).toEqual([])
    })

    it('extracts text from paragraph tags', () => {
        const chunk = new Chunk()
        const result = chunk.processChunk({
            ...basePost,
            post_content: '<p>Hello world</p>',
        })
        expect(result.length).toBeGreaterThan(0)
        expect(result[0].content).toContain('Hello world')
    })

    it('extracts text from heading tags', () => {
        const chunk = new Chunk()
        const html = '<h1>Title</h1><p>Body text here.</p>'
        const result = chunk.processChunk({ ...basePost, post_content: html })
        expect(result.length).toBeGreaterThan(0)
        const allContent = result.map(r => r.content).join(' ')
        expect(allContent).toContain('Title')
        expect(allContent).toContain('Body text here')
    })

    it('populates chunk metadata from post data', () => {
        const chunk = new Chunk()
        const result = chunk.processChunk({
            ...basePost,
            post_content: '<p>Some paragraph content here.</p>',
        })
        expect(result[0].title).toBe('Test Article')
        expect(result[0].author).toBe('Alice')
        expect(result[0].category).toBe('Science')
        expect(result[0].tags).toBe('tech')
        expect(result[0].date).toBe('2024-01-01')
    })

    it('assigns sequential chunk indices starting at 0', () => {
        const chunk = new Chunk()
        // Generate enough content to force multiple chunks (each > 3000 chars)
        const longPara = '<p>' + 'x'.repeat(3100) + '</p>'
        const html = longPara + longPara
        const result = chunk.processChunk({ ...basePost, post_content: html })
        expect(result.length).toBeGreaterThanOrEqual(2)
        result.forEach((c, i) => expect(c.index).toBe(i))
    })

    it('handles tag as array of name objects', () => {
        const chunk = new Chunk()
        const result = chunk.processChunk({
            ...basePost,
            tag: [{ name: 'ai' }, { name: 'ml' }],
            post_content: '<p>Content here.</p>',
        })
        expect(result[0].tags).toBe('ai,ml')
    })

    it('handles empty tag array', () => {
        const chunk = new Chunk()
        const result = chunk.processChunk({
            ...basePost,
            tag: [],
            post_content: '<p>Content here.</p>',
        })
        expect(result[0].tags).toBe('')
    })

    it('ignores non-content tags like script and style', () => {
        const chunk = new Chunk()
        const html = '<script>alert("xss")</script><p>Real content</p>'
        const result = chunk.processChunk({ ...basePost, post_content: html })
        const allContent = result.map(r => r.content).join(' ')
        expect(allContent).not.toContain('alert')
        expect(allContent).toContain('Real content')
    })

    it('prefixes interview questions with Q: when no colon prefix exists', () => {
        const chunk = new Chunk()
        const html = `<div class="wp-block-mp-general-interview-block message-sent">What is AI?</div>`
        const result = chunk.processChunk({ ...basePost, post_content: html })
        const allContent = result.map(r => r.content).join(' ')
        expect(allContent).toContain('Q: What is AI?')
    })

    it('does not double-prefix interview questions that already have a colon', () => {
        const chunk = new Chunk()
        const html = `<div class="wp-block-mp-general-interview-block message-sent">Q: What is ML?</div>`
        const result = chunk.processChunk({ ...basePost, post_content: html })
        const allContent = result.map(r => r.content).join(' ')
        expect(allContent).not.toContain('Q: Q:')
    })
})
