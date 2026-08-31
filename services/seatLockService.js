// Simple in-memory seat lock (BookMyShow-style hold) for a single-instance deployment.
// For production with multiple server instances, swap this Map for Redis
// (SET seatLock:<seatId> <studentId> PX <ms> NX) so locks are shared across instances.

const LOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes

const locks = new Map(); // seatId -> { studentId, expiresAt }

const acquireLock = (seatId, studentId) => { 
  const existing = locks.get(seatId);
  const now = Date.now();

  if (existing && existing.expiresAt > now && existing.studentId !== studentId) {
    return { success: false, message: 'Seat is currently being booked by another student' };
  }

  locks.set(seatId, { studentId, expiresAt: now + LOCK_DURATION_MS });
  return { success: true, expiresAt: now + LOCK_DURATION_MS };
};

const releaseLock = (seatId, studentId) => {
  const existing = locks.get(seatId);
  if (existing && existing.studentId === studentId) {
    locks.delete(seatId);
  }
};

const isLocked = (seatId, byOtherThan) => {
  const existing = locks.get(seatId);
  if (!existing) return false;
  if (existing.expiresAt <= Date.now()) {
    locks.delete(seatId);
    return false;
  }
  return existing.studentId !== byOtherThan;
};

module.exports = { acquireLock, releaseLock, isLocked };
