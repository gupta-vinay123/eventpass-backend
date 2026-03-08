const { Worker } = require('bullmq');
const nodemailer = require('nodemailer');
const { queueClient } = require('../config/redis');

// Nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,    
        pass: process.env.EMAIL_PASS,    
    },
});

// Email templates 
const getBookingConfirmationHTML = (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; background: #0a0a0a; color: #ffffff; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #111; border: 1px solid #222; border-radius: 24px; overflow: hidden; }
    .header { background: #84cc16; padding: 32px; text-align: center; }
    .header h1 { color: #000; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -1px; }
    .body { padding: 40px; }
    .greeting { font-size: 20px; font-weight: bold; margin-bottom: 8px; }
    .subtitle { color: #9ca3af; margin-bottom: 32px; }
    .ticket-box { background: #1a1a1a; border: 1px solid #333; border-radius: 16px; padding: 24px; margin-bottom: 24px; }
    .ticket-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #222; }
    .ticket-row:last-child { border-bottom: none; }
    .label { color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
    .value { font-weight: bold; color: #fff; }
    .amount { color: #84cc16; font-size: 24px; font-weight: 900; }
    .footer { padding: 24px 40px; border-top: 1px solid #222; color: #4b5563; font-size: 12px; text-align: center; }
    .booking-id { background: #0a0a0a; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 11px; color: #6b7280; margin-top: 16px; word-break: break-all; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚡ EVENTPASS</h1>
    </div>
    <div class="body">
      <p class="greeting">Hey ${data.userName}! 🎉</p>
      <p class="subtitle">Your booking is confirmed. See you at the event!</p>

      <div class="ticket-box">
        <div class="ticket-row">
          <span class="label">Event</span>
          <span class="value">${data.eventTitle}</span>
        </div>
        <div class="ticket-row">
          <span class="label">Date</span>
          <span class="value">${data.eventDate}</span>
        </div>
        <div class="ticket-row">
          <span class="label">Location</span>
          <span class="value">${data.location}</span>
        </div>
        <div class="ticket-row">
          <span class="label">Tickets</span>
          <span class="value">${data.tickets}</span>
        </div>
        <div class="ticket-row">
          <span class="label">Total Paid</span>
          <span class="value amount">₹${data.amount}</span>
        </div>
      </div>

      <p style="color: #9ca3af; font-size: 14px;">
        Show your ticket PDF from the dashboard at the venue entrance.
        Your QR code will be scanned for entry.
      </p>

      <div class="booking-id">Booking ID: ${data.bookingId}</div>
    </div>
    <div class="footer">
      © 2026 EventPass · You received this because you made a booking
    </div>
  </div>
</body>
</html>
`;

// Worker 
const emailWorker = new Worker(
    'email-queue',
    async (job) => {
        const { type, to, ...data } = job.data;

        console.log(`📧 Processing email job: ${type} → ${to}`);

        if (type === 'booking_confirmation') {
            await transporter.sendMail({
                from:    `"EventPass" <${process.env.EMAIL_USER}>`,
                to,
                subject: `✅ Booking Confirmed — ${data.eventTitle}`,
                html:    getBookingConfirmationHTML(data),
            });
        }

        console.log(`✅ Email sent: ${type} → ${to}`);
    },
    {
        connection: queueClient,
        concurrency: 5, 
    }
);

emailWorker.on('completed', (job) => {
    console.log(` Email job ${job.id} completed`);
});

emailWorker.on('failed', (job, err) => {
    console.error(`Email job ${job.id} failed (attempt ${job.attemptsMade}):`, err.message);
});

module.exports = emailWorker;
