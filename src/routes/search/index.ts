import { Hono } from 'hono'

const search = new Hono()

search.get('/', (c) => {
    return c.json({ message: 'Hello search!' })
})

export default search