const User       = require('../models/User');
const Otp        = require('../models/Otp');
const jwt        = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const generateToken = (userId) =>
    jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '30d' });

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const otpEmailHtml = (name, otp) => `
<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#0a0a0a;color:#fff;border-radius:16px;overflow:hidden;">
  <div style="background:linear-gradient(135deg,#84cc16,#eab308);padding:32px;text-align:center;">
    <h1 style="margin:0;font-size:28px;font-weight:900;color:#000;letter-spacing:-1px;">EVENTPASS</h1>
  </div>
  <div style="padding:40px 32px;text-align:center;">
    <h2 style="color:#fff;font-size:20px;margin-bottom:8px;">Verify Your Email</h2>
    <p style="color:#9ca3af;font-size:14px;margin-bottom:32px;">Hi ${name}, enter this code to complete registration.</p>
    <div style="background:#1a1a1a;border:2px solid #84cc16;border-radius:16px;padding:24px;margin-bottom:24px;">
      <p style="color:#84cc16;font-size:48px;font-weight:900;letter-spacing:12px;margin:0;font-family:monospace;">${otp}</p>
    </div>
    <p style="color:#6b7280;font-size:12px;">Expires in <strong style="color:#fff;">10 minutes</strong>. If you didn't request this, ignore this email.</p>
  </div>
</div>`;

//  Send OTP 
const sendOtp = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'This email is already registered.' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

      
        await Otp.findOneAndUpdate(
            { email },
            { name, email, password, otp, attempts: 0, createdAt: new Date() },
            { upsert: true, new: true }
        );

        await transporter.sendMail({
            from:    `"EventPass" <${process.env.EMAIL_USER}>`,
            to:      email,
            subject: 'Your EventPass Verification Code',
            html:    otpEmailHtml(name, otp),
        });

        console.log(`📨 OTP sent to ${email}`);
        res.status(200).json({ message: 'OTP sent to your email.', email });

    } catch (error) {
        next(error);
    }
};

// Resend OTP 
const resendOtp = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) return res.status(400).json({ message: 'Email is required.' });

        const existing = await Otp.findOne({ email });
        if (!existing) {
            return res.status(400).json({ message: 'Session expired. Please register again.' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await Otp.findOneAndUpdate(
            { email },
            { otp, attempts: 0, createdAt: new Date() }
        );

        await transporter.sendMail({
            from:    `"EventPass" <${process.env.EMAIL_USER}>`,
            to:      email,
            subject: 'Your New EventPass Verification Code',
            html:    otpEmailHtml(existing.name, otp),
        });

        console.log(`📨 OTP resent to ${email}`);
        res.status(200).json({ message: 'New OTP sent to your email.' });

    } catch (error) {
        next(error);
    }
};

// Verify OTP & create account
const verifyOtp = async (req, res, next) => {
    try {
        const { email, otp } = req.body;

        const otpRecord = await Otp.findOne({ email });

        if (!otpRecord) {
            return res.status(400).json({ message: 'OTP expired. Please register again.' });
        }

        if (otpRecord.attempts >= 5) {
            await Otp.findOneAndDelete({ email });
            return res.status(400).json({ message: 'Too many wrong attempts. Please register again.' });
        }

        if (otpRecord.otp !== otp.trim()) {
            await Otp.findOneAndUpdate({ email }, { $inc: { attempts: 1 } });
            const remaining = 4 - otpRecord.attempts;
            return res.status(400).json({ message: `Incorrect OTP. ${remaining} attempts remaining.` });
        }


        const user = await User.create({
            name:     otpRecord.name,
            email:    otpRecord.email,
            password: otpRecord.password,
            role:     'user',
        });

        await Otp.findOneAndDelete({ email });

        console.log(`New user registered: ${email}`);

        res.status(201).json({
            message: 'Email verified! Registration successful.',
            _id:     user._id,
            name:    user.name,
            email:   user.email,
            role:    user.role,
            token:   generateToken(user._id),
        });

    } catch (error) {
        next(error);
    }
};

// Login 
const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            res.status(200).json({
                message: 'Login Successful!',
                _id:     user._id,
                name:    user.name,
                email:   user.email,
                role:    user.role,
                isAdmin: user.role === 'admin',
                token:   generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password.' });
        }
    } catch (error) {
        next(error);
    }
};

// Admin 
const getUsers = async (req, res, next) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        next(error);
    }
};

const deleteUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        next(error);
    }
};

module.exports = { sendOtp, resendOtp, verifyOtp, loginUser, getUsers, deleteUser };
