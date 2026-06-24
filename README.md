> [!WARNING]
> This project is deprecated and no longer maintained. It is provided for reference only. we merged the functionality into the main [Mindplex API](https://github.com/Xcceleran-do/mindplex_api/) repo and will continue to maintain it there.

# Mindplex Semantic

Mindplex Semantic is the search and indexing service behind article discovery, fuzzy user lookup, chunk retrieval, and tone-specific article summaries.

## Stack

- Bun + Hono for the API
- PostgreSQL 16 with `pgvector` and `pg_trgm`
- Drizzle ORM for schema and migrations
- Redis for embedding cache
- AWS Bedrock Titan v2 embeddings

## API conventions

- All public endpoints live under `/v1`.
- Resource lookups use external IDs in the path, for example `/v1/articles/:id`.
- `fields` can be used on read endpoints to limit the returned columns.
- `GET /v1/summaries` returns all summaries with pagination.
- Article summaries are article-scoped resources:
  - `GET /v1/articles/:id/summaries`
  - `GET /v1/articles/:id/summaries/:tone`
  - `PUT /v1/articles/:id/summaries/:tone`

See [docs/api.md](docs/api.md) for the endpoint reference.

## Local setup

1. Install dependencies:

```bash
bun install
```

2. Start PostgreSQL and Redis:

```bash
docker compose -f Docker-compose.yml up -d db redis
```

3. Set environment variables in `.env`:

```bash
DATABASE_URL=postgres://mindplex:mindplex@localhost:5432/semantic
REDIS_URL=redis://localhost:6379
AWS_BEDROCK_ACCESS_KEY=...
AWS_BEDROCK_SECRET_KEY=...
AWS_REGION=us-east-1

# JWT auth (choose one verification mode)
JWT_SECRET=...
# or
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
# or
JWT_JWKS_URI=https://auth.example.com/.well-known/jwks.json

# API key auth for ingestion
INGEST_API_KEY=replace-with-a-shared-secret
# or shared write protection for mutating routes
API_KEY=replace-with-a-shared-secret

# Optional verification settings
JWT_ALG=HS256
JWT_ISSUER=https://auth.example.com
JWT_AUDIENCE=mindplex-semantic
JWT_ROLE_CLAIM=role
```

4. Bootstrap the database and extensions:

```bash
bun run db:setup
```

5. Apply migrations:

```bash
bun run db:dev-migrate
```

6. Run the API:

```bash
bun run dev
```

## Useful endpoints

- `GET /health` for the health check
- `GET /doc` for the raw OpenAPI document
- `GET /ui` for the interactive API reference

## Data flows

- `POST /v1/ingest/articles` stores article metadata, generates embeddings, and writes searchable chunks.
- `POST /v1/ingest/users` stores users for fuzzy lookup.
- `PUT /v1/articles/:id/summaries/:tone` stores or replaces a summary for a given article and tone.

Only the `formal` summary tone generates and stores an embedding today.

## Search benchmark

Use the benchmark script to generate a synthetic article corpus, ingest it through the API, and measure hybrid search latency plus relevance across exact, paraphrase, noisy, rare-token, long-form, and unrelated control queries.

```bash
INGEST_API_KEY=replace-with-a-shared-secret bun run bench:search --reset --count 16 --concurrency 1 --repeats 3 --search-delay-ms 500 --show-results --json benchmark-report.json
```

The script expects the API to be reachable at `http://localhost:3000` by default. Override it with `--base-url` or `BENCH_BASE_URL`. Use `--reset` to delete the generated ID range before seeding, `--no-seed` to benchmark an already-seeded environment, `--cleanup` to delete generated articles after the run, `--ingest-delay-ms` / `--search-delay-ms` to avoid embedding-provider rate limits, `--show-results` to print expected-vs-returned candidates, and `--json benchmark-report.json` to save full per-query timings, scores, hit ranks, and top candidates.

## Auth

- `guard()` defaults to `admin` access.
- `guard('optional')` parses JWTs when present and skips auth when absent.
- `guard('editor')`, `guard('admin')`, and `guard('collaborator')` enforce minimum role access.
- Role detection defaults to common claims such as `role`, `roles`, `scope`, `scp`, `permissions`, and `realm_access.roles`.
- `JWT_ROLE_CLAIM` can override the role claim path with one or more comma-separated claim paths.
- Protected write endpoints use API key protection via `x-api-key` or `Authorization: ApiKey <key>`.
