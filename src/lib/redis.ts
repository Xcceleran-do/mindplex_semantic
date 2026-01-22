import { RedisClient } from "bun";

const connectionString = process.env.REDIS_URL || "redis://localhost:6379";

export const redis = new RedisClient(connectionString, {
    maxRetries: 10,
    connectionTimeout: 5000,
});

export default redis;