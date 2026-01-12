import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import bcrypt from 'bcryptjs'
import { verify } from 'jsonwebtoken'
import dbConnect from '@/lib/db/connection'
import User from '@/lib/db/models/user'

export const authOptions: NextAuthOptions = {
  providers: [
    // 邮箱密码登录
    CredentialsProvider({
      id: 'email-password',
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('请输入邮箱和密码')
        }

        await dbConnect()

        const user = await User.findOne({ email: credentials.email })

        if (!user || !user.password) {
          throw new Error('邮箱或密码错误')
        }

        const isValid = await bcrypt.compare(credentials.password, user.password)

        if (!isValid) {
          throw new Error('邮箱或密码错误')
        }

        return {
          id: user._id.toString(),
          email: user.email || undefined,
          name: user.name,
          image: user.avatar,
        }
      },
    }),
    // 手机号验证码登录
    CredentialsProvider({
      id: 'phone-code',
      name: 'Phone',
      credentials: {
        phone: { label: 'Phone', type: 'tel' },
        token: { label: 'Token', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.token) {
          throw new Error('请输入手机号')
        }

        try {
          // 验证 token
          const decoded = verify(
            credentials.token,
            process.env.NEXTAUTH_SECRET || 'fallback-secret'
          ) as { userId: string; phone: string }

          if (decoded.phone !== credentials.phone) {
            throw new Error('验证失败')
          }

          await dbConnect()

          const user = await User.findById(decoded.userId)

          if (!user) {
            throw new Error('用户不存在')
          }

          return {
            id: user._id.toString(),
            email: user.email || undefined,
            name: user.name,
            image: user.avatar,
            phone: user.phone,
          }
        } catch {
          throw new Error('验证失败，请重新获取验证码')
        }
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? [
          GitHubProvider({
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google' || account?.provider === 'github') {
        await dbConnect()

        const existingUser = await User.findOne({ email: user.email })

        if (!existingUser) {
          await User.create({
            email: user.email || undefined,
            name: user.name || undefined,
            avatar: user.image || undefined,
            providers: [{
              provider: account.provider as 'google' | 'github',
              providerId: account.providerAccountId,
            }],
          })
        }
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        // 保存手机号到 token
        if ('phone' in user && user.phone) {
          token.phone = user.phone
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        // 添加手机号到 session
        if (token.phone) {
          (session.user as { phone?: string }).phone = token.phone as string
        }
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  secret: process.env.NEXTAUTH_SECRET,
}
