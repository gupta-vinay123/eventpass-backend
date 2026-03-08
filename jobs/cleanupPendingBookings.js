const cron = require('node-cron');
const Booking = require('../models/Booking');

const startCleanupJob = () => {
    cron.schedule('*/15 * * * *', async () => {
        console.log(' Running pending booking cleanup...');

        try {
            const cutoff = new Date(Date.now() - 30 * 60 * 1000); 
            const result = await Booking.updateMany(
                {
                    status:    'Pending',
                    createdAt: { $lt: cutoff },
                },
                {
                    $set: { status: 'Failed' }
                }
            );

            if (result.modifiedCount > 0) {
                console.log(` Cleanup: cancelled ${result.modifiedCount} abandoned booking(s)`);
            } else {
                console.log(' Cleanup: no abandoned bookings found');
            }

        } catch (error) {
            console.error(' Cleanup job error:', error.message);
        }
    });

    console.log(' Pending booking cleanup job scheduled (every 15 minutes)');
};

module.exports = { startCleanupJob };
