const jwt = require('jsonwebtoken');

const generateToken = (userId, role, libraryId) => {
  return jwt.sign(
    { id: userId, role, libraryId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

module.exports = generateToken;
