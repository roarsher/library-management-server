// require('dotenv').config();
// const app = require('./app');
// const connectDB = require('./config/db');
// const { startCronJobs } = require('./jobs');
// const { startReminderCron } = require('./services/reminderCron');

// // ...after app is created / before or after app.listen, doesn't matter which:

// const PORT = process.env.PORT || 5000;

// connectDB().then(() => {
//   app.listen(PORT, () => {
//     console.log(`Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
//     startCronJobs();
//   });
// });

// process.on('unhandledRejection', (err) => {
//   console.error(`Unhandled Rejection: ${err.message}`);
//   process.exit(1);
// });




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