 
require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { startCronJobs } = require('./jobs');
const { startReminderCron } = require('./services/reminderCron');

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(
      `Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`
    );

    startCronJobs();
    startReminderCron();
  });
});

process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection: ${err.message}`);
  process.exit(1);
});