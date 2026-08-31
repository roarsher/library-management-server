const Timer = require('../models/Timer');

const computeElapsed = (timer) => {
  let total = timer.accumulatedSeconds;
  if (timer.status === 'running' && timer.sessionStartedAt) {
    total += Math.floor((Date.now() - new Date(timer.sessionStartedAt).getTime()) / 1000);
  }
  return total;
};

const getOrCreateTimer = async (studentId) => {
  let timer = await Timer.findOne({ student: studentId });
  if (!timer) timer = await Timer.create({ student: studentId });
  return timer;
};

// GET /api/timer/me
exports.getMyTimer = async (req, res) => {
  const timer = await getOrCreateTimer(req.user._id);
  res.json({ timer: { status: timer.status, elapsedSeconds: computeElapsed(timer) } });
};

// POST /api/timer/start
exports.startTimer = async (req, res) => {
  const timer = await getOrCreateTimer(req.user._id);
  const isFreshSession = timer.status === 'stopped' && timer.accumulatedSeconds === 0;

  if (timer.status !== 'running') {
    timer.status = 'running';
    timer.sessionStartedAt = new Date();
    await timer.save();
  }
  res.json({
    timer: { status: timer.status, elapsedSeconds: computeElapsed(timer) },
    isFreshSession, // frontend uses this to decide whether to fire attendance check-in
  });
};

// POST /api/timer/pause
exports.pauseTimer = async (req, res) => {
  const timer = await getOrCreateTimer(req.user._id);
  if (timer.status === 'running') {
    timer.accumulatedSeconds = computeElapsed(timer);
    timer.status = 'paused';
    timer.sessionStartedAt = null;
    await timer.save();
  }
  res.json({ timer: { status: timer.status, elapsedSeconds: timer.accumulatedSeconds } });
};

// POST /api/timer/reset
exports.resetTimer = async (req, res) => {
  const timer = await getOrCreateTimer(req.user._id);
  timer.status = 'stopped';
  timer.accumulatedSeconds = 0;
  timer.sessionStartedAt = null;
  await timer.save();
  res.json({ timer: { status: 'stopped', elapsedSeconds: 0 } });
};