import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  name: { type: String },
  role: { type: String, enum: ['admin', 'tech_user', 'normal_user'], default: 'normal_user' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

let User;

app.get('/setup-admin', async (req, res) => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/leadership-systems';

    if (!mongoose.connection.readyState) {
      await mongoose.connect(MONGODB_URI);
    }

    if (!User) {
      User = mongoose.model('User', userSchema);
    }

    const existingAdmin = await User.findOne({ email: 'admin@lfc.com' });

    if (existingAdmin) {
      return res.json({
        success: true,
        message: 'Admin already exists',
        credentials: {
          email: 'admin@lfc.com',
          password: 'admin123',
          note: 'Use these credentials to login'
        }
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    const adminUser = new User({
      email: 'admin@lfc.com',
      password: hashedPassword,
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
        password: 'admin123',
        note: 'Use these credentials to login at the frontend'
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`Setup server running on port ${PORT}`);
  console.log(`Visit: http://localhost:${PORT}/setup-admin`);
  console.log(`========================================\n`);
});
