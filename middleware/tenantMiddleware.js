// Must run after `protect`. Attaches req.libraryId so every controller
// can scope its queries without repeating this logic everywhere.
//
// - student/admin: libraryId comes from their own account (they belong to one library)
// - superadmin: can act across libraries, so libraryId comes from a header/query,
//   allowing the platform owner to view/manage any tenant on demand.
const resolveTenant = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }

  if (req.user.role === 'superadmin') {
    const targetLibraryId = req.headers['x-library-id'] || req.query.libraryId;
    if (!targetLibraryId) {
      return res.status(400).json({
        message: 'superadmin must specify x-library-id header or libraryId query param',
      });
    }
    req.libraryId = targetLibraryId;
  } else {
    if (!req.user.libraryId) {
      return res.status(403).json({ message: 'Account is not associated with any library' });
    }
    req.libraryId = req.user.libraryId;
  }

  next();
};

module.exports = { resolveTenant };
