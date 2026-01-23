import { RedisClient } from "bun";

const connectionString = process.env.REDIS_URL || "redis://localhost:6379";
const useTls = process.env.REDIS_TLS === 'true';

export const redis = new RedisClient(connectionString, {
    maxRetries: 10,
    connectionTimeout: 5000,
    tls: useTls ? {} : undefined,
});

export default redis;