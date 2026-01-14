import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const MONGODB_URI = 'mongodb+srv://hypeflux_db_user:RMocyL9RVvmdlxi8@cluster0.d0uactk.mongodb.net/?appName=Cluster0'

async function checkPasswordHash() {
  try {
    await mongoose.connect(MONGODB_URI)
    const db = mongoose.connection.db!

    const user = await db.collection('users').findOne({ email: 'e2e-test@thinkus.com' })

    console.log('User found:', !!user)
    console.log('Password field type:', typeof user?.password)
    console.log('Password hash:', user?.password?.substring(0, 30), '...')
    console.log('Password hash length:', user?.password?.length)

    const testPassword = 'Test123456!'
    console.log('\nTesting password:', testPassword)

    // Test with bcrypt directly
    const isValid = await bcrypt.compare(testPassword, user?.password)
    console.log('Direct bcrypt.compare:', isValid)

    // Generate a new hash and compare
    const newHash = await bcrypt.hash(testPassword, 10)
    console.log('\nNew hash:', newHash.substring(0, 30), '...')
    console.log('New hash length:', newHash.length)

    // Compare new hash
    const isNewValid = await bcrypt.compare(testPassword, newHash)
    console.log('New hash compare:', isNewValid)

    // Try updating the password
    await db.collection('users').updateOne(
      { email: 'e2e-test@thinkus.com' },
      { $set: { password: newHash } }
    )
    console.log('\nPassword updated with new hash')

    // Verify update
    const updated = await db.collection('users').findOne({ email: 'e2e-test@thinkus.com' })
    const finalValid = await bcrypt.compare(testPassword, updated?.password)
    console.log('After update, password valid:', finalValid)

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error))
  } finally {
    await mongoose.disconnect()
  }
}

checkPasswordHash()
