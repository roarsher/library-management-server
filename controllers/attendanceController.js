//  const jwt = require('jsonwebtoken');
// const asyncHandler = require('../utils/asyncHandler');
// const { Attendance, SeatBooking, Student } = require('../models');

// const GATE_TOKEN_SECRET = process.env.GATE_TOKEN_SECRET || process.env.JWT_SECRET;
// const GATE_TOKEN_TTL_SECONDS = 25;
// const AUTO_CHECKOUT_HOUR = 22; // 10:00 PM, server local time

// // ---------- Streak helper (unchanged) ----------
// const updateStreak = async (student) => {
//   const today = new Date();
//   today.setHours(0, 0, 0, 0);

//   const last = student.lastCheckInDate ? new Date(student.lastCheckInDate) : null;
//   if (last) last.setHours(0, 0, 0, 0);

//   if (last && last.getTime() === today.getTime()) return;

//   const yesterday = new Date(today);
//   yesterday.setDate(yesterday.getDate() - 1);

//   student.currentStreak = last && last.getTime() === yesterday.getTime() ? student.currentStreak + 1 : 1;
//   if (student.currentStreak > student.longestStreak) student.longestStreak = student.currentStreak;
//   student.lastCheckInDate = today;
//   await student.save();
// };

// // ---------- Gate token generation — now purpose-specific ----------
// // @desc    Generate a short-lived token for either the check-in or check-out QR
// // @route   GET /api/attendance/gate-token?purpose=checkin|checkout
// // @access  Private (admin)
// const generateGateToken = asyncHandler(async (req, res) => {
//   const purpose = req.query.purpose === 'checkout' ? 'gate-checkout' : 'gate-checkin';

//   const token = jwt.sign(
//     { libraryId: req.libraryId, purpose },
//     GATE_TOKEN_SECRET,
//     { expiresIn: `${GATE_TOKEN_TTL_SECONDS}s` }
//   );
//   res.status(200).json({ token, purpose, expiresIn: GATE_TOKEN_TTL_SECONDS });
// });

// // @desc    Student scans either QR — behavior depends on which QR (encoded in the token)
// // @route   POST /api/attendance/scan
// // @access  Private (student)
// const scanAttendance = asyncHandler(async (req, res) => {
//   const { token, latitude, longitude } = req.body;
//   if (!token) return res.status(400).json({ message: 'QR token is required' });

//   let decoded;
//   try {
//     decoded = jwt.verify(token, GATE_TOKEN_SECRET);
//   } catch {
//     return res.status(400).json({ message: 'QR code expired — please rescan' });
//   }
//   if (!['gate-checkin', 'gate-checkout'].includes(decoded.purpose) || String(decoded.libraryId) !== String(req.libraryId)) {
//     return res.status(400).json({ message: 'QR code is not valid for this library' });
//   }

//   const student = await Student.findOne({ userId: req.user._id });
//   if (!student) return res.status(404).json({ message: 'Student profile not found' });

//   const location = latitude != null && longitude != null ? { lat: latitude, lng: longitude } : undefined;

//   if (decoded.purpose === 'gate-checkin') {
//     const openAttendance = await Attendance.findOne({ studentId: student._id, checkOutAt: null });
//     if (openAttendance) {
//       return res.status(400).json({ message: 'You are already checked in — scan the Check-Out QR when leaving' });
//     }

//     const booking = await SeatBooking.findOne({
//       studentId: student._id,
//       libraryId: req.libraryId,
//       status: 'active',
//     });
//     if (!booking) {
//       return res.status(400).json({ message: 'No active booking to check in against' });
//     }

//     const attendance = await Attendance.create({
//       libraryId: req.libraryId,
//       studentId: student._id,
//       bookingId: booking._id,
//       checkInAt: new Date(),
//       checkInLocation: location,
//       source: 'qr',
//     });

//     await updateStreak(student);
//     return res.status(201).json({ action: 'check-in', attendance, streak: student.currentStreak });
//   }

//   // purpose === 'gate-checkout'
//   const openAttendance = await Attendance.findOne({ studentId: student._id, checkOutAt: null }).sort({ checkInAt: -1 });
//   if (!openAttendance) {
//     return res.status(400).json({ message: 'You are not currently checked in' });
//   }

//   openAttendance.checkOutAt = new Date();
//   openAttendance.durationMinutes = Math.round((openAttendance.checkOutAt - openAttendance.checkInAt) / 60000);
//   if (location) openAttendance.checkOutLocation = location;
//   await openAttendance.save();

//   return res.status(200).json({ action: 'check-out', attendance: openAttendance });
// });

// // ---------- Manual check-in/out (used by StudyTimer, unchanged) ----------
// const checkIn = asyncHandler(async (req, res) => {
//   const student = await Student.findOne({ userId: req.user._id });

//   const booking = await SeatBooking.findOne({
//     studentId: student._id,
//     libraryId: req.libraryId,
//     status: 'active',
//   });
//   if (!booking) {
//     return res.status(400).json({ message: 'No active booking to check in against' });
//   }

//   const openAttendance = await Attendance.findOne({ studentId: student._id, checkOutAt: null });
//   if (openAttendance) {
//     return res.status(400).json({ message: 'Already checked in — check out first' });
//   }

//   const attendance = await Attendance.create({
//     libraryId: req.libraryId,
//     studentId: student._id,
//     bookingId: booking._id,
//     checkInAt: new Date(),
//     source: 'manual',
//   });

//   await updateStreak(student);
//   res.status(201).json({ attendance });
// });

// const checkOut = asyncHandler(async (req, res) => {
//   const student = await Student.findOne({ userId: req.user._id });

//   const attendance = await Attendance.findOne({ studentId: student._id, checkOutAt: null }).sort({ checkInAt: -1 });
//   if (!attendance) {
//     return res.status(400).json({ message: 'No open check-in found' });
//   }

//   attendance.checkOutAt = new Date();
//   attendance.durationMinutes = Math.round((attendance.checkOutAt - attendance.checkInAt) / 60000);
//   await attendance.save();

//   res.status(200).json({ attendance });
// });

// // ---------- Admin: today's attendance OR a specific past date ----------
// // @desc    Attendance for a given date (defaults to today) — live during the
// //          day, becomes historical once that day has passed.
// // @route   GET /api/attendance/today?date=YYYY-MM-DD
// // @access  Private (admin)
// const getTodayAttendance = asyncHandler(async (req, res) => {
//   const targetDate = req.query.date ? new Date(req.query.date) : new Date();
//   const startOfDay = new Date(targetDate);
//   startOfDay.setHours(0, 0, 0, 0);
//   const endOfDay = new Date(targetDate);
//   endOfDay.setHours(23, 59, 59, 999);

//   const records = await Attendance.find({
//     libraryId: req.libraryId,
//     checkInAt: { $gte: startOfDay, $lte: endOfDay },
//   })
//     .populate({ path: 'studentId', select: 'currentStreak', populate: { path: 'userId', select: 'name' } })
//     .sort({ checkInAt: -1 });

//   res.status(200).json({ count: records.length, records, date: startOfDay.toISOString().slice(0, 10) });
// });

// const getMyAttendance = asyncHandler(async (req, res) => {
//   const student = await Student.findOne({ userId: req.user._id });
//   const records = await Attendance.find({ studentId: student._id }).sort({ checkInAt: -1 });
//   res.status(200).json({ records });
// });

// // ---------- 10 PM auto-checkout sweep, called by cron ----------
// // @desc    Force-checkout anyone still checked in after closing time, with
// //          duration calculated up to 10:00 PM (not actual scan-out time,
// //          since there wasn't one).
// const autoCheckoutStragglers = async () => {
//   const now = new Date();
//   const cutoff = new Date(now);
//   cutoff.setHours(AUTO_CHECKOUT_HOUR, 0, 0, 0);

//   const startOfToday = new Date(now);
//   startOfToday.setHours(0, 0, 0, 0);

//   const openRecords = await Attendance.find({
//     checkOutAt: null,
//     checkInAt: { $gte: startOfToday },
//   });

//   for (const record of openRecords) {
//     record.checkOutAt = cutoff;
//     record.durationMinutes = Math.round((cutoff - record.checkInAt) / 60000);
//     await record.save();
//   }

//   console.log(`Auto-checkout: closed ${openRecords.length} open attendance record(s) at 10 PM`);
//   return openRecords.length;
// };

// module.exports = {
//   checkIn,
//   checkOut,
//   getTodayAttendance,
//   getMyAttendance,
//   generateGateToken,
//   scanAttendance,
//   autoCheckoutStragglers,
// };




const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const { Attendance, SeatBooking, Student } = require('../models');

const GATE_TOKEN_SECRET = process.env.GATE_TOKEN_SECRET || process.env.JWT_SECRET;
const AUTO_CHECKOUT_HOUR = 22; // 10:00 PM, server local time

// ---------- Streak helper (unchanged) ----------
const updateStreak = async (student) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const last = student.lastCheckInDate ? new Date(student.lastCheckInDate) : null;
  if (last) last.setHours(0, 0, 0, 0);

  if (last && last.getTime() === today.getTime()) return;

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  student.currentStreak =
    last && last.getTime() === yesterday.getTime()
      ? student.currentStreak + 1
      : 1;

  if (student.currentStreak > student.longestStreak) {
    student.longestStreak = student.currentStreak;
  }

  student.lastCheckInDate = today;
  await student.save();
};

// ---------- Static gate token generation — no expiry, safe to print ----------
// @desc    Generate a permanent token for the check-in or check-out QR poster
// @route   GET /api/attendance/gate-token?purpose=checkin|checkout
// @access  Private (admin)
const generateGateToken = asyncHandler(async (req, res) => {
  const purpose =
    req.query.purpose === 'checkout'
      ? 'gate-checkout'
      : 'gate-checkin';

  // No expiresIn — this token is permanent by design.
  // It can be generated once, converted to a QR code,
  // printed and permanently posted at the gate.
  const token = jwt.sign(
    {
      libraryId: req.libraryId,
      purpose,
    },
    GATE_TOKEN_SECRET
  );

  res.status(200).json({
    token,
    purpose,
  });
});

// @desc    Student scans either QR — behavior depends on which QR is scanned
// @route   POST /api/attendance/scan
// @access  Private (student)
const scanAttendance = asyncHandler(async (req, res) => {
  const { token, latitude, longitude } = req.body;

  if (!token) {
    return res.status(400).json({
      message: 'QR token is required',
    });
  }

  let decoded;

  try {
    // Since the gate token has no expiration,
    // jwt.verify() only validates the signature and payload.
    decoded = jwt.verify(token, GATE_TOKEN_SECRET);
  } catch {
    return res.status(400).json({
      message: 'Invalid QR code',
    });
  }

  // Validate purpose and library
  if (
    !['gate-checkin', 'gate-checkout'].includes(decoded.purpose) ||
    String(decoded.libraryId) !== String(req.libraryId)
  ) {
    return res.status(400).json({
      message: 'QR code is not valid for this library',
    });
  }

  const student = await Student.findOne({
    userId: req.user._id,
  });

  if (!student) {
    return res.status(404).json({
      message: 'Student profile not found',
    });
  }

  const location =
    latitude != null && longitude != null
      ? {
          lat: latitude,
          lng: longitude,
        }
      : undefined;

  // ============================================================
  // CHECK-IN
  // ============================================================
  if (decoded.purpose === 'gate-checkin') {
    const openAttendance = await Attendance.findOne({
      studentId: student._id,
      checkOutAt: null,
    });

    if (openAttendance) {
      return res.status(400).json({
        message:
          'You are already checked in — scan the Check-Out QR when leaving',
      });
    }

    const booking = await SeatBooking.findOne({
      studentId: student._id,
      libraryId: req.libraryId,
      status: 'active',
    });

    if (!booking) {
      return res.status(400).json({
        message: 'No active booking to check in against',
      });
    }

    const attendance = await Attendance.create({
      libraryId: req.libraryId,
      studentId: student._id,
      bookingId: booking._id,
      checkInAt: new Date(),
      checkInLocation: location,
      source: 'qr',
    });

    await updateStreak(student);

    return res.status(201).json({
      action: 'check-in',
      attendance,
      streak: student.currentStreak,
    });
  }

  // ============================================================
  // CHECK-OUT
  // ============================================================

  const openAttendance = await Attendance.findOne({
    studentId: student._id,
    checkOutAt: null,
  }).sort({
    checkInAt: -1,
  });

  if (!openAttendance) {
    return res.status(400).json({
      message: 'You are not currently checked in',
    });
  }

  openAttendance.checkOutAt = new Date();

  openAttendance.durationMinutes = Math.round(
    (openAttendance.checkOutAt - openAttendance.checkInAt) / 60000
  );

  if (location) {
    openAttendance.checkOutLocation = location;
  }

  await openAttendance.save();

  return res.status(200).json({
    action: 'check-out',
    attendance: openAttendance,
  });
});

// ---------- Manual check-in/out (used by StudyTimer, unchanged) ----------

const checkIn = asyncHandler(async (req, res) => {
  const student = await Student.findOne({
    userId: req.user._id,
  });

  const booking = await SeatBooking.findOne({
    studentId: student._id,
    libraryId: req.libraryId,
    status: 'active',
  });

  if (!booking) {
    return res.status(400).json({
      message: 'No active booking to check in against',
    });
  }

  const openAttendance = await Attendance.findOne({
    studentId: student._id,
    checkOutAt: null,
  });

  if (openAttendance) {
    return res.status(400).json({
      message: 'Already checked in — check out first',
    });
  }

  const attendance = await Attendance.create({
    libraryId: req.libraryId,
    studentId: student._id,
    bookingId: booking._id,
    checkInAt: new Date(),
    source: 'manual',
  });

  await updateStreak(student);

  res.status(201).json({
    attendance,
  });
});

const checkOut = asyncHandler(async (req, res) => {
  const student = await Student.findOne({
    userId: req.user._id,
  });

  const attendance = await Attendance.findOne({
    studentId: student._id,
    checkOutAt: null,
  }).sort({
    checkInAt: -1,
  });

  if (!attendance) {
    return res.status(400).json({
      message: 'No open check-in found',
    });
  }

  attendance.checkOutAt = new Date();

  attendance.durationMinutes = Math.round(
    (attendance.checkOutAt - attendance.checkInAt) / 60000
  );

  await attendance.save();

  res.status(200).json({
    attendance,
  });
});

// ---------- Admin: today's attendance OR a specific past date ----------
// @desc    Attendance for a given date (defaults to today)
// @route   GET /api/attendance/today?date=YYYY-MM-DD
// @access  Private (admin)
const getTodayAttendance = asyncHandler(async (req, res) => {
  const targetDate = req.query.date
    ? new Date(req.query.date)
    : new Date();

  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const records = await Attendance.find({
    libraryId: req.libraryId,
    checkInAt: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
  })
    .populate({
      path: 'studentId',
      select: 'currentStreak',
      populate: {
        path: 'userId',
        select: 'name',
      },
    })
    .sort({
      checkInAt: -1,
    });

  res.status(200).json({
    count: records.length,
    records,
    date: startOfDay.toISOString().slice(0, 10),
  });
});

const getMyAttendance = asyncHandler(async (req, res) => {
  const student = await Student.findOne({
    userId: req.user._id,
  });

  const records = await Attendance.find({
    studentId: student._id,
  }).sort({
    checkInAt: -1,
  });

  res.status(200).json({
    records,
  });
});

// ---------- 10 PM auto-checkout sweep, called by cron ----------
// @desc    Force-checkout anyone still checked in after closing time.
//          Duration is calculated up to 10:00 PM.
const autoCheckoutStragglers = async () => {
  const now = new Date();

  const cutoff = new Date(now);
  cutoff.setHours(AUTO_CHECKOUT_HOUR, 0, 0, 0);

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const openRecords = await Attendance.find({
    checkOutAt: null,
    checkInAt: {
      $gte: startOfToday,
    },
  });

  for (const record of openRecords) {
    record.checkOutAt = cutoff;

    record.durationMinutes = Math.round(
      (cutoff - record.checkInAt) / 60000
    );

    await record.save();
  }

  console.log(
    `Auto-checkout: closed ${openRecords.length} open attendance record(s) at 10 PM`
  );

  return openRecords.length;
};

module.exports = {
  checkIn,
  checkOut,
  getTodayAttendance,
  getMyAttendance,
  generateGateToken,
  scanAttendance,
  autoCheckoutStragglers,
};