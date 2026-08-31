require('dotenv').config();

const mongoose = require('mongoose');
const User = require('./models/User');

const ADMIN_ID = '6a79d38207e22cf63a8fd9da';
const LIBRARY_ID = '6a79d3cb15051186bbe5b85d';

const updateAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log('MongoDB connected');

    const user = await User.findByIdAndUpdate(
      ADMIN_ID,
      {
        libraryId: LIBRARY_ID,
      },
      { new: true }
    );

    if (!user) {
      console.log('Admin user not found');
      process.exit(1);
    }

    console.log('================================');
    console.log('Admin updated successfully!');
    console.log('================================');
    console.log('User:', user.email);
    console.log('Role:', user.role);
    console.log('Library ID:', user.libraryId.toString());
    console.log('================================');

    process.exit(0);
  } catch (error) {
    console.error('Error updating admin:', error);
    process.exit(1);
  }
};

updateAdmin();