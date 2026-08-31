const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const authRoutes = require('./routes/authRoutes');
const libraryRoutes = require('./routes/libraryRoutes');
const studentRoutes = require('./routes/studentRoutes');
const seatRoutes = require('./routes/seatRoutes');
const hallRoutes = require('./routes/hallRoutes');
const timeSlotRoutes = require('./routes/timeSlotRoutes');
const addOnRoutes = require('./routes/addOnRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const waitingListRoutes = require('./routes/waitingListRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const galleryRoutes = require('./routes/galleryRoutes');
const broadcastRoutes = require('./routes/broadcastRoutes');
const referralRoutes = require('./routes/referralRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const todoRoutes = require('./routes/todoRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const pushRoutes = require('./routes/pushRoutes');
const timerRoutes = require('./routes/timerRoutes');
 
const { getMyTimer, startTimer, pauseTimer, resetTimer } = require('./controllers/timerController');
 

const app = express();

// Core middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Route mounting
 
app.use('/api/auth', authRoutes);
app.use('/api/libraries', libraryRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/seats', seatRoutes);
app.use('/api/halls', hallRoutes);
app.use('/api/time-slots', timeSlotRoutes);
app.use('/api/add-ons', addOnRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/waiting-list', waitingListRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/broadcast', broadcastRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/todos', todoRoutes);
app.use('/api/timer', timerRoutes);   // ← add this
app.use('/api/uploads', uploadRoutes);
app.use('/api/push', pushRoutes);
 app.use('/api/attendance', attendanceRoutes);

 

// 404 + centralized error handler — must be registered last
app.use(notFound);
app.use(errorHandler);

module.exports = app;
