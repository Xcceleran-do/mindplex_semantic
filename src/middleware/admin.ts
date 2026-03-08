import { Context, Next } from "hono";
import { AppContext } from "$src/types";

export const adminMiddleware = async (c: Context<AppContext>, next: Next) => {
    const apiKey = c.req.header('X-API-Key');
    const adminApiKey = process.env.ADMIN_API_KEY;
    
    if (!apiKey || !adminApiKey || apiKey !== adminApiKey) {
        return c.json({ error: 'Unauthorized - Valid API key required' }, 401);
    }
    
    await next();
};