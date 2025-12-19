import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header'
      });
    }

    const token = authHeader.substring(7);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found'
      });
    }

    req.user = {
      userId: user._id.toString(),
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication failed'
    });
  }
};

export const authenticateToken = authMiddleware;

export const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Admin access required'
    });
  }
  next();
};

export const requireTechOrAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'tech_user') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Technical user or admin access required'
    });
  }
  next();
};
