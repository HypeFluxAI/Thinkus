import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

// Using the exact same connection string
const MONGODB_URI = 'mongodb+srv://hypeflux_db_user:RMocyL9RVvmdlxi8@cluster0.d0uactk.mongodb.net/?appName=Cluster0'

// Copy the User model schema exactly as the app uses it
const UserSchema = new mongoose.Schema({
  email: { type: String, lowercase: true },
  password: String,
  name: String,
  // ... other fields are not needed for auth test
})

async function debugAuth() {
  try {
    // Connect exactly like the app does
    await mongoose.connect(MONGODB_URI, { bufferCommands: false })
    console.log('Connected to MongoDB')
    console.log('Database:', mongoose.connection.db?.databaseName)

    // Use the User model
    const User = mongoose.model('User', UserSchema)

    const email = 'e2e-test@thinkus.com'
    const password = 'Test123456!'

    // Try to find user exactly like the auth does
    console.log('\nSearching for user with email:', email)
    const user = await User.findOne({ email })

    if (!user) {
      console.log('❌ User NOT found with Mongoose model!')

      // Check directly in collection
      const db = mongoose.connection.db!
      const directUser = await db.collection('users').findOne({ email })
      console.log('Direct collection query result:', directUser ? 'Found' : 'Not found')

      if (directUser) {
        console.log('Direct user data:', {
          _id: directUser._id,
          email: directUser.email,
          hasPassword: !!directUser.password
        })
      }

      // List all users
      const allUsers = await db.collection('users').find({}).toArray()
      console.log('\nAll users in collection:')
      allUsers.forEach(u => console.log('  -', u.email, '| _id:', u._id))

      return
    }

    console.log('✅ User found!')
    console.log('User ID:', user._id)
    console.log('User email:', user.email)
    console.log('Has password:', !!user.password)

    // Test password comparison
    if (user.password) {
      const isValid = await bcrypt.compare(password, user.password)
      console.log('Password valid:', isValid ? '✅' : '❌')
    }

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error))
  } finally {
    await mongoose.disconnect()
    console.log('\nDone')
  }
}

debugAuth()
