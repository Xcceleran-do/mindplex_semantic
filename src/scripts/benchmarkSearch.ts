type CliOptions = {
    baseUrl: string
    apiKey?: string
    count: number
    concurrency: number
    repeats: number
    limit: number
    idBase: number
    seed: boolean
    reset: boolean
    cleanup: boolean
    timeoutMs: number
    ingestDelayMs: number
    searchDelayMs: number
    showResults: boolean
    topK: number
    outputJson?: string
}

type BenchmarkArticle = {
    externalId: number
    title: string
    slug: string
    teaser: string
    content: string
    category: string
    tag: string
    expectedQueries: SearchCase[]
}

type SearchCase = {
    label: string
    difficulty: 'exact' | 'paraphrase' | 'noisy' | 'rare' | 'long' | 'control'
    query: string
    expectedExternalId?: number
    expectedTitle?: string
}

type TimedResult<T> = {
    ok: boolean
    status: number
    ms: number
    data?: T
    error?: string
}

type IngestResponse = {
    success?: boolean
    chunksCreated?: number
    error?: string
}

type SearchResponse = {
    articles?: Array<{
        id?: number
        externalId?: number
        title?: string
        slug?: string
        score?: number | string
    }>
    meta?: {
        query?: string
        count?: number
    }
}

type SearchMeasurement = {
    label: string
    difficulty: SearchCase['difficulty']
    difficultyNote: string
    query: string
    expectedExternalId?: number
    expectedTitle?: string
    repeat: number
    ok: boolean
    status: number
    ms: number
    count: number
    hitRank?: number
    topExternalId?: number
    topTitle?: string
    topScore?: number
    candidates: SearchCandidate[]
    error?: string
}

type SearchCandidate = {
    rank: number
    externalId?: number
    title?: string
    slug?: string
    score?: number
    isExpected: boolean
}

const TOPICS = [
    {
        category: 'AI Research',
        tag: 'embeddings',
        title: 'Neuro-symbolic agents map scientific literature',
        teaser: 'Researchers combine graph reasoning with language model embeddings to find hidden links in papers.',
        rare: 'neurospike lattice',
        exactQuery: 'neuro symbolic agents scientific literature',
        paraphraseQuery: 'systems that connect research papers using reasoning and embeddings',
        noisyQuery: 'neuro simbolic agnts map sciense papers',
        longQuery: 'Which article explains how AI agents use graph reasoning and embeddings to discover connections across scientific papers?',
        body: [
            'The study describes a retrieval pipeline that blends citation graphs, semantic embeddings, and symbolic constraints.',
            'A benchmark set of biomedical papers was indexed so that questions could be answered with supporting passages.',
            'The team reports that the neurospike lattice marker helped isolate multi-hop reasoning failures from keyword-only matches.'
        ]
    },
    {
        category: 'Climate Tech',
        tag: 'energy',
        title: 'Solar desalination hubs support coastal farms',
        teaser: 'Low-pressure membranes and thermal storage help small farms turn seawater into irrigation reserves.',
        rare: 'brineglass valve',
        exactQuery: 'solar desalination coastal farms',
        paraphraseQuery: 'turning seawater into irrigation water with renewable energy',
        noisyQuery: 'solr desalinaton costal farm irrigaton',
        longQuery: 'Find the piece about small agricultural communities using solar heat and membranes to produce fresh water from the sea.',
        body: [
            'The pilot runs modular desalination equipment during the sunniest part of the day and stores heat for evening operation.',
            'Farmers monitor mineral levels, brine output, and pump efficiency through a shared dashboard.',
            'Engineers added a brineglass valve to reduce maintenance during dusty coastal wind events.'
        ]
    },
    {
        category: 'Neuroscience',
        tag: 'brain-computer-interface',
        title: 'Memory prosthetics decode hippocampal signals',
        teaser: 'A clinical trial studies implants that replay learned neural patterns during recall tasks.',
        rare: 'hippocampal lantern',
        exactQuery: 'memory prosthetics hippocampal signals',
        paraphraseQuery: 'brain implant that helps people remember learned patterns',
        noisyQuery: 'memry prostetic hipocampal signls',
        longQuery: 'Which report covers an implant that watches hippocampus activity and supports memory recall during testing?',
        body: [
            'Participants practiced visual association tasks while electrode arrays captured timing signatures in the hippocampus.',
            'The decoder learned compact templates and stimulated only when confidence crossed a strict threshold.',
            'Clinicians used the phrase hippocampal lantern for the diagnostic view that reveals replay quality.'
        ]
    },
    {
        category: 'Space',
        tag: 'robotics',
        title: 'Lunar swarm robots build radio telescope arrays',
        teaser: 'Small autonomous rovers coordinate antenna placement on the far side of the Moon.',
        rare: 'regolith whisper',
        exactQuery: 'lunar swarm robots radio telescope arrays',
        paraphraseQuery: 'moon robots arranging antennas for astronomy observations',
        noisyQuery: 'luner swarn rovers radio telescop arays',
        longQuery: 'Show me the article about autonomous machines placing telescope antennas on the far side of the Moon.',
        body: [
            'Each rover carries a spool of conductive ribbon and negotiates placement paths with nearby units.',
            'The far side site blocks terrestrial radio noise and improves sensitivity for early-universe observations.',
            'Mission planners call the low-band calibration routine regolith whisper because it listens through surface interference.'
        ]
    },
    {
        category: 'Governance',
        tag: 'policy',
        title: 'Cities test participatory budgeting with quadratic voting',
        teaser: 'Municipal pilots let residents allocate credits across transportation, parks, and resilience projects.',
        rare: 'civic abacus',
        exactQuery: 'participatory budgeting quadratic voting cities',
        paraphraseQuery: 'residents choosing city projects by spending voting credits',
        noisyQuery: 'partisipatory budjeting qadratic votng',
        longQuery: 'Find the analysis about local governments letting people distribute credits to prioritize public projects.',
        body: [
            'The process asks residents to trade off intensity of preference rather than choose a single favorite project.',
            'Auditors compare outcomes against traditional town halls and ranked-choice surveys.',
            'The civic abacus simulator highlights neighborhoods where project support is intense but underrepresented.'
        ]
    },
    {
        category: 'Biotech',
        tag: 'medicine',
        title: 'Programmable phages target antibiotic resistant infections',
        teaser: 'Synthetic biology teams tune bacteriophages to attack resistant bacterial strains without harming the microbiome.',
        rare: 'phage prism',
        exactQuery: 'programmable phages antibiotic resistant infections',
        paraphraseQuery: 'engineered viruses that fight drug resistant bacteria',
        noisyQuery: 'programable fages antibotic resistent infectons',
        longQuery: 'Which article discusses synthetic biology work on viruses designed to attack resistant bacteria while sparing helpful microbes?',
        body: [
            'The therapy uses genomic screening to match phage edits with the surface receptors of target bacteria.',
            'Researchers tracked off-target effects in gut cultures before moving into compassionate-use cases.',
            'A phage prism assay visualizes escape mutations before a treatment cocktail is finalized.'
        ]
    },
    {
        category: 'Markets',
        tag: 'crypto',
        title: 'Tokenized carbon markets add verification layers',
        teaser: 'New registries connect satellite monitoring, project audits, and programmable settlement for carbon credits.',
        rare: 'canopy ledger',
        exactQuery: 'tokenized carbon markets verification layers',
        paraphraseQuery: 'blockchain credits checked with satellite monitoring and audits',
        noisyQuery: 'toknized carbn market verfication',
        longQuery: 'I need the article about carbon credit registries that combine satellite evidence with programmable settlement.',
        body: [
            'Project developers submit geospatial evidence, auditor attestations, and retirement records to a shared registry.',
            'The model is designed to reduce double counting while keeping sensitive landowner data private.',
            'Analysts use the canopy ledger field to compare forest claims with independent canopy loss signals.'
        ]
    },
    {
        category: 'Education',
        tag: 'learning',
        title: 'Adaptive tutors personalize math lessons with error traces',
        teaser: 'Classroom software studies each wrong step to generate targeted practice and teacher alerts.',
        rare: 'algebra compass',
        exactQuery: 'adaptive tutors math lessons error traces',
        paraphraseQuery: 'software that studies wrong answers to customize math practice',
        noisyQuery: 'adaptiv tutor maths eror traces',
        longQuery: 'Where is the piece about classroom tools that inspect student mistakes and generate custom math exercises?',
        body: [
            'The system records intermediate work, not just final answers, so teachers can see misconceptions earlier.',
            'Practice sets change after each attempt and include explanations matched to the student error pattern.',
            'The algebra compass view groups learners by misconception without exposing individual grades to classmates.'
        ]
    }
]

const CONTROL_QUERIES: SearchCase[] = [
    {
        label: 'control-unrelated-recipe',
        difficulty: 'control',
        query: 'banana bread recipe with walnuts and cinnamon'
    },
    {
        label: 'control-unrelated-sports',
        difficulty: 'control',
        query: 'football transfer rumors goalkeeper contract extension'
    },
    {
        label: 'control-symbol-noise',
        difficulty: 'control',
        query: 'zxqv jarnyx orbital marmalade 77319'
    }
]

const DIFFICULTY_NOTES: Record<SearchCase['difficulty'], string> = {
    exact: 'direct keyword/title overlap',
    paraphrase: 'same meaning with different wording',
    noisy: 'misspellings and typo tolerance',
    rare: 'specific rare phrase marker',
    long: 'natural-language question',
    control: 'unrelated query; should return few or no strong matches'
}

function printHelp() {
    console.log(`Search benchmark

Runs a generated article corpus through the ingest API, then measures hybrid search
latency and relevance across exact, paraphrase, typo/noisy, rare-token, long, and
unrelated control queries.

Usage:
  bun run bench:search [options]
  bun run src/scripts/benchmarkSearch.ts [options]

Options:
  --base-url <url>       API origin. Default: BENCH_BASE_URL or http://localhost:3000
  --api-key <key>        Ingest/delete API key. Default: INGEST_API_KEY or API_KEY
  --count <n>            Dummy articles to generate. Default: 24
  --concurrency <n>      Concurrent ingest requests. Default: 3
  --repeats <n>          Search repeats per query. Default: 3
  --limit <n>            Search result limit. Default: 10
  --id-base <n>          First generated external ID. Default: 880000000
  --no-seed              Skip ingest and only run the search suite
  --reset                Delete generated article IDs before seeding
  --cleanup              Delete generated articles at the end
  --timeout-ms <n>       Per-request timeout. Default: 60000
  --ingest-delay-ms <n>  Delay after each ingest request. Default: 0
  --search-delay-ms <n>  Delay after each search request. Default: 250
  --show-results         Print expected, top result, and top candidates per query
  --top-k <n>            Candidate count to print/store per query. Default: 3
  --json <path>          Write the full benchmark report as JSON
  --help                 Show this help

Examples:
  INGEST_API_KEY=dev-key bun run bench:search --reset --count 16 --concurrency 1 --search-delay-ms 500
  bun run bench:search --base-url https://dev-search.mindplex.ai --no-seed --search-delay-ms 1000
`)
}

function parseArgs(argv: string[]): CliOptions {
    const options: CliOptions = {
        baseUrl: process.env.BENCH_BASE_URL || 'http://localhost:3000',
        apiKey: process.env.INGEST_API_KEY || process.env.API_KEY,
        count: Number(process.env.BENCH_ARTICLES || 24),
        concurrency: Number(process.env.BENCH_CONCURRENCY || 3),
        repeats: Number(process.env.BENCH_REPEATS || 3),
        limit: Number(process.env.BENCH_LIMIT || 10),
        idBase: Number(process.env.BENCH_ID_BASE || 880000000),
        seed: process.env.BENCH_SEED === 'false' ? false : true,
        reset: process.env.BENCH_RESET === 'true',
        cleanup: process.env.BENCH_CLEANUP === 'true',
        timeoutMs: Number(process.env.BENCH_TIMEOUT_MS || 60_000),
        ingestDelayMs: Number(process.env.BENCH_INGEST_DELAY_MS || 0),
        searchDelayMs: Number(process.env.BENCH_SEARCH_DELAY_MS || 250),
        showResults: process.env.BENCH_SHOW_RESULTS === 'true',
        topK: Number(process.env.BENCH_TOP_K || 3)
    }

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i]
        const next = argv[i + 1]

        switch (arg) {
            case '--help':
            case '-h':
                printHelp()
                process.exit(0)
                break
            case '--base-url':
                options.baseUrl = requireValue(arg, next)
                i += 1
                break
            case '--api-key':
                options.apiKey = requireValue(arg, next)
                i += 1
                break
            case '--count':
                options.count = positiveInt(arg, requireValue(arg, next))
                i += 1
                break
            case '--concurrency':
                options.concurrency = positiveInt(arg, requireValue(arg, next))
                i += 1
                break
            case '--repeats':
                options.repeats = positiveInt(arg, requireValue(arg, next))
                i += 1
                break
            case '--limit':
                options.limit = positiveInt(arg, requireValue(arg, next))
                i += 1
                break
            case '--id-base':
                options.idBase = positiveInt(arg, requireValue(arg, next))
                i += 1
                break
            case '--no-seed':
                options.seed = false
                break
            case '--reset':
                options.reset = true
                break
            case '--cleanup':
                options.cleanup = true
                break
            case '--timeout-ms':
                options.timeoutMs = positiveInt(arg, requireValue(arg, next))
                i += 1
                break
            case '--ingest-delay-ms':
                options.ingestDelayMs = nonNegativeInt(arg, requireValue(arg, next))
                i += 1
                break
            case '--search-delay-ms':
                options.searchDelayMs = nonNegativeInt(arg, requireValue(arg, next))
                i += 1
                break
            case '--show-results':
                options.showResults = true
                break
            case '--top-k':
                options.topK = positiveInt(arg, requireValue(arg, next))
                i += 1
                break
            case '--json':
                options.outputJson = requireValue(arg, next)
                i += 1
                break
            default:
                throw new Error(`Unknown option: ${arg}`)
        }
    }

    if (options.seed && !options.apiKey) {
        throw new Error('Ingest requires an API key. Set INGEST_API_KEY/API_KEY or pass --api-key.')
    }

    if ((options.reset || options.cleanup) && !options.apiKey) {
        throw new Error('Reset/cleanup requires an API key. Set INGEST_API_KEY/API_KEY or pass --api-key.')
    }

    options.baseUrl = options.baseUrl.replace(/\/+$/, '')
    return options
}

function requireValue(flag: string, value?: string) {
    if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value`)
    return value
}

function positiveInt(flag: string, value: string) {
    const parsed = Number(value)
    if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${flag} must be a positive integer`)
    return parsed
}

function nonNegativeInt(flag: string, value: string) {
    const parsed = Number(value)
    if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`${flag} must be a non-negative integer`)
    return parsed
}

function buildArticles(count: number, idBase: number): BenchmarkArticle[] {
    return Array.from({ length: count }, (_, index) => {
        const topic = TOPICS[index % TOPICS.length]
        const round = Math.floor(index / TOPICS.length) + 1
        const externalId = idBase + index
        const reportMarker = round === 1 ? 'baseline report' : `field report ${round}`
        const rareMarker = `${topic.rare} ${reportMarker}`
        const title = `${topic.title}, ${reportMarker}`
        const slug = `benchmark-${slugify(title)}-${externalId}`
        const teaser = `${topic.teaser} Benchmark article ${round} includes ${rareMarker} as a hard retrieval marker.`
        const content = buildArticleHtml(topic, round, reportMarker, rareMarker)

        const queryPrefix = `${slug}-${index}`
        const expectedQueries: SearchCase[] = [
            {
                label: `${queryPrefix}-exact`,
                difficulty: 'exact',
                query: `${topic.exactQuery} ${reportMarker}`,
                expectedExternalId: externalId,
                expectedTitle: title
            },
            {
                label: `${queryPrefix}-paraphrase`,
                difficulty: 'paraphrase',
                query: `${topic.paraphraseQuery} ${reportMarker}`,
                expectedExternalId: externalId,
                expectedTitle: title
            },
            {
                label: `${queryPrefix}-noisy`,
                difficulty: 'noisy',
                query: `${topic.noisyQuery} ${round === 1 ? 'basline report' : `feeld report ${round}`}`,
                expectedExternalId: externalId,
                expectedTitle: title
            },
            {
                label: `${queryPrefix}-rare`,
                difficulty: 'rare',
                query: rareMarker,
                expectedExternalId: externalId,
                expectedTitle: title
            },
            {
                label: `${queryPrefix}-long`,
                difficulty: 'long',
                query: `${topic.longQuery} It was labeled ${reportMarker}.`,
                expectedExternalId: externalId,
                expectedTitle: title
            }
        ]

        return {
            externalId,
            title,
            slug,
            teaser,
            content,
            category: topic.category,
            tag: topic.tag,
            expectedQueries
        }
    })
}

function buildArticleHtml(topic: typeof TOPICS[number], round: number, reportMarker: string, rareMarker: string) {
    const variants = [
        `This synthetic benchmark item is intentionally dense. It repeats the main concept in natural language so semantic search can find it without a perfect keyword overlap.`,
        `Round ${round} is labeled ${reportMarker} and introduces distractor words such as archive, protocol, dashboard, signal, and cooperative planning while keeping the central article meaning intact.`,
        `Operators compare exact keyword retrieval, paraphrased questions, misspelled requests, and rare marker searches against the same expected article.`,
        `The phrase ${rareMarker} appears in body copy and teaser text to test whether full-text ranking can rescue highly specific queries.`,
        `A realistic user may ask for "${topic.paraphraseQuery} ${reportMarker}" rather than the title. The benchmark checks whether this article still rises near the top.`,
        ...topic.body
    ]

    return variants
        .map((text, index) => index === 0 ? `<h2>${escapeHtml(topic.title)}</h2><p>${escapeHtml(text)}</p>` : `<p>${escapeHtml(text)}</p>`)
        .join('\n')
}

function slugify(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function escapeHtml(value: string) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

function articlePayload(article: BenchmarkArticle) {
    return {
        post: {
            id: article.externalId,
            post_title: article.title,
            post_name: article.slug,
            post_content: article.content,
            brief_overview: article.teaser,
            author_name: 'Benchmark Bot',
            post_date: new Date('2026-01-15T12:00:00.000Z').toISOString(),
            tag: { name: article.tag },
            category: { name: article.category },
            other_authors: [],
            co_authors: [],
            post_editors: []
        }
    }
}

async function timedJson<T>(url: string, init: RequestInit, timeoutMs: number): Promise<TimedResult<T>> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    const started = performance.now()

    try {
        const response = await fetch(url, { ...init, signal: controller.signal })
        const text = await response.text()
        const ms = performance.now() - started
        const data = text ? JSON.parse(text) as T : undefined

        return {
            ok: response.ok,
            status: response.status,
            ms,
            data,
            error: response.ok ? undefined : JSON.stringify(data)
        }
    } catch (error: any) {
        return {
            ok: false,
            status: 0,
            ms: performance.now() - started,
            error: error?.name === 'AbortError' ? `Timed out after ${timeoutMs}ms` : error?.message || String(error)
        }
    } finally {
        clearTimeout(timeout)
    }
}

async function mapLimit<T, R>(items: T[], limit: number, worker: (item: T, index: number) => Promise<R>): Promise<R[]> {
    const results = new Array<R>(items.length)
    let nextIndex = 0

    async function run() {
        while (nextIndex < items.length) {
            const currentIndex = nextIndex
            nextIndex += 1
            results[currentIndex] = await worker(items[currentIndex], currentIndex)
        }
    }

    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run))
    return results
}

function sleep(ms: number) {
    return ms > 0 ? new Promise(resolve => setTimeout(resolve, ms)) : Promise.resolve()
}

async function checkHealth(options: CliOptions) {
    const result = await timedJson<{ status?: string }>(
        `${options.baseUrl}/health`,
        { method: 'GET' },
        Math.min(options.timeoutMs, 10_000)
    )

    if (!result.ok) {
        throw new Error(`Health check failed for ${options.baseUrl}/health: ${result.error || `HTTP ${result.status}`}`)
    }
}

async function ingestArticles(options: CliOptions, articles: BenchmarkArticle[]) {
    console.log(`\nSeeding ${articles.length} generated articles...`)

    const results = await mapLimit(articles, options.concurrency, async (article, index) => {
        const result = await timedJson<IngestResponse>(
            `${options.baseUrl}/ingest/v1/articles`,
            {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'x-api-key': options.apiKey || ''
                },
                body: JSON.stringify(articlePayload(article))
            },
            options.timeoutMs
        )

        const state = result.ok ? 'created' : result.status === 409 ? 'exists' : 'failed'
        console.log(`[${index + 1}/${articles.length}] ${state} ${article.externalId} in ${formatMs(result.ms)}`)
        await sleep(options.ingestDelayMs)
        return { article, result, state }
    })

    return results
}

async function cleanupArticles(options: CliOptions, articles: BenchmarkArticle[]) {
    console.log(`\nCleaning up ${articles.length} generated articles...`)

    await mapLimit(articles, options.concurrency, async (article, index) => {
        const result = await timedJson(
            `${options.baseUrl}/articles/v1/${article.externalId}`,
            {
                method: 'DELETE',
                headers: { 'x-api-key': options.apiKey || '' }
            },
            options.timeoutMs
        )

        const state = result.ok ? 'deleted' : result.status === 404 ? 'missing' : 'failed'
        console.log(`[${index + 1}/${articles.length}] ${state} ${article.externalId} in ${formatMs(result.ms)}`)
        return result
    })
}

async function runSearches(options: CliOptions, cases: SearchCase[]): Promise<SearchMeasurement[]> {
    const measurements: SearchMeasurement[] = []
    console.log(`\nRunning ${cases.length} query cases x ${options.repeats} repeats...`)

    for (const searchCase of cases) {
        for (let repeat = 1; repeat <= options.repeats; repeat += 1) {
            const params = new URLSearchParams({
                q: searchCase.query,
                limit: String(options.limit),
                page: '1',
                fields: 'externalId,title,slug'
            })

            const result = await timedJson<SearchResponse>(
                `${options.baseUrl}/search/v1?${params.toString()}`,
                { method: 'GET' },
                options.timeoutMs
            )

            const rows = result.data?.articles || []
            const hitIndex = searchCase.expectedExternalId
                ? rows.findIndex(row => row.externalId === searchCase.expectedExternalId)
                : -1
            const top = rows[0]
            const candidates = rows.slice(0, options.topK).map((row, index) => ({
                rank: index + 1,
                externalId: row.externalId,
                title: row.title,
                slug: row.slug,
                score: numericScore(row.score),
                isExpected: Boolean(searchCase.expectedExternalId && row.externalId === searchCase.expectedExternalId)
            }))
            const measurement: SearchMeasurement = {
                label: searchCase.label,
                difficulty: searchCase.difficulty,
                difficultyNote: DIFFICULTY_NOTES[searchCase.difficulty],
                query: searchCase.query,
                expectedExternalId: searchCase.expectedExternalId,
                expectedTitle: searchCase.expectedTitle,
                repeat,
                ok: result.ok,
                status: result.status,
                ms: result.ms,
                count: rows.length,
                hitRank: hitIndex >= 0 ? hitIndex + 1 : undefined,
                topExternalId: top?.externalId,
                topTitle: top?.title,
                topScore: numericScore(top?.score),
                candidates,
                error: result.error
            }
            measurements.push(measurement)

            const relevance = searchCase.expectedExternalId
                ? measurement.hitRank ? `hit@${measurement.hitRank}` : 'miss'
                : `${measurement.count} results`
            const topSummary = top
                ? `top=${top.externalId ?? 'n/a'} ${truncate(top.title || 'untitled', 54)}${measurement.topScore === undefined ? '' : ` score=${measurement.topScore.toFixed(4)}`}`
                : 'top=none'
            console.log(`${searchCase.difficulty.padEnd(10)} ${formatMs(result.ms).padStart(9)} ${relevance.padEnd(10)} expected=${searchCase.expectedExternalId ?? 'control'} ${topSummary}`)

            if (options.showResults) {
                console.log(`  q: ${searchCase.query}`)
                console.log(`  test: ${DIFFICULTY_NOTES[searchCase.difficulty]}`)
                if (searchCase.expectedExternalId) {
                    console.log(`  expected: ${searchCase.expectedExternalId} ${searchCase.expectedTitle}`)
                }
                for (const candidate of candidates) {
                    const marker = candidate.isExpected ? '*' : ' '
                    const score = candidate.score === undefined ? '' : ` score=${candidate.score.toFixed(4)}`
                    console.log(`  ${marker}#${candidate.rank} ${candidate.externalId ?? 'n/a'} ${truncate(candidate.title || 'untitled', 80)}${score}`)
                }
            }
            await sleep(options.searchDelayMs)
        }
    }

    return measurements
}

function percentile(values: number[], p: number) {
    if (values.length === 0) return 0
    const sorted = [...values].sort((a, b) => a - b)
    const index = Math.ceil((p / 100) * sorted.length) - 1
    return sorted[Math.max(0, Math.min(sorted.length - 1, index))]
}

function average(values: number[]) {
    if (values.length === 0) return 0
    return values.reduce((sum, value) => sum + value, 0) / values.length
}

function numericScore(score: number | string | undefined) {
    if (score === undefined) return undefined
    const parsed = Number(score)
    return Number.isFinite(parsed) ? parsed : undefined
}

function truncate(value: string, maxLength: number) {
    return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`
}

function summarizeSearch(measurements: SearchMeasurement[]) {
    const ok = measurements.filter(item => item.ok)
    const expected = ok.filter(item => item.expectedExternalId)
    const controls = ok.filter(item => !item.expectedExternalId)
    const firstRepeats = ok.filter(item => item.repeat === 1)
    const laterRepeats = ok.filter(item => item.repeat > 1)

    const hitAt = (rank: number) => {
        if (expected.length === 0) return 0
        return expected.filter(item => item.hitRank && item.hitRank <= rank).length / expected.length
    }

    const reciprocalRanks = expected.map(item => item.hitRank ? 1 / item.hitRank : 0)

    const byDifficulty = Array.from(new Set(ok.map(item => item.difficulty))).map(difficulty => {
        const group = ok.filter(item => item.difficulty === difficulty)
        const groupExpected = group.filter(item => item.expectedExternalId)
        return {
            difficulty,
            requests: group.length,
            p50Ms: percentile(group.map(item => item.ms), 50),
            p95Ms: percentile(group.map(item => item.ms), 95),
            hitAt1: groupExpected.length ? groupExpected.filter(item => item.hitRank === 1).length / groupExpected.length : undefined,
            hitAt10: groupExpected.length ? groupExpected.filter(item => item.hitRank && item.hitRank <= 10).length / groupExpected.length : undefined,
            avgResultCount: average(group.map(item => item.count))
        }
    })

    return {
        requests: measurements.length,
        successfulRequests: ok.length,
        failedRequests: measurements.length - ok.length,
        avgMs: average(ok.map(item => item.ms)),
        p50Ms: percentile(ok.map(item => item.ms), 50),
        p95Ms: percentile(ok.map(item => item.ms), 95),
        p99Ms: percentile(ok.map(item => item.ms), 99),
        maxMs: ok.length ? Math.max(...ok.map(item => item.ms)) : 0,
        firstRepeatAvgMs: average(firstRepeats.map(item => item.ms)),
        firstRepeatP95Ms: percentile(firstRepeats.map(item => item.ms), 95),
        laterRepeatAvgMs: average(laterRepeats.map(item => item.ms)),
        laterRepeatP95Ms: percentile(laterRepeats.map(item => item.ms), 95),
        hitAt1: hitAt(1),
        hitAt3: hitAt(3),
        hitAt10: hitAt(10),
        meanReciprocalRank: average(reciprocalRanks),
        controlAvgResultCount: average(controls.map(item => item.count)),
        byDifficulty
    }
}

function summarizeIngest(results: Awaited<ReturnType<typeof ingestArticles>>) {
    const timings = results.map(item => item.result.ms)
    return {
        requests: results.length,
        created: results.filter(item => item.state === 'created').length,
        existing: results.filter(item => item.state === 'exists').length,
        failed: results.filter(item => item.state === 'failed').length,
        avgMs: average(timings),
        p50Ms: percentile(timings, 50),
        p95Ms: percentile(timings, 95),
        maxMs: timings.length ? Math.max(...timings) : 0
    }
}

function formatMs(ms: number) {
    return `${ms.toFixed(1)}ms`
}

function formatPct(value: number) {
    return `${(value * 100).toFixed(1)}%`
}

function printSummary(report: any) {
    console.log('\nSummary')
    console.log(`Base URL: ${report.options.baseUrl}`)
    console.log(`Corpus: ${report.articleCount} generated articles`)

    if (report.ingest) {
        console.log('\nIngest')
        console.log(`Requests: ${report.ingest.requests} created=${report.ingest.created} existing=${report.ingest.existing} failed=${report.ingest.failed}`)
        console.log(`Latency: avg=${formatMs(report.ingest.avgMs)} p50=${formatMs(report.ingest.p50Ms)} p95=${formatMs(report.ingest.p95Ms)} max=${formatMs(report.ingest.maxMs)}`)
    }

    console.log('\nSearch')
    console.log(`Requests: ${report.search.requests} ok=${report.search.successfulRequests} failed=${report.search.failedRequests}`)
    console.log(`Latency: avg=${formatMs(report.search.avgMs)} p50=${formatMs(report.search.p50Ms)} p95=${formatMs(report.search.p95Ms)} p99=${formatMs(report.search.p99Ms)} max=${formatMs(report.search.maxMs)}`)
    if (report.options.repeats > 1) {
        console.log(`Repeat split: first avg=${formatMs(report.search.firstRepeatAvgMs)} p95=${formatMs(report.search.firstRepeatP95Ms)} later avg=${formatMs(report.search.laterRepeatAvgMs)} p95=${formatMs(report.search.laterRepeatP95Ms)}`)
    }
    console.log(`Relevance: hit@1=${formatPct(report.search.hitAt1)} hit@3=${formatPct(report.search.hitAt3)} hit@10=${formatPct(report.search.hitAt10)} MRR=${report.search.meanReciprocalRank.toFixed(3)}`)
    console.log(`Controls: avg result count=${report.search.controlAvgResultCount.toFixed(2)}`)
    console.log(`JSON detail: each measurement includes query, difficulty note, expected target, top result, score, hit rank, and top candidates.`)

    console.log('\nBy difficulty')
    for (const row of report.search.byDifficulty) {
        const relevance = row.hitAt1 === undefined
            ? `avgResults=${row.avgResultCount.toFixed(2)}`
            : `hit@1=${formatPct(row.hitAt1)} hit@10=${formatPct(row.hitAt10)}`
        console.log(`${String(row.difficulty).padEnd(10)} requests=${String(row.requests).padStart(3)} p50=${formatMs(row.p50Ms).padStart(9)} p95=${formatMs(row.p95Ms).padStart(9)} ${relevance}`)
    }

    const misses = report.measurements.filter((item: SearchMeasurement) => item.expectedExternalId && !item.hitRank)
    if (misses.length > 0) {
        console.log('\nMisses')
        for (const miss of misses.slice(0, 12)) {
            console.log(`${miss.difficulty} expected=${miss.expectedExternalId} top=${miss.topExternalId || 'none'} query="${miss.query}"`)
        }
        if (misses.length > 12) console.log(`...and ${misses.length - 12} more misses`)
    }

    const controls = report.measurements.filter((item: SearchMeasurement) => item.difficulty === 'control')
    if (controls.length > 0) {
        console.log('\nControl query top results')
        for (const control of controls) {
            const top = control.candidates[0]
            const topLabel = top ? `${top.externalId ?? 'n/a'} ${truncate(top.title || 'untitled', 70)}${top.score === undefined ? '' : ` score=${top.score.toFixed(4)}`}` : 'none'
            console.log(`control top=${topLabel} query="${control.query}"`)
        }
    }
}

async function writeJson(path: string, report: unknown) {
    await Bun.write(path, JSON.stringify(report, null, 2))
    console.log(`\nWrote JSON report to ${path}`)
}

async function main() {
    const options = parseArgs(Bun.argv.slice(2))
    const articles = buildArticles(options.count, options.idBase)
    const searchCases = [
        ...articles.flatMap(article => article.expectedQueries),
        ...CONTROL_QUERIES
    ]

    console.log('Mindplex search benchmark')
    console.log(`Target: ${options.baseUrl}`)
    console.log(`Seed: ${options.seed ? 'yes' : 'no'} | Reset: ${options.reset ? 'yes' : 'no'} | Cleanup: ${options.cleanup ? 'yes' : 'no'} | Articles: ${articles.length} | Queries: ${searchCases.length}`)

    await checkHealth(options)

    if (options.reset) await cleanupArticles(options, articles)
    const ingest = options.seed ? summarizeIngest(await ingestArticles(options, articles)) : undefined
    const measurements = await runSearches(options, searchCases)

    const report = {
        createdAt: new Date().toISOString(),
        options: {
            ...options,
            apiKey: options.apiKey ? '[redacted]' : undefined
        },
        articleCount: articles.length,
        queryCount: searchCases.length,
        ingest,
        search: summarizeSearch(measurements),
        measurements
    }

    printSummary(report)

    if (options.outputJson) await writeJson(options.outputJson, report)
    if (options.cleanup) await cleanupArticles(options, articles)

    if (report.search.failedRequests > 0 || report.ingest?.failed) {
        process.exitCode = 1
    }
}

if (import.meta.main) {
    main().catch((error) => {
        console.error(`Benchmark failed: ${error.message || error}`)
        process.exit(1)
    })
}
