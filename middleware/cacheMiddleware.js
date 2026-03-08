
const { cacheClient } = require('../config/redis');

const CACHE_PREFIX = 'ep:'; 

//Cache middleware 
const cache = (ttlSeconds = 300) => {
    return async (req, res, next) => {
       
        if (req.method !== 'GET') return next();

        const key = `${CACHE_PREFIX}${req.originalUrl}`;

        try {
            const cached = await cacheClient.get(key);

            if (cached) {
           
                console.log(` Cache HIT: ${key}`);
                return res.json(JSON.parse(cached));
            }

           
            console.log(` Cache MISS: ${key}`);

            const originalJson = res.json.bind(res);

            res.json = async (data) => {
              
                try {
                    await cacheClient.setex(key, ttlSeconds, JSON.stringify(data));
                } catch (err) {
                   
                    console.error('Cache write error:', err.message);
                }
                return originalJson(data);
            };

            next();

        } catch (err) {
            
            console.error('Cache middleware error:', err.message);
            next();
        }
    };
};

//Cache invalidation
const invalidateEventCache = async () => {
    try {
        const keys = await cacheClient.keys(`${CACHE_PREFIX}/api/events*`);
        if (keys.length > 0) {
            await cacheClient.del(...keys);
            console.log(`  Cache invalidated: ${keys.length} key(s) deleted`);
        }
    } catch (err) {
        console.error('Cache invalidation error:', err.message);
    }
};

module.exports = { cache, invalidateEventCache };
