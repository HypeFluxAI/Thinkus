import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IUser extends Document {
  email: string
  name: string
  avatar?: string
  password?: string
  authProvider: 'email' | 'google' | 'github'
  stats: {
    totalProjects: number
    completedProjects: number
    totalSpent: number
  }
  settings: {
    language: string
    theme: 'light' | 'dark' | 'system'
    notifications: boolean
  }
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    avatar: {
      type: String,
    },
    password: {
      type: String,
    },
    authProvider: {
      type: String,
      enum: ['email', 'google', 'github'],
      default: 'email',
    },
    stats: {
      totalProjects: { type: Number, default: 0 },
      completedProjects: { type: Number, default: 0 },
      totalSpent: { type: Number, default: 0 },
    },
    settings: {
      language: { type: String, default: 'zh-CN' },
      theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
      notifications: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
)

UserSchema.index({ email: 1 })
UserSchema.index({ createdAt: -1 })

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema)

export default User
