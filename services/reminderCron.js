// const cron = require('node-cron');
// const { Student, SeatBooking } = require('../models');
// const { sendWhatsAppMessage } = require('./whatsappService');
// const { autoCheckoutStragglers } = require('../controllers/attendanceController');

// const isSameMonthDay = (date, today) =>
//   date.getMonth() === today.getMonth() && date.getDate() === today.getDate();

// // ---------- Subscription expiring in 2 days ----------
// const sendExpiryReminders = async () => {
//   const twoDaysFromNow = new Date();
//   twoDaysFromNow.setHours(0, 0, 0, 0);
//   twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
//   const rangeEnd = new Date(twoDaysFromNow);
//   rangeEnd.setHours(23, 59, 59, 999);

//   const expiringBookings = await SeatBooking.find({
//     status: 'active',
//     endDate: { $gte: twoDaysFromNow, $lte: rangeEnd },
//   }).populate({ path: 'studentId', populate: { path: 'userId', select: 'name phone' } });

//   for (const booking of expiringBookings) {
//     const phone = booking.studentId?.userId?.phone;
//     const name = booking.studentId?.userId?.name;
//     if (!phone) continue;
//     try {
//       await sendWhatsAppMessage(
//         phone,
//         `Hi ${name}, your library membership expires on ${booking.endDate.toLocaleDateString()}. Please renew soon to keep your seat.`
//       );
//     } catch (err) {
//       console.error(`Expiry reminder failed for ${name}:`, err.message);
//     }
//   }
//   console.log(`Expiry reminders: ${expiringBookings.length} sent`);
// };

// // ---------- Birthday greetings ----------
// const sendBirthdayGreetings = async () => {
//   const today = new Date();
//   const students = await Student.find({ dob: { $exists: true } }).populate('userId', 'name phone');

//   const birthdayStudents = students.filter((s) => s.dob && isSameMonthDay(new Date(s.dob), today));

//   for (const student of birthdayStudents) {
//     const phone = student.userId?.phone;
//     const name = student.userId?.name;
//     if (!phone) continue;
//     try {
//       await sendWhatsAppMessage(phone, `Happy Birthday, ${name}! Wishing you a wonderful year ahead from all of us. 🎉`);
//     } catch (err) {
//       console.error(`Birthday message failed for ${name}:`, err.message);
//     }
//   }
//   console.log(`Birthday greetings: ${birthdayStudents.length} sent`);
// };

// // ---------- Library join anniversary ----------
// const sendAnniversaryGreetings = async () => {
//   const today = new Date();
//   const students = await Student.find({}).populate('userId', 'name phone');

//   const anniversaryStudents = students.filter((s) => isSameMonthDay(new Date(s.createdAt), today));

//   for (const student of anniversaryStudents) {
//     const phone = student.userId?.phone;
//     const name = student.userId?.name;
//     if (!phone) continue;
//     const years = today.getFullYear() - new Date(student.createdAt).getFullYear();
//     if (years < 1) continue; // skip students who joined today this same year
//     try {
//       await sendWhatsAppMessage(
//         phone,
//         `Hi ${name}, it's been ${years} year(s) since you joined us! Thank you for being with us. 🎊`
//       );
//     } catch (err) {
//       console.error(`Anniversary message failed for ${name}:`, err.message);
//     }
//   }
//   console.log(`Anniversary greetings: ${anniversaryStudents.length} sent`);
// };

// // Runs once daily at 9:00 AM server time
//  const startReminderCron = () => {
//   // Existing daily 9 AM job — expiry/birthday/anniversary WhatsApp messages
//   cron.schedule('0 9 * * *', async () => {
//     console.log('Running daily WhatsApp reminder job...');
//     await sendExpiryReminders();
//     await sendBirthdayGreetings();
//     await sendAnniversaryGreetings();
//   });

//   // New — 10 PM daily, force-checkout anyone who forgot to scan out
//   cron.schedule('0 22 * * *', async () => {
//     console.log('Running 10 PM auto-checkout sweep...');
//     await autoCheckoutStragglers().catch((err) => console.error('Auto-checkout failed:', err.message));
//   });

//   console.log('Reminder cron scheduled (daily 9:00 AM + 10:00 PM auto-checkout)');
// };
// module.exports = { startReminderCron };



const cron = require('node-cron');

const { Student, SeatBooking, Library } = require('../models');

const { sendWhatsAppMessage } = require('./whatsappService');

const { autoCheckoutStragglers } = require('../controllers/attendanceController');

const { revertExpiredLeaves } = require('../controllers/leaveController');

const isSameMonthDay = (date, today) =>
  date.getMonth() === today.getMonth() &&
  date.getDate() === today.getDate();


// ---------- Subscription expiring in 2 days ----------
const sendExpiryReminders = async () => {
  const twoDaysFromNow = new Date();

  twoDaysFromNow.setHours(0, 0, 0, 0);
  twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

  const rangeEnd = new Date(twoDaysFromNow);
  rangeEnd.setHours(23, 59, 59, 999);

  const expiringBookings = await SeatBooking.find({
    status: 'active',
    endDate: {
      $gte: twoDaysFromNow,
      $lte: rangeEnd,
    },
  }).populate({
    path: 'studentId',
    populate: {
      path: 'userId',
      select: 'name phone',
    },
  });

  for (const booking of expiringBookings) {
    const phone = booking.studentId?.userId?.phone;
    const name = booking.studentId?.userId?.name;

    if (!phone) continue;

    try {
      await sendWhatsAppMessage(
        phone,
        `Hi ${name}, your library membership expires on ${booking.endDate.toLocaleDateString()}. Please renew soon to keep your seat.`
      );
    } catch (err) {
      console.error(
        `Expiry reminder failed for ${name}:`,
        err.message
      );
    }
  }

  console.log(
    `Expiry reminders: ${expiringBookings.length} sent`
  );
};


// ---------- Birthday greetings ----------
const sendBirthdayGreetings = async () => {
  const today = new Date();

  const students = await Student.find({
    dob: { $exists: true },
  }).populate('userId', 'name phone');

  const birthdayStudents = students.filter(
    (s) =>
      s.dob &&
      isSameMonthDay(new Date(s.dob), today)
  );

  for (const student of birthdayStudents) {
    const phone = student.userId?.phone;
    const name = student.userId?.name;

    if (!phone) continue;

    try {
      await sendWhatsAppMessage(
        phone,
        `Happy Birthday, ${name}! Wishing you a wonderful year ahead from all of us. 🎉`
      );
    } catch (err) {
      console.error(
        `Birthday message failed for ${name}:`,
        err.message
      );
    }
  }

  console.log(
    `Birthday greetings: ${birthdayStudents.length} sent`
  );
};


// ---------- Library join anniversary ----------
const sendAnniversaryGreetings = async () => {
  const today = new Date();

  const students = await Student.find({})
    .populate('userId', 'name phone');

  const anniversaryStudents = students.filter(
    (s) =>
      isSameMonthDay(
        new Date(s.createdAt),
        today
      )
  );

  for (const student of anniversaryStudents) {
    const phone = student.userId?.phone;
    const name = student.userId?.name;

    if (!phone) continue;

    const years =
      today.getFullYear() -
      new Date(student.createdAt).getFullYear();

    // Skip students who joined today this same year
    if (years < 1) continue;

    try {
      await sendWhatsAppMessage(
        phone,
        `Hi ${name}, it's been ${years} year(s) since you joined us! Thank you for being with us. 🎊`
      );
    } catch (err) {
      console.error(
        `Anniversary message failed for ${name}:`,
        err.message
      );
    }
  }

  console.log(
    `Anniversary greetings: ${anniversaryStudents.length} sent`
  );
};


// ---------- Start all cron jobs ----------
const startReminderCron = () => {

  // ----------------------------------------------------------
  // Daily 9 AM
  // Expiry + Birthday + Anniversary + Expired Leave Reversion
  // ----------------------------------------------------------
  cron.schedule('0 9 * * *', async () => {
    console.log(
      'Running daily WhatsApp reminder and leave-revert job...'
    );

    // Existing WhatsApp jobs
    await sendExpiryReminders();
    await sendBirthdayGreetings();
    await sendAnniversaryGreetings();

    // --------------------------------------------------------
    // Revert expired leaves for all active libraries
    // --------------------------------------------------------
    try {
      const libraries = await Library.find({
        isActive: true,
      }).select('_id');

      for (const lib of libraries) {
        await revertExpiredLeaves(lib._id).catch((err) =>
          console.error(
            'Leave revert failed:',
            err.message
          )
        );
      }

      console.log(
        `Expired leave check completed for ${libraries.length} active library(s)`
      );
    } catch (err) {
      console.error(
        'Failed to process expired leaves:',
        err.message
      );
    }
  });


  // ----------------------------------------------------------
  // Daily 10 PM
  // Auto checkout students who forgot to scan out
  // ----------------------------------------------------------
  cron.schedule('0 22 * * *', async () => {
    console.log(
      'Running 10 PM auto-checkout sweep...'
    );

    await autoCheckoutStragglers().catch((err) =>
      console.error(
        'Auto-checkout failed:',
        err.message
      )
    );
  });


  console.log(
    'Reminder cron scheduled (daily 9:00 AM + 10:00 PM auto-checkout)'
  );
};


module.exports = {
  startReminderCron,
};