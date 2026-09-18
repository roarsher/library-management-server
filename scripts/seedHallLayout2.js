const dns = require('dns');

dns.setServers(['1.1.1.1', '8.8.8.8']);

const dnsPromises = dns.promises;
dnsPromises.setServers(['1.1.1.1', '8.8.8.8']);
 
 require('dotenv').config();
const mongoose = require('mongoose');
const { Seat, Hall } = require('../models');

// ============================================================
// CHANGE THESE before running
// ============================================================
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const LIBRARY_ID = '6a9571ff82ff329f15173be4';
const HALL_NAME = 'Second Hall'; // set the real name you want for this hall
const HALL_NUMBER = 7;

// Row A: B114-B110, gap (main gate), B109-B105
const ROW_A = [
  { seatNumber: 'B114', column: 1 }, { seatNumber: 'B113', column: 2 }, { seatNumber: 'B112', column: 3 },
  { seatNumber: 'B111', column: 4 }, { seatNumber: 'B110', column: 5 },
  // column 6 skipped — main gate
  { seatNumber: 'B109', column: 7 }, { seatNumber: 'B108', column: 8 }, { seatNumber: 'B107', column: 9 },
  { seatNumber: 'B106', column: 10 }, { seatNumber: 'B105', column: 11 },
];

// Row B: B89-B96, gap, B97-B104
const ROW_B = [
  { seatNumber: 'B89', column: 1 }, { seatNumber: 'B90', column: 2 }, { seatNumber: 'B91', column: 3 },
  { seatNumber: 'B92', column: 4 }, { seatNumber: 'B93', column: 5 }, { seatNumber: 'B94', column: 6 },
  { seatNumber: 'B95', column: 7 }, { seatNumber: 'B96', column: 8 },
  // gap
  { seatNumber: 'B97', column: 10 }, { seatNumber: 'B98', column: 11 }, { seatNumber: 'B99', column: 12 },
  { seatNumber: 'B100', column: 13 }, { seatNumber: 'B101', column: 14 }, { seatNumber: 'B102', column: 15 },
  { seatNumber: 'B103', column: 16 }, { seatNumber: 'B104', column: 17 },
];

// Row C: B88-B81, gap, G80-G73
const ROW_C = [
  { seatNumber: 'B88', column: 1 }, { seatNumber: 'B87', column: 2 }, { seatNumber: 'B86', column: 3 },
  { seatNumber: 'B85', column: 4 }, { seatNumber: 'B84', column: 5 }, { seatNumber: 'B83', column: 6 },
  { seatNumber: 'B82', column: 7 }, { seatNumber: 'B81', column: 8 },
  // gap
  { seatNumber: 'G80', column: 10 }, { seatNumber: 'G79', column: 11 }, { seatNumber: 'G78', column: 12 },
  { seatNumber: 'G77', column: 13 }, { seatNumber: 'G76', column: 14 }, { seatNumber: 'G75', column: 15 },
  { seatNumber: 'G74', column: 16 }, { seatNumber: 'G73', column: 17 },
];

// Row D: B55-B63, NO gap, G64-G72
const ROW_D = [
  { seatNumber: 'B55', column: 1 }, { seatNumber: 'B56', column: 2 }, { seatNumber: 'B57', column: 3 },
  { seatNumber: 'B58', column: 4 }, { seatNumber: 'B59', column: 5 }, { seatNumber: 'B60', column: 6 },
  { seatNumber: 'B61', column: 7 }, { seatNumber: 'B62', column: 8 }, { seatNumber: 'B63', column: 9 },
  { seatNumber: 'G64', column: 10 }, { seatNumber: 'G65', column: 11 }, { seatNumber: 'G66', column: 12 },
  { seatNumber: 'G67', column: 13 }, { seatNumber: 'G68', column: 14 }, { seatNumber: 'G69', column: 15 },
  { seatNumber: 'G70', column: 16 }, { seatNumber: 'G71', column: 17 }, { seatNumber: 'G72', column: 18 },
];

const seed = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

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