const cron = require('node-cron');
const { Student, Attendance } = require('../models');

// Runs nightly: recomputes each student's consecutive-day study streak
// based on Attendance records. Kept simple/denormalized rather than
// computed live on every request.
const runStreakRecalc = async () => {
  const students = await Student.find({ admissionStatus: 'verified' });

  for (const student of students) {
    const records = await Attendance.find({ studentId: student._id })
      .sort({ checkInAt: -1 })
      .limit(90); // look back ~3 months max

    if (records.length === 0) {
      student.currentStreak = 0;
      await student.save();
      continue;
    }

    const uniqueDays = [
      ...new Set(records.map((r) => r.checkInAt.toISOString().slice(0, 10))),
    ].sort((a, b) => new Date(b) - new Date(a));

    let streak = 0;
    let cursor = new Date();
    cursor.setHours(0, 0, 0, 0);

    for (const day of uniqueDays) {
      const dayDate = new Date(day);
      const diffDays = Math.round((cursor - dayDate) / (1000 * 60 * 60 * 24));

      if (diffDays === 0 || diffDays === 1) {
        streak += 1;
        cursor = dayDate;
      } else {
        break;
      }
    }

    student.currentStreak = streak;
    student.longestStreak = Math.max(student.longestStreak, streak);
    await student.save();
  }
};

const scheduleStreakRecalcJob = () => {
  cron.schedule('30 23 * * *', () => {
    // 11:30 PM daily
    runStreakRecalc().catch((err) => console.error('Streak recalc job failed:', err.message));
  });
};

module.exports = { scheduleStreakRecalcJob, runStreakRecalc };
