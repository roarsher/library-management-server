const asyncHandler = require('../utils/asyncHandler');
const { AuditLog } = require('../models');

// @desc    List audit log entries (filterable by target model/admin)
// @route   GET /api/audit-logs?targetModel=Student&adminId=...
// @access  Private (admin/superadmin)
const listAuditLogs = asyncHandler(async (req, res) => {
  const filter = { libraryId: req.libraryId };
  if (req.query.targetModel) filter.targetModel = req.query.targetModel;
  if (req.query.adminId) filter.adminId = req.query.adminId;

  const logs = await AuditLog.find(filter)
    .populate('adminId', 'name email')
    .sort({ createdAt: -1 })
    .limit(200);

  res.status(200).json({ count: logs.length, logs });
});

module.exports = { listAuditLogs };
