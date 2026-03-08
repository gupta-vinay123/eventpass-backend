const express = require('express');
const router = express.Router();
const {
    getMyBookings,
    downloadTicket,
    getPaidEventsReport,
    deleteBooking,
} = require('../controllers/bookingController');
const { protect, admin } = require('../middleware/authMiddleware');


router.get('/my-bookings', protect, getMyBookings);
router.get('/download/:bookingId', protect, downloadTicket);
router.get('/admin/report', protect, admin, getPaidEventsReport);
router.delete('/:id', protect, deleteBooking);

module.exports = router;
