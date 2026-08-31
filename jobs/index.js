const { scheduleNoShowCheckJob } = require('./noShowCheckJob');
const { scheduleLeaveSeatReleaseJob } = require('./leaveSeatReleaseJob');
const { scheduleRenewalReminderJob } = require('./renewalReminderJob');
const { scheduleStreakRecalcJob } = require('./streakRecalcJob');

const startCronJobs = () => {
  scheduleNoShowCheckJob();
  scheduleLeaveSeatReleaseJob();
  scheduleRenewalReminderJob();
  scheduleStreakRecalcJob();
  console.log('Cron jobs scheduled: no-show check, leave release, renewal reminders, streak recalc');
};

module.exports = { startCronJobs };
