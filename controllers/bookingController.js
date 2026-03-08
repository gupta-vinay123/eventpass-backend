const Booking = require('../models/Booking');
const Event = require('../models/Event');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');


//Get My Bookings 
const getMyBookings = async (req, res, next) => {
    try {
        const bookings = await Booking.find({ user: req.user._id })
            .populate('event')
            .sort({ createdAt: -1 });
        res.status(200).json(bookings);
    } catch (error) {
        next(error);
    }
};

// Delete Booking
const deleteBooking = async (req, res, next) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found.' });
        }

        if (booking.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'You are not authorized to delete this booking.' });
        }

        // Prevent deleting Paid bookings
        if (booking.status === 'Paid') {
            return res.status(400).json({ message: 'Paid bookings cannot be deleted. Contact support for refunds.' });
        }

        await Booking.findByIdAndDelete(req.params.id);

        await Event.findByIdAndUpdate(booking.event, {
            $inc: { availableTickets: booking.ticketsBooked },
        });

        res.status(200).json({ message: 'Booking deleted successfully.' });
    } catch (error) {
        next(error);
    }
};

//Download Ticket PDF
const downloadTicket = async (req, res, next) => {
    try {
        const { bookingId } = req.params;
        const booking = await Booking.findById(bookingId).populate('event').populate('user');

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found.' });
        }

        const doc = new PDFDocument({ size: 'A6', margin: 30 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Ticket-${bookingId}.pdf`);
        doc.pipe(res);

        doc.rect(0, 0, doc.page.width, doc.page.height).fill('#050505');
        doc.fillColor('#ADFF2F').fontSize(22).text('EVENTPASS', { align: 'center', charSpacing: 2 });
        doc.moveDown(0.5);
        doc.fillColor('#FFFFFF').fontSize(10).text('OFFICIAL ENTRANCE TICKET', { align: 'center', underline: true });
        doc.moveDown(1.5);

        doc.fillColor('#ADFF2F').fontSize(11).text('ATTENDEE NAME');
        doc.fillColor('#FFFFFF').fontSize(10).text(`${booking.user?.name || 'Valued Guest'}`);
        doc.moveDown(0.8);

        doc.fillColor('#ADFF2F').fontSize(11).text('EVENT DETAILS');
        doc.fillColor('#FFFFFF').fontSize(10).text(`Event: ${booking.event.title}`);
        doc.text(`Location: ${booking.event.location}`);
        doc.text(`Date: ${new Date(booking.event.date).toLocaleDateString()}`);
        doc.moveDown(0.8);

        doc.fillColor('#ADFF2F').fontSize(11).text('BOOKING SUMMARY');
        doc.fillColor('#FFFFFF').fontSize(10).text(`Total Tickets: ${booking.ticketsBooked}`);
        doc.fillColor('#FFFFFF').fontSize(10).text(`Total Price: LKR ${booking.totalAmount}`);
        doc.moveDown(1);

        const qrData = JSON.stringify({
            bookingId: booking._id,
            holder: booking.user?.name,
            event: booking.event.title,
            tickets: booking.ticketsBooked,
        });

        const qrCodeDataURL = await QRCode.toDataURL(qrData);
        doc.image(qrCodeDataURL, (doc.page.width / 2) - 50, doc.y, { width: 100 });
        doc.moveDown(10);
        doc.fillColor('#ADFF2F').fontSize(8).text('SCAN FOR ENTRY AT VENUE', { align: 'center' });
        doc.fillColor('#444').fontSize(6).text(`Booking ID: ${booking._id}`, { align: 'center' });

        doc.end();
    } catch (error) {
        next(error);
    }
};

//Admin Report
const getPaidEventsReport = async (req, res, next) => {
    try {
        const reports = await Booking.find()
            .populate('user', 'name email')
            .populate('event', 'title price date')
            .sort({ createdAt: -1 });
        res.json(reports);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getMyBookings,
    deleteBooking,
    downloadTicket,
    getPaidEventsReport,
};