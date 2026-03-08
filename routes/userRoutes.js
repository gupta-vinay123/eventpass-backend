const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Event = require('../models/Event');
const Booking = require('../models/Booking');
const { protect, admin } = require('../middleware/authMiddleware');

// Admin dashboard stats
router.get('/stats', protect, admin, async (req, res) => {
    try {
        const totalEvents   = await Event.countDocuments();
        const totalUsers    = await User.countDocuments();
        const totalBookings = await Booking.countDocuments({ status: 'Paid' });
        const bookings = await Booking.find({ status: 'Paid' }).lean();
        const totalRevenue = bookings.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);

        res.json({ totalEvents, totalUsers, totalBookings, totalRevenue });
    } catch (error) {
        res.status(500).json({ message: 'Could not fetch stats.' });
    }
});

// Delete user (admin only)
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' }); // ✅ return added
        }
        await user.deleteOne();
        res.json({ message: 'User removed' });
    } catch (error) {
        res.status(500).json({ message: 'Could not delete user.' });
    }
});

module.exports = router;
