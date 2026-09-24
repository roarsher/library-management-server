const { Counter } = require('../models');

// Offline records already go up to ~2019, so new registrations start at 2020.
const STARTING_SERIAL = 2020;

const generateRegistrationNumber = async (libraryId) => {
  let counter = await Counter.findOne({ libraryId });
  if (!counter) {
    counter = await Counter.create({ libraryId, lastSerial: STARTING_SERIAL - 1 });
  }
  counter.lastSerial += 1;
  await counter.save();
  return `GL-06D-21-${counter.lastSerial}`;
};

module.exports = generateRegistrationNumber;