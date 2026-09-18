 require('dotenv').config();
const mongoose = require('mongoose');
const { Seat, Hall } = require('../models');

// ============================================================
// CHANGE THESE before running
// ============================================================
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const LIBRARY_ID = '6a9571ff82ff329f15173be4';
const HALL_NAME = 'Office Hall'; // whatever name this hall should have
const HALL_NUMBER = 6; // must be unique — check your Hall model for its exact field/rules

// Row definitions — same format as before, column skips = gaps
const ROW_A = [
  { seatNumber: 'B1', column: 1 }, { seatNumber: 'B2', column: 2 }, { seatNumber: 'B3', column: 3 },
  { seatNumber: 'B4', column: 4 }, { seatNumber: 'B5', column: 5 },
  { seatNumber: 'G6', column: 7 }, { seatNumber: 'G7', column: 8 }, { seatNumber: 'G8', column: 9 },
  { seatNumber: 'G9', column: 10 }, { seatNumber: 'G10', column: 11 }, { seatNumber: 'G11', column: 12 },
  { seatNumber: 'G12', column: 13 }, { seatNumber: 'G13', column: 14 },
];

const ROW_B = [
  { seatNumber: 'B26', column: 1 }, { seatNumber: 'B25', column: 2 }, { seatNumber: 'B24', column: 3 },
  { seatNumber: 'B23', column: 4 }, { seatNumber: 'B22', column: 5 },
  { seatNumber: 'G21', column: 7 }, { seatNumber: 'G20', column: 8 }, { seatNumber: 'G19', column: 9 },
  { seatNumber: 'G18', column: 10 }, { seatNumber: 'G17', column: 11 }, { seatNumber: 'G16', column: 12 },
  { seatNumber: 'G15', column: 13 }, { seatNumber: 'G14', column: 14 },
];

const ROW_C = [
  { seatNumber: 'G27', column: 1 }, { seatNumber: 'G28', column: 2 }, { seatNumber: 'G29', column: 3 },
  { seatNumber: 'G30', column: 4 }, { seatNumber: 'G31', column: 5 },
  { seatNumber: 'B32', column: 7 }, { seatNumber: 'B33', column: 8 }, { seatNumber: 'B34', column: 9 },
  { seatNumber: 'B35', column: 10 }, { seatNumber: 'B36', column: 11 }, { seatNumber: 'B37', column: 12 },
  { seatNumber: 'B38', column: 13 }, { seatNumber: 'B39', column: 14 },
];

const ROW_D = [
  { seatNumber: 'G54', column: 1 }, { seatNumber: 'G53', column: 2 }, { seatNumber: 'G52', column: 3 },
  { seatNumber: 'G51', column: 4 }, { seatNumber: 'G50', column: 5 }, { seatNumber: 'G49', column: 6 },
  { seatNumber: 'B48', column: 7 }, { seatNumber: 'B47', column: 8 }, { seatNumber: 'B46', column: 9 },
  { seatNumber: 'B45', column: 10 }, { seatNumber: 'B44', column: 11 }, { seatNumber: 'B43', column: 12 },
  { seatNumber: 'B42', column: 13 }, { seatNumber: 'B41', column: 14 }, { seatNumber: 'B40', column: 15 },
];

const seed = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // Find the hall by name, or create it if it doesn't exist yet —
  // so this script works whether you already made the hall via the
  // admin page, or want the script to create it for you.
  let hall = await Hall.findOne({ libraryId: LIBRARY_ID, name: HALL_NAME });
  if (!hall) {
    hall = await Hall.create({
      libraryId: LIBRARY_ID,
      name: HALL_NAME,
      hallNumber: HALL_NUMBER,
      totalSeats: 0,
    });
    console.log(`Created hall "${HALL_NAME}" (id: ${hall._id})`);
  } else {
    console.log(`Using existing hall "${HALL_NAME}" (id: ${hall._id})`);
  }

  const rows = [
    { label: 'A', seats: ROW_A },
    { label: 'B', seats: ROW_B },
    { label: 'C', seats: ROW_C },
    { label: 'D', seats: ROW_D },
  ];

  let created = 0;
  for (const { label, seats } of rows) {
    for (const s of seats) {
      const exists = await Seat.findOne({ hallId: hall._id, seatNumber: s.seatNumber });
      if (exists) {
        console.log(`  Skipped ${s.seatNumber} — already exists`);
        continue;
      }
      await Seat.create({
        libraryId: LIBRARY_ID,
        hallId: hall._id,
        seatNumber: s.seatNumber,
        row: label,
        column: s.column,
      });
      created++;
    }
  }

  hall.totalSeats += created;
  await hall.save();

  console.log(`\nDone — ${created} seats created for hall "${hall.name}".`);
  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});