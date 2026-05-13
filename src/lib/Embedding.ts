
import { ContentChunk } from '$src/types'
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { NodeHttpHandler } from '@smithy/node-http-handler'
import redis from '$src/lib/redis';
import { destr } from 'destr';
import { Agent as HttpsAgent } from 'node:https'

export class Embedding {
    private client: BedrockRuntimeClient
    private modelId = "amazon.titan-embed-text-v2:0"
    private accessKeyId = process.env.AWS_BEDROCK_ACCESS_KEY!
    private secretAccessKey = process.env.AWS_BEDROCK_SECRET_KEY!
    private region = process.env.AWS_REGION || "us-east-1"
    private maxAttempts = positiveInteger(process.env.AWS_MAX_ATTEMPTS, 3)
    private retryBaseDelayMs = positiveInteger(process.env.AWS_RETRY_BASE_DELAY_MS, 500)
    private requestTimeoutMs = positiveInteger(process.env.AWS_BEDROCK_REQUEST_TIMEOUT_MS, 30_000)
    private useHttp1 = process.env.AWS_BEDROCK_HTTP1 !== 'false'
    private MODEL_VERSION = 'v1';
    private BATCH_SIZE = positiveInteger(process.env.EMBEDDING_BATCH_SIZE, 5);

    constructor() {
        this.client = new BedrockRuntimeClient({
            region: this.region,
            maxAttempts: this.maxAttempts,
            requestHandler: this.useHttp1 ? new NodeHttpHandler({
                connectionTimeout: 5_000,
                requestTimeout: this.requestTimeoutMs,
                httpsAgent: new HttpsAgent({ keepAlive: false })
            }) : undefined,
            credentials: {
                accessKeyId: this.accessKeyId,
                secretAccessKey: this.secretAccessKey
            }
        });
    }
    private getCacheKey(text: string): string {
        const normalized = text.trim().toLowerCase();
        const textHash = Bun.hash(normalized).toString();

        return `emb:${this.MODEL_VERSION}:${textHash}`;
    }

    async getEmbeddings(text: string) {

        const cacheKey = this.getCacheKey(text);
        try {
            const cached = await redis.get(cacheKey);
            const parsed = destr<number[]>(cached);

            if (Array.isArray(parsed)) return parsed;

        } catch (err) {
            console.error('Redis cache read failed:', err);
        }

        const response = await this.invokeModelWithRetry(text);

        const result = destr<{ embedding: number[] }>(
            new TextDecoder().decode(response.body)
        );

        if (!result?.embedding || !Array.isArray(result.embedding)) {
            throw new Error(`Bedrock returned invalid format`);
        }

        redis.set(cacheKey, JSON.stringify(result.embedding))
            .catch(err => console.error('Redis write failed:', err));

        return result.embedding;
    }

    private async invokeModelWithRetry(text: string) {
        let lastError: unknown

        for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
            try {
                return await this.client.send(new InvokeModelCommand({
                    modelId: this.modelId,
                    body: JSON.stringify({ inputText: text })
                }))
            } catch (error) {
                lastError = error

                if (attempt >= this.maxAttempts || !isRetryableEmbeddingError(error)) {
                    break
                }

                const delayMs = this.retryBaseDelayMs * 2 ** (attempt - 1) + Math.floor(Math.random() * 100)
                console.warn(`Bedrock embedding attempt ${attempt}/${this.maxAttempts} failed; retrying in ${delayMs}ms: ${errorSummary(error)}`)
                await sleep(delayMs)
            }
        }

        throw new Error(`Bedrock embedding request failed after ${this.maxAttempts} attempt(s): ${errorSummary(lastError)}`)
    }

    async getBatchEmbeddings(chunks: ContentChunk[]): Promise<Map<number, number[]>> {
        const results = new Map<number, number[]>()
        for (let i = 0; i < chunks.length; i += this.BATCH_SIZE) {
            const batch = chunks.slice(i, i + this.BATCH_SIZE);

            await Promise.all(batch.map(async (chunk) => {
                const textToEmbed = `Title: ${chunk.title}\nAuthor: ${chunk.author}\nCategory: ${chunk.category}\nDate: ${chunk.date}\n\n${chunk.content}`;
                try {
                    const embedding = await this.getEmbeddings(textToEmbed);
                    results.set(chunk.index, embedding);
                } catch (e) {
                    console.error(`Failed to embed chunk ${chunk.index}`, e);
                }
            }));
        }

        return results;
    }
}

function positiveInteger(value: string | undefined, fallback: number) {
    const parsed = Number(value)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function errorSummary(error: unknown) {
    if (error instanceof Error) return error.message
    return String(error)
}

function isRetryableEmbeddingError(error: any) {
    const status = error?.$metadata?.httpStatusCode
    if ([408, 429, 500, 502, 503, 504].includes(status)) return true

    const name = String(error?.name || '').toLowerCase()
    const message = String(error?.message || error || '').toLowerCase()

    return [
        'http2 request did not get a response',
        'econnreset',
        'etimedout',
        'timeout',
        'throttl',
        'too many requests',
        'rate exceeded',
        'service unavailable',
        'socket',
        'connection'
    ].some(fragment => name.includes(fragment) || message.includes(fragment))
}
