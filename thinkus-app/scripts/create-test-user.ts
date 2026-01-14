import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const uri = 'mongodb+srv://hypeflux_db_user:RMocyL9RVvmdlxi8@cluster0.d0uactk.mongodb.net/thinkus-dev?retryWrites=true&w=majority';

async function createTestUser() {
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');
    
    const userSchema = new mongoose.Schema({
      name: String,
      email: { type: String, unique: true, sparse: true },
      password: String,
      emailVerified: Date,
      role: { type: String, default: 'user' },
      status: { type: String, default: 'active' },
      subscription: {
        plan: { type: String, default: 'free' },
        status: { type: String, default: 'active' },
      },
    }, { timestamps: true, collection: 'users' });
    
    const User = mongoose.models.User || mongoose.model('User', userSchema);
    
    const testEmail = 'e2e-test@thinkus.com';
    
    // Check if user exists
    let user = await User.findOne({ email: testEmail });
    
    if (!user) {
      const hashedPassword = await bcrypt.hash('Test123456!', 10);
      user = await User.create({
        name: 'E2E Test User',
        email: testEmail,
        password: hashedPassword,
        emailVerified: new Date(),
        role: 'user',
        status: 'active',
        subscription: {
          plan: 'pro',
          status: 'active',
        },
      });
      console.log('Created test user:', user._id);
    } else {
      console.log('Test user exists:', user._id);
    }
    
    // List all users
    const allUsers = await User.find({}).limit(5);
    console.log('\nExisting users:');
    allUsers.forEach(u => console.log(' -', u.email, u._id));
    
  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
  }
}

createTestUser();
