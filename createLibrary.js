// require('dotenv').config();

// const mongoose = require('mongoose');
// const Library = require('./models/Library');

// const ADMIN_ID = '6a79d38207e22cf63a8fd9da';

// const createLibrary = async () => {
//   try {
//     await mongoose.connect(process.env.MONGO_URI);

//     console.log('MongoDB connected');

//     const existingLibrary = await Library.findOne({
//       ownerId: ADMIN_ID,
//     });

//     if (existingLibrary) {
//       console.log('Library already exists');
//       console.log('Library ID:', existingLibrary._id.toString());
//       process.exit(0);
//     }

//     const library = await Library.create({
//       name: 'My Library',
//       address: 'Bhagalpur, Bihar, India',
//       contactEmail: 'admin@library.com',
//       contactPhone: '9876543210',
//       ownerId: ADMIN_ID,
//       subscriptionPlan: 'free',
//       themeColor: '#2563eb',
//       isActive: true,
//       settings: {
//         graceMinutesForNoShow: 15,
//         allowWaitingList: true,
//         seatMonthlyPrice: 0,
//       },
//     });

//     console.log('================================');
//     console.log('Library created successfully!');
//     console.log('================================');
//     console.log('Library ID:', library._id.toString());
//     console.log('Library Name:', library.name);
//     console.log('Owner ID:', library.ownerId.toString());
//     console.log('================================');

//     process.exit(0);
//   } catch (error) {
//     console.error('Error creating library:', error);
//     process.exit(1);
//   }
// };

// createLibrary();

require('dotenv').config();

const mongoose = require('mongoose');
const Library = require('./models/Library');
const User = require('./models/User');

const createLibrary = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log('MongoDB connected');

    // Find admin in the CURRENT database
    const admin = await User.findOne({
      email: 'admin@library.com',
      role: 'admin',
    });

    if (!admin) {
      console.log('❌ Admin not found!');
      console.log('First run: npm run create:admin');
      process.exit(1);
    }

    console.log('Admin found:', admin._id.toString());

    const existingLibrary = await Library.findOne({
      ownerId: admin._id,
    });

    if (existingLibrary) {
      console.log('Library already exists');
      console.log('Library ID:', existingLibrary._id.toString());

      // Make sure admin is linked
      if (
        !admin.libraryId ||
        admin.libraryId.toString() !== existingLibrary._id.toString()
      ) {
        admin.libraryId = existingLibrary._id;
        await admin.save();

        console.log('✅ Admin linked to library');
      }

      process.exit(0);
    }

    const library = await Library.create({
      name: 'My Library',
      address: 'Bhagalpur, Bihar, India',
      contactEmail: 'admin@library.com',
      contactPhone: '9876543210',
      ownerId: admin._id,
      subscriptionPlan: 'free',
      themeColor: '#2563eb',
      isActive: true,

      settings: {
        graceMinutesForNoShow: 15,
        allowWaitingList: true,
        seatMonthlyPrice: 0,
      },
    });

    // Link library to admin
    admin.libraryId = library._id;
    await admin.save();

    console.log('================================');
    console.log('Library created successfully!');
    console.log('================================');
    console.log('Library ID:', library._id.toString());
    console.log('Library Name:', library.name);
    console.log('Owner ID:', library.ownerId.toString());
    console.log('Admin ID:', admin._id.toString());
    console.log('================================');

    process.exit(0);
  } catch (error) {
    console.error('Error creating library:', error);
    process.exit(1);
  }
};

createLibrary();