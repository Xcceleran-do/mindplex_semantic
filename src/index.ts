import { Hono } from 'hono'
import { createMiddleware } from "hono/factory";
import { drizzle } from 'drizzle-orm/node-postgres'

import articles from '$src/routes/articles'
import search from '$src/routes/search'
import usersRoute from '$src/routes/users'
import * as schema from '$src/db/schema'
import ingest from '$src/routes/ingest'

import { AppContext } from '$src/types'

const app = new Hono<AppContext>()

const dbMiddleware = createMiddleware(async (c, next) => {
  const db = drizzle(process.env.DATABASE_URL!, { schema })
  c.set('db', db);
  c.set('schema', schema)
  await next();
});

app.use(dbMiddleware)

app.route('/ingest', ingest)
app.route('/articles', articles)
app.route('/search', search)
app.route('/users', usersRoute)

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.get('/health', async (c) => {
  const db = c.get('db');
  const result = await db.execute('select 1');

  if (result && result.rows[0]['?column?'] === 1) {
    return c.json({ status: "ok" })
  } else {
    c.status(500)
    return c.json({ status: "error" })
  }
})

export default app
