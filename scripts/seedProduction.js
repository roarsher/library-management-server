const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Library = require('../models/Library');
const AddOn = require('../models/AddOn');

const seedProduction = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log('✅ MongoDB connected');

    const adminEmail = 'admin@library.com';
    const adminPassword = 'Admin@123456';

    // -----------------------------------------
    // 1. Check/Create Admin
    // -----------------------------------------

    let admin = await User.findOne({ email: adminEmail }).select('+password');

    if (!admin) {
      admin = await User.create({
        name: 'Library Admin',
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
        isEmailVerified: true,
        isActive: true,
      });

      console.log('✅ Admin created');
    } else {
      console.log('ℹ️ Admin already exists');
    }

    // -----------------------------------------
    // 2. Check/Create Library
    // -----------------------------------------

    let library = await Library.findOne({
      ownerId: admin._id,
    });

    if (!library) {
      library = await Library.create({
        name: 'My Library',
        address: 'Bhagalpur, Bihar',
        contactEmail: adminEmail,
        contactPhone: '9999999999',
        ownerId: admin._id,
        subscriptionPlan: 'free',
        themeColor: '#2563eb',
        isActive: true,

        settings: {
          graceMinutesForNoShow: 15,
          allowWaitingList: true,
          durationDiscounts: {
            1: 0,
            2: 0,
            3: 0,
          },
          seatMonthlyPrice: 1000,
        },
      });

      console.log('✅ Library created');
    } else {
      console.log('ℹ️ Library already exists');
    }

    // -----------------------------------------
    // 3. Connect Admin → Library
    // -----------------------------------------

    if (!admin.libraryId || admin.libraryId.toString() !== library._id.toString()) {
      admin.libraryId = library._id;
      await admin.save();

      console.log('✅ Admin linked to library');
    }

    // -----------------------------------------
    // 4. Create Add-ons
    // -----------------------------------------

    const existingAddOns = await AddOn.countDocuments({
      libraryId: library._id,
    });

    if (existingAddOns === 0) {
      await AddOn.insertMany([
        {
          libraryId: library._id,
          name: 'Night Shift',
          description: 'Access during night hours',
          pricePerMonth: 300,
          icon: 'moon',
          isActive: true,
        },
        {
          libraryId: library._id,
          name: 'Locker Facility',
          description: 'Personal locker facility',
          pricePerMonth: 200,
          icon: 'lock',
          isActive: true,
        },
        {
          libraryId: library._id,
          name: 'Extra Charging',
          description: 'Dedicated charging facility',
          pricePerMonth: 100,
          icon: 'zap',
          isActive: true,
        },
      ]);

      console.log('✅ Add-ons created');
    } else {
      console.log('ℹ️ Add-ons already exist');
    }

    // -----------------------------------------
    // Final output
    // -----------------------------------------

    console.log('\n================================');
    console.log('🎉 PRODUCTION SEED COMPLETE');
    console.log('================================');

    console.log('Admin Email:', adminEmail);
    console.log('Admin Password:', adminPassword);
    console.log('Admin ID:', admin._id.toString());
    console.log('Library ID:', library._id.toString());
    console.log('Library Name:', library.name);

    console.log('================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
};

seedProduction();