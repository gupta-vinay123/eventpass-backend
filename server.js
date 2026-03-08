const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const { apiLimiter } = require('./middleware/rateLimiter');

// .env file 
dotenv.config();

const app = express();
app.set('trust proxy', 1);
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

const allowedOrigins = process.env.NODE_ENV === 'production'
    ? [process.env.FRONTEND_URL]           
    : ['http://localhost:3000'];            

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS: Origin ${origin} not allowed.`));
        }
    },
    credentials: true,  
}));

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use('/api/payments', express.json(), require('./routes/paymentRoutes'));
// Middleware
app.use(express.json({ limit: '10kb' }));

//static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

//Rate Limiting
app.use('/api', apiLimiter);

//Routes
app.use('/api/auth',     require('./routes/authRoutes'));
app.use('/api/users',    require('./routes/userRoutes'));
app.use('/api/events',   require('./routes/eventRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));


//Health Check 
app.get('/health', async (req, res) => {
    const dbState = mongoose.connection.readyState;
    if (dbState === 1) {
        res.status(200).json({ status: 'ok', db: 'connected' });
    } else {
        res.status(503).json({ status: 'error', db: 'disconnected' });
    }
});

// Basic Route
app.get('/', (req, res) => {
    res.json({ message: 'EventPass API is running' });
});

// 404 Handler 
app.use((req, res) => {
    res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

//Global Error handler
app.use((err, req, res, next) => {
    if (err.message?.startsWith('CORS:')) {
        return res.status(403).json({ message: err.message });
    }

    console.error('❌ Unhandled Error:', err.stack);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        message: err.message || 'Internal Server Error.',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected!'))
    .catch((err) => {
        console.error('❌ DB Connection Error:', err.message);
        process.exit(1); 
    });

require('./workers/emailWorker');
const { startCleanupJob } = require('./jobs/cleanupPendingBookings');
startCleanupJob();


//Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
