const express = require('express');
const router = express.Router();
const {
    createEvent,
    getEvents,
    getEventById,
    updateEvent,
    deleteEvent,
    getEventTicketStats
} = require('../controllers/eventController');
const { protect, admin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { cache } = require('../middleware/cacheMiddleware');

//Public routes
router.get('/',      cache(300), getEvents);      
router.get('/stats', protect, admin, getEventTicketStats);
router.get('/:id',   cache(300), getEventById);   

// Admin routes
router.post('/',    protect, admin, upload.single('image'), createEvent);
router.put('/:id',  protect, admin, upload.single('image'), updateEvent);
router.delete('/:id', protect, admin, deleteEvent);

module.exports = router;
