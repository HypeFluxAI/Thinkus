import mongoose from 'mongoose';

// Use the exact same connection string format as the app
const uri = 'mongodb+srv://hypeflux_db_user:RMocyL9RVvmdlxi8@cluster0.d0uactk.mongodb.net/?appName=Cluster0';

async function checkDb() {
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');
    console.log('Database name:', mongoose.connection.db?.databaseName);
    
    // List all collections
    const collections = await mongoose.connection.db?.listCollections().toArray();
    console.log('\nCollections:');
    collections?.forEach(c => console.log(' -', c.name));
    
    // Check users in different collections
    const db = mongoose.connection.db;
    
    // Try to find users
    const users = await db?.collection('users').find({}).limit(5).toArray();
    console.log('\nUsers found:', users?.length);
    users?.forEach(u => console.log(' -', u.email || u.phone, u._id));
    
  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkDb();
