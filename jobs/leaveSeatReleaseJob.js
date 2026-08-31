const cron = require('node-cron');
const { LeaveRequest } = require('../models');
const { revertSeatAfterLeave } = require('../controllers/leaveController');

// Runs every hour: finds approved leaves whose toDate has passed and the
// seat hasn't already been picked up by someone else, then reverts the
// seat back to the original student's active booking.
const runLeaveSeatReleaseCheck = async () => {
  const now = new Date();

  const endedLeaves = await LeaveRequest.find({
    status: 'approved',
    toDate: { $lt: now },
    seatReleased: true,
  });

  for (const leave of endedLeaves) {
    await revertSeatAfterLeave(leave);
  }
};

const scheduleLeaveSeatReleaseJob = () => {
  cron.schedule('0 * * * *', () => {
    runLeaveSeatReleaseCheck().catch((err) =>
      console.error('Leave seat release job failed:', err.message)
    );
  });
};

module.exports = { scheduleLeaveSeatReleaseJob, runLeaveSeatReleaseCheck };
