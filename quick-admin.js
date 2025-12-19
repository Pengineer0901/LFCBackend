import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  name: { type: String },
  role: { type: String, enum: ['admin', 'tech_user', 'normal_user'], default: 'normal_user' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

async function createQuickAdmin() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/leadership-systems';
    await mongoose.connect(MONGODB_URI);

    const User = mongoose.model('User', userSchema);

    const existingAdmin = await User.findOne({ email: 'admin@lfc.com' });

    if (existingAdmin) {
      console.log('\n✅ Admin already exists!');
      console.log('================================');
      console.log('Email: admin@lfc.com');
      console.log('Password: admin123');
      console.log('Role: Admin');
      console.log('================================\n');
    } else {
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

      console.log('\n✅ Admin user created successfully!');
      console.log('================================');
      console.log('Email: admin@lfc.com');
      console.log('Password: admin123');
      console.log('Role: Admin');
      console.log('================================\n');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

createQuickAdmin();
