const { SeatBooking, TimeSlot } = require('../models');

// Converts "HH:MM" to minutes since midnight
const toMinutes = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

// Returns [start, end] in minutes, unwrapped past midnight if the segment
// crosses it (end < start means it runs into the next day).
const segmentToRange = (segment) => {
  const start = toMinutes(segment.startTime);
  let end = toMinutes(segment.endTime);
  if (end <= start) end += 24 * 60; // crosses midnight
  return [start, end];
};

const rangesOverlap = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;

// True if ANY segment of slotA overlaps ANY segment of slotB in clock time.
// Checks the wrapped range plus a -24h shifted copy, so an overnight segment
// (e.g. 21:45-06:00) correctly overlaps a morning segment (e.g. 06:00-11:00)
// that would otherwise look like it starts "before" the overnight segment ends.
const doTimeSlotsOverlap = (slotA, slotB) => {
  for (const segA of slotA.segments) {
    const [aStart, aEnd] = segmentToRange(segA);
    for (const segB of slotB.segments) {
      const [bStart, bEnd] = segmentToRange(segB);
      if (
        rangesOverlap(aStart, aEnd, bStart, bEnd) ||
        rangesOverlap(aStart - 1440, aEnd - 1440, bStart, bEnd) ||
        rangesOverlap(aStart, aEnd, bStart - 1440, bEnd - 1440)
      ) {
        return true;
      }
    }
  }
  return false;
};

const dateRangesOverlap = (aStart, aEnd, bStart, bEnd) => aStart <= bEnd && bStart <= aEnd;

const ACTIVE_STATUSES = ['pending_approval', 'active', 'on_leave'];

// The main entry point — is `seatId` free for `timeSlotId` between
// `startDate` and `endDate`? Optionally exclude one booking (used when
// editing an existing booking, so it doesn't conflict with itself).
const isSeatAvailable = async ({ seatId, timeSlotId, startDate, endDate, libraryId, excludeBookingId }) => {
  const requestedSlot = await TimeSlot.findOne({ _id: timeSlotId, libraryId });
  if (!requestedSlot) return { available: false, reason: 'Time slot not found' };

  const start = new Date(startDate);
  const end = new Date(endDate);

  const query = {
    seatId,
    libraryId,
    status: { $in: ACTIVE_STATUSES },
  };
  if (excludeBookingId) query._id = { $ne: excludeBookingId };

  const existingBookings = await SeatBooking.find(query).populate('timeSlotId');

  for (const booking of existingBookings) {
    if (!booking.timeSlotId) continue; // orphaned reference, skip
    const datesOverlap = dateRangesOverlap(start, end, booking.startDate, booking.endDate);
    if (!datesOverlap) continue;

    const timesOverlap = doTimeSlotsOverlap(requestedSlot, booking.timeSlotId);
    if (timesOverlap) {
      return { available: false, reason: 'Seat is already booked for an overlapping shift and date range' };
    }
  }

  return { available: true };
};

module.exports = { isSeatAvailable, doTimeSlotsOverlap };