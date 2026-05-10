const TEST_API_KEY = 'test-ingest-key'

export function createApiKeyHeaders() {
    process.env.INGEST_API_KEY = TEST_API_KEY
    delete process.env.API_KEY

    return {
        'x-api-key': TEST_API_KEY,
    }
}
