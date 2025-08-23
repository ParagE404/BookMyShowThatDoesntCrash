const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || '1b7736f8e42a3fe90267ec6b272c028bda799b7279af4c125e7eca5a6459a095a43353186b796761545b82c9d2d32063fc8281b7240e2dd1a6f69b01cc654b00';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

function generateAccessToken(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role || 'user',
    type: 'access'
  };


  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'high-concurrency-ticketing'
  });
}

function generateRefreshToken(user) {
  const payload = {
    userId: user.id,
    type: 'refresh'
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d',
    issuer: 'high-concurrency-ticketing'
  });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET, {
    issuer: 'high-concurrency-ticketing'
  });
}

function generateTokenPair(user) {
  const accessToken = generateAccessToken(user);
  console.log('Generated access token:', accessToken);
  const refreshToken = generateRefreshToken(user);
  console.log('Generated refresh token:', refreshToken);
  
  return {
    accessToken,
    refreshToken,
    tokenType: 'Bearer',
    expiresIn: 86400 // 24 hours in seconds
  };
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyToken
};
