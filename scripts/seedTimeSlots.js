const dns = require('dns');

dns.setServers(['8.8.8.8', '1.1.1.1']);

 
const mongoose = require('mongoose');
require('dotenv').config();

const { TimeSlot, Library } = require('../models');
const { buildTimeSlotSeedData } = require('../utils/timeSlotSeedData');

const seedTimeSlots = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log('MongoDB connected');

    const libraries = await Library.find({});

    if (!libraries.length) {
      console.log('No libraries found. Create a library first.');
      process.exit(0);
    }

    for (const library of libraries) {
      // Remove existing slots for this library
      await TimeSlot.deleteMany({
        libraryId: library._id,
      });

      // Generate seed data
      const slots = buildTimeSlotSeedData(library._id);

      // Insert slots
      await TimeSlot.insertMany(slots);

      console.log(
        `Created ${slots.length} time slots for library: ${library._id}`
      );
    }

    console.log('Time slots seeded successfully ✅');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding time slots:', error);
    process.exit(1);
  }
};

seedTimeSlots();