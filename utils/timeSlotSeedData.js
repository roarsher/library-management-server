// 1-month base prices from the Gyan Library fee poster. 2/3-month totals are
// now computed live via calculateBookingPrice() using the library's discount
// settings, not stored here.
const buildTimeSlotSeedData = (libraryId) => [
  { libraryId, label: 'Morning (6AM-11AM)', segments: [{ startTime: '06:00', endTime: '11:00' }], monthlyPrice: 499 },
  { libraryId, label: 'Morning (6AM-2PM)', segments: [{ startTime: '06:00', endTime: '14:00' }], monthlyPrice: 1049 },
  { libraryId, label: 'Morning (6AM-5PM)', segments: [{ startTime: '06:00', endTime: '17:00' }], monthlyPrice: 1249 },
  { libraryId, label: 'Day (8AM-5PM)', segments: [{ startTime: '08:00', endTime: '17:00' }], monthlyPrice: 1199 },
  { libraryId, label: 'Day (11AM-5PM)', segments: [{ startTime: '11:00', endTime: '17:00' }], monthlyPrice: 999 },
  { libraryId, label: 'Day (11AM-9:45PM)', segments: [{ startTime: '11:00', endTime: '21:45' }], monthlyPrice: 1249 },
  { libraryId, label: 'Afternoon (2PM-9:45PM)', segments: [{ startTime: '14:00', endTime: '21:45' }], monthlyPrice: 1099 },
  { libraryId, label: 'Evening (5PM-9:45PM)', segments: [{ startTime: '17:00', endTime: '21:45' }], monthlyPrice: 549 },
  { libraryId, label: 'Night Shift', segments: [{ startTime: '21:45', endTime: '06:00' }], isOvernight: true, monthlyPrice: 699 },
  { libraryId, label: 'Full Day (6AM-9:45PM)', segments: [{ startTime: '06:00', endTime: '21:45' }], monthlyPrice: 1499 },
  { libraryId, label: 'Split (6-11AM + 5-9:45PM)', segments: [{ startTime: '06:00', endTime: '11:00' }, { startTime: '17:00', endTime: '21:45' }], monthlyPrice: 899 },
];

module.exports = { buildTimeSlotSeedData };