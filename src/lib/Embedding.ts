
import { ContentChunk } from '$src/types'
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'

export class Embedding {
    private client: BedrockRuntimeClient
    private modelId = "amazon.titan-embed-text-v2:0"
    private accessKeyId = process.env.AWS_BEDROCK_ACCESS_KEY!
    private secretAccessKey = process.env.AWS_BEDROCK_SECRET_KEY!
    private region = process.env.AWS_REGION || "us-east-1"

    constructor() {
        this.client = new BedrockRuntimeClient({
            region: this.region,
            credentials: {
                accessKeyId: this.accessKeyId,
                secretAccessKey: this.secretAccessKey
            }
        });
    }


    async getEmbeddings(text: string) {
        const response = await this.client.send(new InvokeModelCommand({
            modelId: this.modelId,
            body: JSON.stringify({ inputText: text })
        }));

        const result = JSON.parse(new TextDecoder().decode(response.body));
        return result.embedding;
    }

    async getBatchEmbeddings(chunks: ContentChunk[]): Promise<Map<number, number[]>> {
        const results = new Map<number, number[]>()

        await Promise.all(
            chunks.map(async (chunk) => {
                const embedding = await this.getEmbeddings(
                    `Title: ${chunk.title}\nAuthor: ${chunk.author}\nCategory: ${chunk.category}\nDate: ${chunk.date}\n\n${chunk.content}`
                )
                results.set(chunk.index, embedding)
            })
        )

        return results
    }


}