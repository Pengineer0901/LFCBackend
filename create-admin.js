import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'tech_user', 'normal_user'],
    default: 'normal_user'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

async function createAdminUser() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/leadership-systems';

    console.log('\n===========================================');
    console.log('   LFC AI Engine - Admin User Setup');
    console.log('===========================================\n');

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const User = mongoose.model('User', userSchema);

    const existingAdmins = await User.find({ role: 'admin' });
    if (existingAdmins.length > 0) {
      console.log('⚠️  Admin user(s) already exist:');
      existingAdmins.forEach(admin => {
        console.log(`   - ${admin.email} (${admin.name || 'No name'})`);
      });
      console.log('\nDo you want to create another admin user?');
      const proceed = await question('Type "yes" to continue: ');
      if (proceed.toLowerCase() !== 'yes') {
        console.log('\n❌ Setup cancelled.\n');
        rl.close();
        await mongoose.disconnect();
        process.exit(0);
      }
      console.log('');
    }

    const email = await question('Enter admin email: ');
    if (!email || !email.includes('@')) {
      console.log('\n❌ Invalid email address.\n');
      rl.close();
      await mongoose.disconnect();
      process.exit(1);
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      console.log('\n❌ User with this email already exists.\n');
      rl.close();
      await mongoose.disconnect();
      process.exit(1);
    }

    const name = await question('Enter admin name: ');

    const password = await question('Enter admin password (min 6 characters): ');
    if (!password || password.length < 6) {
      console.log('\n❌ Password must be at least 6 characters.\n');
      rl.close();
      await mongoose.disconnect();
      process.exit(1);
    }

    const confirmPassword = await question('Confirm password: ');
    if (password !== confirmPassword) {
      console.log('\n❌ Passwords do not match.\n');
      rl.close();
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log('\n⏳ Creating admin user...');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const adminUser = new User({
      email: email.toLowerCase(),
      password: hashedPassword,
      name: name || 'Administrator',
      role: 'admin',
      isActive: true
    });

    await adminUser.save();

    console.log('\n===========================================');
    console.log('✅ Admin user created successfully!');
    console.log('===========================================');
    console.log('\nLogin credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role: admin`);
    console.log('\n⚠️  Please save these credentials securely!');
    console.log('\nYou can now:');
    console.log('   1. Start the backend: npm run server');
    console.log('   2. Start the frontend: npm run dev');
    console.log('   3. Login at: http://localhost:5173');
    console.log('   4. Go to User Management to create more users\n');

    rl.close();
    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error creating admin user:', error.message);
    rl.close();
    await mongoose.disconnect();
    process.exit(1);
  }
}

createAdminUser();
