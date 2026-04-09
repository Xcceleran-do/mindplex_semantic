import { mock } from 'bun:test'

const MOCK_EMBEDDING = new Array(1024).fill(0.01)

mock.module('$src/lib/redis', () => ({
    redis: {
        get: async () => null,
        set: async () => 'OK',
    },
    default: {
        get: async () => null,
        set: async () => 'OK',
    },
}))

mock.module('$src/lib/Embedding', () => ({
    Embedding: class MockEmbedding {
        async getEmbeddings(_text: string) {
            return MOCK_EMBEDDING
        }
        async getBatchEmbeddings(chunks: Array<{ index: number }>) {
            return new Map(chunks.map(c => [c.index, MOCK_EMBEDDING]))
        }
    },
}))
