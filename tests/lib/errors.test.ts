import { describe, it, expect } from 'bun:test'
import { AppError, EmbeddingError, NotFoundError } from '$src/lib/errors'

describe('AppError', () => {
    it('sets statusCode, message, and name', () => {
        const err = new AppError(422, 'Unprocessable entity')
        expect(err.statusCode).toBe(422)
        expect(err.message).toBe('Unprocessable entity')
        expect(err.name).toBe('AppError')
        expect(err instanceof Error).toBe(true)
    })

    it('stores optional details', () => {
        const details = { field: 'email', reason: 'invalid' }
        const err = new AppError(400, 'Bad request', details)
        expect(err.details).toEqual(details)
    })

    it('details defaults to undefined', () => {
        const err = new AppError(500, 'Internal')
        expect(err.details).toBeUndefined()
    })
})

describe('EmbeddingError', () => {
    it('has statusCode 500 and default message', () => {
        const err = new EmbeddingError()
        expect(err.statusCode).toBe(500)
        expect(err.message).toBe('Failed to generate embedding')
        expect(err.name).toBe('EmbeddingError')
    })

    it('accepts custom message', () => {
        const err = new EmbeddingError('Bedrock timeout')
        expect(err.message).toBe('Bedrock timeout')
    })

    it('is an instance of AppError', () => {
        expect(new EmbeddingError() instanceof AppError).toBe(true)
    })
})

describe('NotFoundError', () => {
    it('has statusCode 404 and default message', () => {
        const err = new NotFoundError()
        expect(err.statusCode).toBe(404)
        expect(err.message).toBe('Resource not found')
        expect(err.name).toBe('NotFoundError')
    })

    it('accepts custom message', () => {
        const err = new NotFoundError('Article not found')
        expect(err.message).toBe('Article not found')
    })

    it('is an instance of AppError', () => {
        expect(new NotFoundError() instanceof AppError).toBe(true)
    })
})
