import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Use the exact same connection string as the app (default database is "test")
const uri = 'mongodb+srv://hypeflux_db_user:RMocyL9RVvmdlxi8@cluster0.d0uactk.mongodb.net/?appName=Cluster0';

async function createTestUser() {
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');
    console.log('Database:', mongoose.connection.db?.databaseName);
    
    const db = mongoose.connection.db;
    const users = db?.collection('users');
    
    const testEmail = 'e2e-test@thinkus.com';
    
    // Check if user exists
    let user = await users?.findOne({ email: testEmail });
    
    if (!user) {
      const hashedPassword = await bcrypt.hash('Test123456!', 10);
      const result = await users?.insertOne({
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
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('Created test user:', result?.insertedId);
    } else {
      // Update password to make sure it's correct
      const hashedPassword = await bcrypt.hash('Test123456!', 10);
      await users?.updateOne({ email: testEmail }, { $set: { password: hashedPassword } });
      console.log('Test user exists, updated password:', user._id);
    }
    
    // Also create a test project for the user
    const projects = db?.collection('projects');
    const testUser = await users?.findOne({ email: testEmail });
    
    let project = await projects?.findOne({ userId: testUser?._id, name: 'E2E Test Project' });
    if (!project) {
      const projectResult = await projects?.insertOne({
        userId: testUser?._id,
        name: 'E2E Test Project',
        description: 'A test project for E2E testing',
        type: 'web_app',
        phase: 'development',
        status: 'active',
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('Created test project:', projectResult?.insertedId);
    } else {
      console.log('Test project exists:', project._id);
    }
    
    // List users
    const allUsers = await users?.find({}).limit(5).toArray();
    console.log('\nExisting users:');
    allUsers?.forEach(u => console.log(' -', u.email || u.phone, u._id));
    
  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\nDone');
  }
}

createTestUser();
