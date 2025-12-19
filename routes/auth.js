import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || '';

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      data: {
        user: user.toJSON(),
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login', message: error.message });
  }
});

router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    res.json({
      success: true,
      data: { user: user.toJSON() }
    });
  } catch (error) {
    console.error('Auth verification error:', error);
    res.status(401).json({ error: 'Invalid token', message: error.message });
  }
});

router.post('/setup-admin', async (req, res) => {
  try {
    const existingAdmin = await User.findOne({ email: 'admin@lfc.com' });

    if (existingAdmin) {
      return res.json({
        success: true,
        message: 'Admin already exists',
        credentials: {
          email: 'admin@lfc.com',
          password: 'admin123'
        }
      });
    }

    const adminUser = new User({
      email: 'admin@lfc.com',
      password: 'admin123',
      name: 'Administrator',
      role: 'admin',
      isActive: true
    });

    await adminUser.save();

    res.json({
      success: true,
      message: 'Admin user created successfully',
      credentials: {
        email: 'admin@lfc.com',
        password: 'admin123'
      }
    });
  } catch (error) {
    console.error('Setup admin error:', error);
    res.status(500).json({ error: 'Failed to setup admin', message: error.message });
  }
});

export default router;
