const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  libraryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Library', required: true, unique: true },
  lastSerial: { type: Number, required: true },
});

module.exports = mongoose.model('Counter', counterSchema);