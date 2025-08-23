const { verifyToken } = require('../utils/jwt');

function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;
    
    if (!token) {
      return res.status(401).json({
        error: {
          message: 'Access token required',
          code: 'MISSING_TOKEN'
        }
      });
    }

    const decoded = verifyToken(token);
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };
    
    next();
  } catch (error) {
    let message = 'Invalid token';
    if (error.name === 'TokenExpiredError') {
      message = 'Token has expired';
    }

    return res.status(401).json({
      error: {
        message,
        code: 'INVALID_TOKEN'
      }
    });
  }
}

module.exports = { authenticate };
