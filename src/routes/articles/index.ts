import { Hono } from 'hono'
import { Chunk } from '$src/lib/Chunk'

const articles = new Hono()

articles.get('/', (c) => {
    return c.json({ message: 'Hello articles!' })
})

articles.post('/', async (c) => {

    // const mock = await c.req.json()
    // const chunk = new Chunk()
    // console.log(chunk.processChunk(mock.post))
    return c.json({ message: 'Hello articles!' })
})

export default articles