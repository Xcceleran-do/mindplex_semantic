/** Creates a chainable mock object that resolves to `result` when awaited */
function createChain(result: any = []) {
    const chain: any = {}
    const methods = [
        'from', 'where', 'limit', 'offset', 'orderBy', 'leftJoin', 'innerJoin',
        'groupBy', 'set', 'values', 'onConflictDoUpdate',
    ]
    methods.forEach(m => { chain[m] = () => chain })
    chain.returning = () => Promise.resolve(result)
    chain.as = (_alias: string) => result
    chain.then = (res: any, rej: any) => Promise.resolve(result).then(res, rej)
    chain.catch = (rej: any) => Promise.resolve(result).catch(rej)
    return chain
}

export type MockDbConfig = {
    /** Result for db.select(...) chains */
    selectResult?: any[]
    /** Result for db.update(...) chains */
    updateResult?: any[]
    /** Result for db.insert(...) chains (non-transaction) */
    insertResult?: any[]
    /** Result for db.delete(...) chains */
    deleteResult?: any[]
    /** Results for db.query.articles.findFirst() */
    queryArticle?: any
    /** Results for db.query.summaries.findFirst() */
    querySummary?: any
    /**
     * Queue of results for inserts inside db.transaction().
     * Each entry is consumed in order as tx.insert().returning() is called.
     * Defaults to [[{ id: 1 }], []] for the common article + chunks pattern.
     */
    transactionInserts?: any[][]
}

export function createMockDb(config: MockDbConfig = {}) {
    const {
        selectResult = [],
        updateResult = [],
        insertResult = [],
        deleteResult = [],
        queryArticle = undefined,
        querySummary = undefined,
        transactionInserts = [[{ id: 1 }], []],
    } = config

    return {
        select: (_fields?: any) => createChain(selectResult),
        update: (_table: any) => createChain(updateResult),
        insert: (_table: any) => createChain(insertResult),
        delete: (_table: any) => createChain(deleteResult),
        transaction: async (fn: (tx: any) => any) => {
            const queue = [...transactionInserts]
            const tx = {
                insert: (_table: any) => createChain(queue.shift() ?? []),
                update: (_table: any) => createChain(updateResult),
            }
            return fn(tx)
        },
        query: {
            articles: { findFirst: async (_opts?: any) => queryArticle },
            summaries: { findFirst: async (_opts?: any) => querySummary },
        },
    }
}
