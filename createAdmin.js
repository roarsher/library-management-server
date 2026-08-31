const dns = require('dns');

dns.setServers(['8.8.8.8', '1.1.1.1']);

 

require('dotenv').config();

const mongoose = require('mongoose');
const User = require('./models/User');

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log('MongoDB connected');

    const existingUser = await User.findOne({
      email: 'admin@library.com',
    }).select('+password');

    if (existingUser) {
      console.log('Admin already exists');
      console.log('ID:', existingUser._id.toString());
      process.exit(0);
    }

    const admin = await User.create({
      name: 'Library Admin',
      email: 'admin@library.com',
      password: 'Admin@123456',
      role: 'admin',
      phone: '9876543210',
      isEmailVerified: true,
      isActive: true,
    });

    console.log('================================');
    console.log('Admin created successfully!');
    console.log('================================');
    console.log('ID:', admin._id.toString());
    console.log('Email:', admin.email);
    console.log('Password: Admin@123456');
    console.log('================================');

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
};

createAdmin();