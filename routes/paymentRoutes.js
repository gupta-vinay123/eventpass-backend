const express = require('express');
const router = express.Router();
const { createPaymentIntent, handleWebhook } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');


router.post('/webhook', handleWebhook);


router.post('/create-intent', protect, createPaymentIntent);

module.exports = router;
