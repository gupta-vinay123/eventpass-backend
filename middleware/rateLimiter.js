const rateLimit = require('express-rate-limit');


const rateLimitHandler = (req, res) => {
    res.status(429).json({
        message: 'Too many requests. Please wait and try again.',
        retryAfter: res.getHeader('Retry-After'),
    });
};

// Auth limiter
// Applied to: POST /api/auth/login, POST /api/auth/register
// 100 attempts per 15 minutes per IP 
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  
    max: 100,                    
    standardHeaders: true,      
    legacyHeaders: false,       
    handler: rateLimitHandler,   
    skipSuccessfulRequests: false,
});

// General API limiter
// Applied to: all /api/* routes as a baseline
// Prevents someone from hammering server in a scripted loop
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  
    max: 200,                   
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
});

//Booking limiter 
// Applied to: POST /api/bookings
// Prevents ticket scalping bots from bulk-buying in a loop
const bookingLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,  
    max: 20,                    
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
});

module.exports = { authLimiter, apiLimiter, bookingLimiter };
