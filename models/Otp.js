const mongoose = require('mongoose');
const otpSchema = new mongoose.Schema({
    name:      { type: String, required: true },
    email:     { type: String, required: true },
    password:  { type: String, required: true }, 
    otp:       { type: String, required: true },
    attempts:  { type: Number, default: 0 },     
    createdAt: { type: Date,   default: Date.now },
});

otpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 600 });
otpSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model('Otp', otpSchema);
