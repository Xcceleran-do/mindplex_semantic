import { Hono } from 'hono'

const articles = new Hono()

articles.get('/', (c) => {
    return c.json({ message: 'Hello articles!' })
})

export default articles