import { Hono } from 'hono'
import { createMiddleware } from "hono/factory";
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from "pg";
import { Scalar } from '@scalar/hono-api-reference'
import { openAPIRouteHandler } from 'hono-openapi'

import articles from '$src/routes/articles'
import search from '$src/routes/search'
import usersRoute from '$src/routes/users'
import * as schema from '$src/db/schema'
import ingest from '$src/routes/ingest'

import { AppContext } from '$src/types'
import { AppError } from '$src/lib/errors'
import articleSummaries, { summaryCollection } from '$src/routes/summary'
import retrieval from '$src/routes/chat'
import { componentSchemas } from '$src/lib/openapi'


const app = new Hono<AppContext>()
const urlObj = new URL(process.env.DATABASE_URL || '');
const isLocal = urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1';


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : {
    rejectUnauthorized: false
  }
});

const db = drizzle({ schema, client: pool })

const dbMiddleware = createMiddleware(async (c, next) => {
  c.set('db', db);
  c.set('schema', schema)
  await next();
});

app.use(dbMiddleware)

app.route('/v1/ingest', ingest)
app.route('/v1/articles', articles)
app.route('/v1/articles/:id/summaries', articleSummaries)
app.route('/v1/summaries', summaryCollection)
app.route('/v1/search', search)
app.route('/v1/users', usersRoute)
app.route('/v1/retrieve', retrieval)

app.get('/doc', openAPIRouteHandler(app, {
  documentation: {
    openapi: '3.0.3',
    info: {
      title: 'Semantic Search API',
      description: `A semantic search API for articles and users with hybrid search capabilities.

**Features:**
- Hybrid semantic search for articles (vector + full-text)
- Fuzzy text search for users
- Tone-specific article summaries
- Field selection for optimized responses
- RESTful CRUD operations`,
      version: '1.0.0',
      contact: {
        name: 'API Support',
        email: 'support@mindplex.ai'
      }
    },
    servers: [
      { url: 'http://localhost:3000/v1', description: 'Local development' },
      { url: 'https://dev-search.mindplex.ai/v1', description: 'Staging' },
      { url: 'https://search.mindplex.ai/v1', description: 'Production' },
    ],
    tags: [
      { name: 'Articles', description: 'Article search and management' },
      { name: 'Users', description: 'User search and management' },
      { name: 'Summaries', description: 'Article summaries by tone' },
      { name: 'Ingest', description: 'Data ingestion with embeddings and chunking' },
      { name: 'Retrieval', description: 'RAG chunk retrieval' },
      { name: 'Search', description: 'Standalone hybrid search' },
    ],
    components: {
      schemas: componentSchemas
    }
  }
}))

app.get('/ui', Scalar({ url: '/doc' }))

app.get('/', (c) => {
  return c.json({ message: 'This service is not meant to be accessed directly. Use the API endpoints instead.' })
})

app.get('/health', async (c) => {
  try {
    const db = c.get('db');
    const result = await db.execute('select 1');

    if (result && result.rows[0]['?column?'] === 1) {
      return c.json({ status: "ok" })
    } else {
      c.status(500)
      return c.json({ status: "error" })
    }

  } catch (error) {
    console.error(error)
    const msg = JSON.stringify(error)
    return c.json({ error: 'Failed to check database health ' + msg }, 500);
  }
})

app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json({
      success: false,
      error: err.message,
      details: err.details
    }, err.statusCode as any);
  }

  console.error("Unhandled Exception:", err);
  return c.json({
    success: false,
    error: 'Internal Server Error'
  }, 500);
});

export default app
