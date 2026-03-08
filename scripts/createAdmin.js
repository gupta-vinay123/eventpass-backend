const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config();

const ADMIN = {
    name: 'Admin',
    email: process.env.ADMIN_EMAIL || 'admin@eventpass.com',
    password: process.env.ADMIN_PASSWORD || 'ChangeMe123!',
    role: 'admin',
};

async function createAdmin() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const existing = await User.findOne({ email: ADMIN.email });
        if (existing) {
            console.log(`⚠️  Admin already exists: ${ADMIN.email}`);
            process.exit(0);
        }

        await User.create(ADMIN);
        console.log(`✅ Admin created: ${ADMIN.email}`);
        console.log('⚠️  Remember to change the default password!');
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

createAdmin();
