import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

// Direct connection string
const uri = 'mongodb+srv://hypeflux_db_user:RMocyL9RVvmdlxi8@cluster0.d0uactk.mongodb.net/?appName=Cluster0'

async function verifyAndFixTestUser() {
  try {
    await mongoose.connect(uri)
    console.log('Connected to MongoDB')
    console.log('Database:', mongoose.connection.db?.databaseName)

    const db = mongoose.connection.db!
    const users = db.collection('users')

    const testEmail = 'e2e-test@thinkus.com'
    const testPassword = 'Test123456!'

    // Find user
    const user = await users.findOne({ email: testEmail })
    console.log('\nUser found:', user ? 'Yes' : 'No')

    if (user) {
      console.log('User ID:', user._id)
      console.log('Email:', user.email)
      console.log('Has password:', !!user.password)

      // Verify current password
      if (user.password) {
        const isValid = await bcrypt.compare(testPassword, user.password)
        console.log('Password valid:', isValid ? '✅' : '❌')

        if (!isValid) {
          // Update password
          const newHash = await bcrypt.hash(testPassword, 10)
          await users.updateOne({ _id: user._id }, { $set: { password: newHash } })
          console.log('Password updated!')

          // Verify again
          const updated = await users.findOne({ _id: user._id })
          const nowValid = await bcrypt.compare(testPassword, updated!.password)
          console.log('New password valid:', nowValid ? '✅' : '❌')
        }
      }
    } else {
      // Create user
      const hashedPassword = await bcrypt.hash(testPassword, 10)
      const result = await users.insertOne({
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
        stats: {
          totalProjects: 0,
          totalDiscussions: 0,
          totalCodeGenerations: 0,
          successfulInvitations: 0,
        },
        preferences: {
          language: 'zh-CN',
          theme: 'system',
          emailNotifications: true,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      console.log('Created user:', result.insertedId)
    }

  } catch (error: unknown) {
    console.error('Error:', error instanceof Error ? error.message : String(error))
  } finally {
    await mongoose.disconnect()
    console.log('\nDone')
  }
}

verifyAndFixTestUser()
