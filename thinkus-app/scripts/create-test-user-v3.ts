import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import User from '../src/lib/db/models/user'
import Project from '../src/lib/db/models/project'
import dbConnect from '../src/lib/db/mongoose'

async function createTestUser() {
  try {
    await dbConnect()
    console.log('Connected to MongoDB')
    console.log('Database:', mongoose.connection.db?.databaseName)

    const testEmail = 'e2e-test@thinkus.com'
    const testPassword = 'Test123456!'

    // Check if user exists using Mongoose model
    let user = await User.findOne({ email: testEmail })

    if (!user) {
      const hashedPassword = await bcrypt.hash(testPassword, 10)
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
      })
      console.log('Created test user:', user._id)
    } else {
      // Update password
      const hashedPassword = await bcrypt.hash(testPassword, 10)
      user.password = hashedPassword
      await user.save()
      console.log('Test user exists, updated password:', user._id)
    }

    // Verify password works
    const isValid = await bcrypt.compare(testPassword, user.password!)
    console.log('Password verification:', isValid ? '✅ Success' : '❌ Failed')

    // Create test project
    let project = await Project.findOne({ userId: user._id, name: 'E2E Test Project' })
    if (!project) {
      project = await Project.create({
        userId: user._id,
        name: 'E2E Test Project',
        description: 'A test project for E2E testing',
        type: 'web_app',
        phase: 'development',
        status: 'active',
        settings: {},
      })
      console.log('Created test project:', project._id)
    } else {
      console.log('Test project exists:', project._id)
    }

    // List users
    const allUsers = await User.find({}).limit(5)
    console.log('\nExisting users:')
    allUsers.forEach(u => console.log(' -', u.email || u.phone, u._id))

    // Output test credentials
    console.log('\n=== Test Credentials ===')
    console.log('Email:', testEmail)
    console.log('Password:', testPassword)
    console.log('User ID:', user._id)
    console.log('Project ID:', project._id)

  } catch (error: unknown) {
    console.error('Error:', error instanceof Error ? error.message : String(error))
  } finally {
    await mongoose.disconnect()
    console.log('\nDone')
  }
}

createTestUser()
