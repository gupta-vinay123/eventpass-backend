const express = require('express');
const router  = express.Router();
const {
    sendOtp,
    resendOtp,
    verifyOtp,
    loginUser,
    getUsers,
    deleteUser,
} = require('../controllers/authController');
const { protect, admin } = require('../middleware/authMiddleware');
const { validate, schemas } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');

// Public 
router.post('/send-otp',   authLimiter, validate(schemas.register), sendOtp);
router.post('/resend-otp', authLimiter, resendOtp);
router.post('/verify-otp', authLimiter, verifyOtp);
router.post('/login',      authLimiter, validate(schemas.login),    loginUser);

// Admin
router.get('/users',        protect, admin, getUsers);
router.delete('/users/:id', protect, admin, deleteUser);

module.exports = router;
