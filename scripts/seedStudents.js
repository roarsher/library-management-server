  const dns = require('dns');
 
 dns.setServers(['1.1.1.1', '8.8.8.8']);
 
 require('dotenv').config();
 
  
 // your other imports...
 const mongoose = require('mongoose');
const { User, Student, Library } = require('../models');

// ============================================================
// CHANGE #1 — confirm this matches your real .env variable name
// ============================================================
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

// ============================================================
// CHANGE #2 — your library ID
// ============================================================
const LIBRARY_ID = '6a9571ff82ff329f15173be4';

const defaultPassword = 'ChangeMe123!';

const studentsToSeed = [
  {
    name: 'Abhilasha Kumari',
    phone: '9102423349',
    dob: '1998-05-24',
    parentName: 'Bharat Prasad',
    parentPhone: '7294878647',
    address: 'Dewraha Babachowk',
  },
  {
    name: 'Shalu Yadav',
    phone: '8002045137',
    dob: '2003-01-06',
    parentName: 'Braj Kishor Baiju',
    parentPhone: '7646023321',
    address: 'Mathiya',
  },
  {
    name: 'Anju Gupta',
    phone: '9334745309',
    dob: '2005-05-20', // CONFIRM real birth year — sheet showed an impossible future date
    parentName: 'Birju Sah',
    parentPhone: '9334745309',
    address: 'Kaswa Pataura',
  },
];

const seed = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB Atlas');

  const library = await Library.findById(LIBRARY_ID);
  if (!library) throw new Error(`Library ${LIBRARY_ID} not found — check CHANGE #2`);

  for (const s of studentsToSeed) {
    console.log(`\nSeeding ${s.name}...`);

    const email = `${s.phone}@placeholder.gyanlibrary.com`;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log(`  Skipped — user already exists for ${s.name}`);
      continue;
    }

    const user = await User.create({
      name: s.name,
      email,
      password: defaultPassword,
      phone: s.phone,
      role: 'student',
      libraryId: LIBRARY_ID,
      isEmailVerified: true,
    });

    await Student.create({
      userId: user._id,
      libraryId: LIBRARY_ID,
      dob: new Date(s.dob),
      gender: 'female', // sheet section is "ONLY GIRLS"
      aadhaarNumber: '000000000000', // not in the sheet — update later via Student Sheet edit
      parentDetails: {
        fatherName: s.parentName,
        parentPhone: s.parentPhone,
      },
      address: s.address,
      admissionStatus: 'verified',
      verifiedBy: user._id,
      verifiedAt: new Date(),
    });

    console.log(`  Done — ${s.name} seeded (no seat assigned)`);
  }

  console.log('\nSeeding complete.');
  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});