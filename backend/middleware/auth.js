const jwt = require('jsonwebtoken');
const dbHelper = require('../services/dbService');

const SECRET_KEY = process.env.SECRET_KEY || 'super-secret-key-for-jwt-authentication';

const tokenRequired = async (req, res, next) => {
  let token = null;
  
  if (req.headers.authorization) {
    const authHeader = req.headers.authorization;
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    } else {
      return res.status(401).json({ message: 'Token format must be Bearer <token>' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Authorization token is missing!' });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    // In our new schema, the primary key of users is 'id'
    const user = await dbHelper.get('SELECT * FROM users WHERE id = ?', [decoded.user_id]);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid user token!' });
    }
    
    req.currentUser = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired!' });
    }
    return res.status(401).json({ message: 'Invalid token!' });
  }
};

module.exports = {
  tokenRequired,
  SECRET_KEY
};
