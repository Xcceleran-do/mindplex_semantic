import { Hono } from 'hono'

const users = new Hono()

users.get('/', (c) => {
    return c.json({ message: 'Hello users!' })
})

export default users