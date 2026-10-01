 const dns = require('dns');

dns.setServers(['1.1.1.1', '8.8.8.8']);

require('dotenv').config();
const mongoose = require('mongoose');
const { User, Library } = require('../models');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

const LIBRARY_NAME = 'Gyan Library';
const ADDRESS = 'Arya Samaj Chowk, Chhatauni, Motihari, Bihar - 845401';
const CONTACT_EMAIL = 'gyanlibrary50@gmail.com';
const CONTACT_PHONE = '8405909314';
const OWNER_NAME = 'R.P Singh';
const OWNER_EMAIL = 'gyanlibrary50@gmail.com'; // or a different login email if you prefer
const OWNER_PASSWORD = 'Gyan@125';

const registerLibrary = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const existing = await User.findOne({ email: OWNER_EMAIL });

if (existing) {
  console.log('Existing user found:');
  console.log('User ID:', existing._id.toString());
  console.log('Name:', existing.name);
  console.log('Role:', existing.role);
  console.log('Library ID:', existing.libraryId);

  const library = existing.libraryId
    ? await Library.findById(existing.libraryId)
    : null;

  if (library) {
    console.log('\nLibrary found:');
    console.log('Library ID:', library._id.toString());
    console.log('Library Name:', library.name);
    console.log('Address:', library.address);
  } else {
    console.log('\nThis user is not connected to a library.');
  }

  await mongoose.disconnect();
  return;
}

  const owner = await User.create({
    name: OWNER_NAME,
    email: OWNER_EMAIL,
    password: OWNER_PASSWORD,
    role: 'admin',
    isEmailVerified: true,
  });

  const library = await Library.create({
    name: LIBRARY_NAME,
    address: ADDRESS,
    contactEmail: CONTACT_EMAIL,
    contactPhone: CONTACT_PHONE,
    ownerId: owner._id,
    subscriptionPlan: 'free',
    settings: { seatMonthlyPrice: 0 },
  });

  owner.libraryId = library._id;
  await owner.save();

  console.log('\nLibrary registered successfully.');
  console.log('Library ID:', library._id.toString());
  console.log('Admin login:', OWNER_EMAIL, '/', OWNER_PASSWORD);

  await mongoose.disconnect();
};

registerLibrary().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});