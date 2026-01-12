import mongoose, { Schema, Document, Model } from 'mongoose'
import crypto from 'crypto'

// 支持的服务类型
export type CredentialServiceType =
  | 'anthropic'
  | 'openai'
  | 'stripe'
  | 'aws'
  | 'cloudflare'
  | 'mongodb'
  | 'github'
  | 'vercel'
  | 'custom'

export interface IUserCredential extends Document {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  name: string // 用户自定义名称
  service: CredentialServiceType
  encryptedKey: string // AES-256-GCM 加密后的密钥
  iv: string // 初始化向量
  authTag: string // 认证标签
  keyPrefix: string // 密钥前缀用于显示 (如 sk-ant-...)
  keySuffix: string // 密钥后缀用于显示 (如 ...xxxx)
  lastUsedAt?: Date
  createdAt: Date
  updatedAt: Date
}

// 静态方法接口
interface IUserCredentialModel extends Model<IUserCredential> {
  createCredential(
    userId: mongoose.Types.ObjectId,
    name: string,
    service: CredentialServiceType,
    plainKey: string
  ): Promise<IUserCredential>
  getUserCredentials(userId: mongoose.Types.ObjectId): Promise<IUserCredential[]>
  getDecryptedKey(credentialId: mongoose.Types.ObjectId, userId: mongoose.Types.ObjectId): Promise<string | null>
  deleteCredential(credentialId: mongoose.Types.ObjectId, userId: mongoose.Types.ObjectId): Promise<boolean>
  updateLastUsed(credentialId: mongoose.Types.ObjectId): Promise<void>
}

const UserCredentialSchema = new Schema<IUserCredential>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    service: {
      type: String,
      enum: ['anthropic', 'openai', 'stripe', 'aws', 'cloudflare', 'mongodb', 'github', 'vercel', 'custom'],
      required: true,
    },
    encryptedKey: {
      type: String,
      required: true,
    },
    iv: {
      type: String,
      required: true,
    },
    authTag: {
      type: String,
      required: true,
    },
    keyPrefix: {
      type: String,
      required: true,
    },
    keySuffix: {
      type: String,
      required: true,
    },
    lastUsedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
)

// 索引
UserCredentialSchema.index({ userId: 1, service: 1 })
UserCredentialSchema.index({ userId: 1, name: 1 }, { unique: true })

// 获取加密密钥 (从环境变量)
function getEncryptionKey(): Buffer {
  const key = process.env.CREDENTIAL_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || 'fallback-32-byte-encryption-key!'
  // 确保密钥是32字节 (256位)
  return crypto.createHash('sha256').update(key).digest()
}

// 加密密钥
function encryptKey(plainKey: string): { encryptedKey: string; iv: string; authTag: string } {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

  let encrypted = cipher.update(plainKey, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()

  return {
    encryptedKey: encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  }
}

// 解密密钥
function decryptKey(encryptedKey: string, iv: string, authTag: string): string {
  const key = getEncryptionKey()
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'))
  decipher.setAuthTag(Buffer.from(authTag, 'hex'))

  let decrypted = decipher.update(encryptedKey, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

// 静态方法: 创建凭证
UserCredentialSchema.statics.createCredential = async function (
  userId: mongoose.Types.ObjectId,
  name: string,
  service: CredentialServiceType,
  plainKey: string
): Promise<IUserCredential> {
  // 检查是否已存在同名凭证
  const existing = await this.findOne({ userId, name })
  if (existing) {
    throw new Error('已存在同名凭证')
  }

  // 加密密钥
  const { encryptedKey, iv, authTag } = encryptKey(plainKey)

  // 生成前缀和后缀用于显示
  const keyPrefix = plainKey.length > 15 ? plainKey.slice(0, 15) : plainKey.slice(0, Math.floor(plainKey.length / 2))
  const keySuffix = plainKey.length > 4 ? plainKey.slice(-4) : ''

  // 创建凭证
  const credential = await this.create({
    userId,
    name,
    service,
    encryptedKey,
    iv,
    authTag,
    keyPrefix,
    keySuffix,
  })

  return credential
}

// 静态方法: 获取用户所有凭证 (不包含解密后的密钥)
UserCredentialSchema.statics.getUserCredentials = async function (
  userId: mongoose.Types.ObjectId
): Promise<IUserCredential[]> {
  return this.find({ userId }).sort({ createdAt: -1 }).lean()
}

// 静态方法: 获取解密后的密钥
UserCredentialSchema.statics.getDecryptedKey = async function (
  credentialId: mongoose.Types.ObjectId,
  userId: mongoose.Types.ObjectId
): Promise<string | null> {
  const credential = await this.findOne({ _id: credentialId, userId })
  if (!credential) {
    return null
  }

  try {
    return decryptKey(credential.encryptedKey, credential.iv, credential.authTag)
  } catch {
    console.error('Failed to decrypt credential')
    return null
  }
}

// 静态方法: 删除凭证
UserCredentialSchema.statics.deleteCredential = async function (
  credentialId: mongoose.Types.ObjectId,
  userId: mongoose.Types.ObjectId
): Promise<boolean> {
  const result = await this.deleteOne({ _id: credentialId, userId })
  return result.deletedCount > 0
}

// 静态方法: 更新最后使用时间
UserCredentialSchema.statics.updateLastUsed = async function (
  credentialId: mongoose.Types.ObjectId
): Promise<void> {
  await this.updateOne({ _id: credentialId }, { $set: { lastUsedAt: new Date() } })
}

export const UserCredential: IUserCredentialModel =
  (mongoose.models.UserCredential as IUserCredentialModel) ||
  mongoose.model<IUserCredential, IUserCredentialModel>('UserCredential', UserCredentialSchema)
