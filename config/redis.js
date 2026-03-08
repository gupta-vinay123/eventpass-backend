const Redis = require('ioredis');

const redisConfig = {
    host:     process.env.REDIS_HOST || 'localhost',
    port:     parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    keepAlive: 10000,
    // No TLS — Redis Cloud free tier doesn't require it
    retryStrategy: (times) => {
        if (times > 10) {
            console.error(' Redis: too many reconnection attempts, giving up');
            return null;
        }
        const delay = Math.min(times * 200, 2000);
        console.log(`🔄 Redis: reconnecting in ${delay}ms (attempt ${times})`);
        return delay;
    },

    enableOfflineQueue: false,
};

// Cache client — used by cacheMiddleware
const cacheClient = new Redis(redisConfig);

cacheClient.on('connect', () => console.log(' Redis cache connected'));
cacheClient.on('error',   (err) => console.error(' Redis cache error:', err.message));

// Queue client — used by BullMQ
// maxRetriesPerRequest: null is REQUIRED by BullMQ
const queueClient = new Redis({
    ...redisConfig,
    maxRetriesPerRequest: null,
    enableOfflineQueue:   true,
});

queueClient.on('connect', () => console.log('Redis queue connected'));
queueClient.on('error',   (err) => console.error(' Redis queue error:', err.message));

module.exports = { cacheClient, queueClient };