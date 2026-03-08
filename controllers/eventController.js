const Event = require('../models/Event');
const Booking = require('../models/Booking');
const { invalidateEventCache } = require('../middleware/cacheMiddleware');
const cloudinary = require('cloudinary').v2;

// Create event
exports.createEvent = async (req, res) => {
    try {
        const { title, description, date, startTime, location, price, totalTickets } = req.body;
        const event = await Event.create({
            title,
            description,
            date,
            startTime,
            location,
            price:            Number(price),
            totalTickets:     Number(totalTickets),
            availableTickets: Number(totalTickets),
            image:     req.file ? req.file.path : null,  
            createdBy: req.user._id
        });

        await invalidateEventCache();

        res.status(201).json(event);
    } catch (error) {
        console.error('Create Event Error:', error);
        res.status(500).json({ message: 'Could not create event: ' + error.message });
    }
};

// Get all events
exports.getEvents = async (req, res) => {
    try {
        const events = await Event.find()
            .populate('createdBy', 'name email')
            .sort({ date: 1 })
            .lean();
        res.json(events);
    } catch (error) {
        res.status(500).json({ message: 'Could not fetch events: ' + error.message });
    }
};

// Get single event by ID
exports.getEventById = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id).lean();
        if (!event) {
            return res.status(404).json({ message: 'Event not found.' });
        }
        res.json(event);
    } catch (error) {
        console.error('Get Event Error:', error);
        res.status(500).json({ message: 'Server error fetching event.' });
    }
};

// Update event
exports.updateEvent = async (req, res) => {
    try {
        const { title, description, date, startTime, location, price, totalTickets } = req.body;
        const event = await Event.findById(req.params.id);

        if (!event) return res.status(404).json({ message: 'Event not found.' });
        if (req.file && event.image) {
            try {
                const urlParts = event.image.split('/');
                const filename = urlParts[urlParts.length - 1].split('.')[0];
                const publicId = `eventpass/${filename}`;
                await cloudinary.uploader.destroy(publicId);
                console.log(`🗑️ Old image deleted from Cloudinary: ${publicId}`);
            } catch (deleteErr) {
                console.error('Could not delete old image:', deleteErr.message);
            }
        }


        const imageUrl = req.file ? req.file.path : event.image;

        const updatedEvent = await Event.findByIdAndUpdate(
            req.params.id,
            {
                title,
                description,
                date,
                startTime,
                location,
                price:        Number(price),
                totalTickets: Number(totalTickets),
                image:        imageUrl,
            },
            { new: true, runValidators: true }
        );

        await invalidateEventCache();

        res.json(updatedEvent);
    } catch (error) {
        console.error('Update Error:', error);
        res.status(500).json({ message: 'Update failed: ' + error.message });
    }
};

// Delete event
exports.deleteEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found.' });
        if (event.image) {
            try {
                const urlParts = event.image.split('/');
                const filename = urlParts[urlParts.length - 1].split('.')[0];
                const publicId = `eventpass/${filename}`;
                await cloudinary.uploader.destroy(publicId);
                console.log(`🗑️ Image deleted from Cloudinary: ${publicId}`);
            } catch (deleteErr) {
                console.error('Could not delete image:', deleteErr.message);
            }
        }

        await Event.findByIdAndDelete(req.params.id);
        await Booking.deleteMany({ event: req.params.id });
        await invalidateEventCache();

        res.json({ message: 'Event deleted successfully.' });
    } catch (error) {
        console.error('Delete Error:', error);
        res.status(500).json({ message: 'Delete failed: ' + error.message });
    }
};

// Admin stats
exports.getEventTicketStats = async (req, res) => {
    try {
        const events = await Event.find().lean();
        const stats = await Promise.all(events.map(async (event) => {
            const bookings = await Booking.find({ event: event._id, status: 'Paid' }).lean();
            const soldTickets  = bookings.reduce((sum, b) => sum + b.ticketsBooked, 0);
            const totalRevenue = bookings.reduce((sum, b) => sum + b.totalAmount, 0);
            return {
                eventTitle:       event.title,
                totalTickets:     event.totalTickets,
                soldTickets,
                availableTickets: event.totalTickets - soldTickets,
                totalRevenue,
            };
        }));
        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: 'Could not fetch stats.' });
    }
};
