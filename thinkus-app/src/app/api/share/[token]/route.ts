import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/connect'
import { Project, Discussion, Decision, ActionItem } from '@/lib/db/models'
import { ProjectShare } from '@/lib/db/models/project-share'
import bcrypt from 'bcryptjs'

/**
 * GET /api/share/[token]
 * 获取分享的项目信息
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    await connectDB()

    const share = await ProjectShare.getByToken(token)

    if (!share) {
      return NextResponse.json(
        { error: 'Share not found or expired' },
        { status: 404 }
      )
    }

    // Check if password is required
    if (share.passwordHash) {
      return NextResponse.json({
        success: true,
        requiresPassword: true,
        title: share.title,
        message: share.message,
      })
    }

    // Increment view count
    await ProjectShare.incrementViewCount(token)

    // Get project data
    const project = await Project.findById(share.projectId)
      .select('name description status phase type complexity createdAt')
      .lean()

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get related data based on permission
    let discussions: unknown[] = []
    let decisions: unknown[] = []
    let actionItems: unknown[] = []

    if (share.permission !== 'view') {
      // Get more detailed data for higher permissions
      discussions = await Discussion.find({ projectId: share.projectId })
        .select('topic status messageCount createdAt concludedAt')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean()

      decisions = await Decision.find({ projectId: share.projectId })
        .select('title status importance createdAt')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean()

      actionItems = await ActionItem.find({ projectId: share.projectId })
        .select('title status priority dueDate')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean()
    }

    return NextResponse.json({
      success: true,
      share: {
        permission: share.permission,
        title: share.title,
        message: share.message,
        createdAt: share.createdAt,
      },
      project,
      discussions,
      decisions,
      actionItems,
    })
  } catch (error) {
    console.error('Failed to get shared project:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/share/[token]
 * 验证分享密码
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const { password } = await req.json()

    if (!password) {
      return NextResponse.json({ error: 'Password required' }, { status: 400 })
    }

    await connectDB()

    const share = await ProjectShare.findOne({
      shareToken: token,
      status: 'active',
    })

    if (!share) {
      return NextResponse.json(
        { error: 'Share not found or expired' },
        { status: 404 }
      )
    }

    // Verify password
    if (!share.passwordHash) {
      return NextResponse.json({ error: 'No password set' }, { status: 400 })
    }

    const isValid = await bcrypt.compare(password, share.passwordHash)

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    // Increment view count
    await ProjectShare.incrementViewCount(token)

    // Get project data
    const project = await Project.findById(share.projectId)
      .select('name description status phase type complexity createdAt')
      .lean()

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      verified: true,
      share: {
        permission: share.permission,
        title: share.title,
        message: share.message,
      },
      project,
    })
  } catch (error) {
    console.error('Failed to verify share password:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
