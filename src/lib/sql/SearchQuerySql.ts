import { sql } from 'drizzle-orm'

type HybridSearchConfig = {
    vectorWeight: number
    textWeight: number
    articleThreshold: number
    chunkThreshold: number
}

type UserSearchColumns = {
    firstName: any
    username: any
    email: any
    searchName: any
}

const DEFAULT_HYBRID_SEARCH_CONFIG: HybridSearchConfig = {
    vectorWeight: 0.7,
    textWeight: 0.3,
    articleThreshold: 0.25,
    chunkThreshold: 0.25,
}

export class SearchQuerySql {
    constructor(private readonly hybridConfig: HybridSearchConfig = DEFAULT_HYBRID_SEARCH_CONFIG) {}

    get articleThreshold() {
        return this.hybridConfig.articleThreshold
    }

    get chunkThreshold() {
        return this.hybridConfig.chunkThreshold
    }

    similarityScore(embeddingColumn: any, queryEmbedding: number[]) {
        return sql<number>`1 - (${embeddingColumn} <=> ${JSON.stringify(queryEmbedding)}::vector)`
    }

    hybridTextRank(searchVectorColumn: any, textQuery: string) {
        return sql<number>`ts_rank_cd(${searchVectorColumn}, websearch_to_tsquery('english', ${textQuery}))`
    }

    normalizedHybridTextRank(searchVectorColumn: any, textQuery: string) {
        const textScore = this.hybridTextRank(searchVectorColumn, textQuery)
        return sql<number>`LEAST(${textScore}, 1.0)`
    }

    hybridScore(
        embeddingColumn: any,
        searchVectorColumn: any,
        queryEmbedding: number[],
        textQuery: string
    ) {
        const vectorScore = this.similarityScore(embeddingColumn, queryEmbedding)
        const normalizedTextScore = this.normalizedHybridTextRank(searchVectorColumn, textQuery)

        return sql<number>`(${vectorScore} * ${this.hybridConfig.vectorWeight}) + (${normalizedTextScore} * ${this.hybridConfig.textWeight})`
    }

    plainTextRank(searchVectorColumn: any, textQuery: string) {
        return sql<number>`ts_rank_cd(${searchVectorColumn}, plainto_tsquery('english', ${textQuery}))`
    }

    plainTextMatch(searchVectorColumn: any, textQuery: string) {
        return sql`${searchVectorColumn} @@ plainto_tsquery('english', ${textQuery})`
    }

    vectorDistance(embeddingColumn: any, queryEmbedding: number[]) {
        return sql<number>`${embeddingColumn} <=> ${JSON.stringify(queryEmbedding)}::vector`
    }

    userSearchScore(query: string, columns: UserSearchColumns) {
        return sql<number>`
            (
                word_similarity(${query}, ${columns.searchName})
                + (CASE WHEN ${columns.firstName} ILIKE ${query} THEN 2.0 ELSE 0 END)
                + (CASE WHEN ${columns.firstName} ILIKE ${query} || '%' THEN 1.2 ELSE 0 END)
                + (CASE WHEN ${columns.username} ILIKE ${query} || '%' THEN 0.8 ELSE 0 END)
                + (CASE WHEN ${columns.email} ILIKE ${query} || '%' THEN 0.5 ELSE 0 END)
                - (LENGTH(${columns.firstName}) - LENGTH(${query})) * 0.01
            )
        `
    }

    userSearchFilter(query: string, columns: UserSearchColumns, threshold: number) {
        return sql`
            (${columns.firstName} ILIKE ${query} || '%')
            OR (${columns.username} ILIKE ${query} || '%')
            OR (${columns.email} ILIKE ${query} || '%')
            OR (word_similarity(${query}, ${columns.searchName}) > ${threshold})
        `
    }
}

export const searchQuerySql = new SearchQuerySql()
