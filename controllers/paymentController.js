const Stripe = require('stripe');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const User = require('../models/User');
const emailQueue = require('../queues/emailQueue');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const createPaymentIntent = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { eventId, numTickets } = req.body;
        const userId = req.user._id;

        const event = await Event.findById(eventId).session(session);
        if (!event) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Event not found.' });
        }

        if (event.availableTickets < numTickets) {
            await session.abortTransaction();
            return res.status(400).json({
                message: `Only ${event.availableTickets} tickets remaining.`
            });
        }

        const totalAmount = event.price * numTickets;
        const amountInSmallestUnit = Math.round(totalAmount * 100);

        const paymentIntent = await stripe.paymentIntents.create({
            amount:   amountInSmallestUnit,
            currency: 'usd',
            metadata: {
                eventId:    eventId,
                userId:     userId.toString(),
                numTickets: numTickets.toString(),
            },
            automatic_payment_methods: { enabled: true },
        });

        const [booking] = await Booking.create([{
            event:                 eventId,
            user:                  userId,
            ticketsBooked:         numTickets,
            totalAmount,
            status:                'Pending',
            stripePaymentIntentId: paymentIntent.id,
        }], { session });

        await session.commitTransaction();

        res.status(201).json({
            clientSecret: paymentIntent.client_secret,
            bookingId:    booking._id,
            amount:       totalAmount,
            eventName:    event.title,
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('Create payment intent error:', error);
        res.status(500).json({ message: 'Failed to create payment.' });
    } finally {
        session.endSession();
    }
};


const handleWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).json({ message: `Webhook error: ${err.message}` });
    }

    if (event.type === 'payment_intent.succeeded') {
        await handlePaymentSuccess(event.data.object);
    }

    if (event.type === 'payment_intent.payment_failed') {
        await handlePaymentFailure(event.data.object);
    }

    res.status(200).json({ received: true });
};

const handlePaymentSuccess = async (paymentIntent) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const booking = await Booking.findOne({
            stripePaymentIntentId: paymentIntent.id
        }).session(session);

        if (!booking) {
            await session.abortTransaction();
            return;
        }

        if (booking.status === 'Paid') {
            await session.abortTransaction();
            return;
        }

        booking.status          = 'Paid';
        booking.stripePaymentId = paymentIntent.latest_charge;
        await booking.save({ session });

        await Event.findByIdAndUpdate(
            booking.event,
            { $inc: { availableTickets: -booking.ticketsBooked } },
            { session }
        );

        await session.commitTransaction();

        try {
            const [event, user] = await Promise.all([
                Event.findById(booking.event).lean(),
                User.findById(booking.user).lean(),
            ]);

            if (event && user?.email) {
                await emailQueue.add('booking_confirmation', {
                    type:       'booking_confirmation',
                    to:         user.email,
                    userName:   user.name,
                    eventTitle: event.title,
                    eventDate:  new Date(event.date).toLocaleDateString('en-GB', {
                        day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata'
                    }),
                    location:  event.location,
                    tickets:   booking.ticketsBooked,
                    amount:    booking.totalAmount,
                    bookingId: booking._id.toString(),
                });
                console.log(` Email job queued for booking ${booking._id}`);
            }
        } catch (emailErr) {
            console.error('Failed to queue email:', emailErr.message);
        }

        console.log(`Booking ${booking._id} marked as Paid`);

    } catch (error) {
        await session.abortTransaction();
        console.error('handlePaymentSuccess error:', error);
    } finally {
        session.endSession();
    }
};


const handlePaymentFailure = async (paymentIntent) => {
    try {
        await Booking.findOneAndUpdate(
            { stripePaymentIntentId: paymentIntent.id },
            { status: 'Failed' }
        );
        console.log(` Payment failed for intent: ${paymentIntent.id}`);
    } catch (error) {
        console.error('handlePaymentFailure error:', error);
    }
};

module.exports = { createPaymentIntent, handleWebhook };
