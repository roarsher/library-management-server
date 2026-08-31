const { AuditLog } = require('../models');

// Attach AFTER the route handler has already sent the response is not possible
// with plain middleware ordering, so instead we wrap res.json to capture the
// outcome, then fire the audit write once the response is on its way.
//
// Usage: router.put('/students/:id', protect, restrictTo('admin'),
//          auditAction('Student', 'update'), studentController.updateStudent)
//
// Controllers that use this should stash the "before" doc on req.auditBefore
// and the "after" doc on req.auditAfter before calling res.json/res.status(...).json.
const auditAction = (targetModel, action) => {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = (body) => {
      // Fire-and-forget; don't block or fail the response if logging fails
      if (res.statusCode < 400) {
        AuditLog.create({
          libraryId: req.libraryId,
          adminId: req.user._id,
          action,
          targetModel,
          targetId: req.params.id || req.auditTargetId,
          before: req.auditBefore || null,
          after: req.auditAfter || body,
          ipAddress: req.ip,
        }).catch((err) => console.error('Audit log write failed:', err.message));
      }
      return originalJson(body);
    };

    next();
  };
};

module.exports = { auditAction };
