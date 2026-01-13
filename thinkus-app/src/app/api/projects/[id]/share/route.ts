import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db/connect'
import { Project } from '@/lib/db/models'
import { ProjectShare } from '@/lib/db/models/project-share'
import { Types } from 'mongoose'

/**
 * GET /api/projects/[id]/share
 * 获取项目的分享列表
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params
    await connectDB()

    // Verify project ownership
    const project = await Project.findOne({
      _id: projectId,
      userId: session.user.id,
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const shares = await ProjectShare.getProjectShares(new Types.ObjectId(projectId))

    return NextResponse.json({
      success: true,
      shares,
    })
  } catch (error) {
    console.error('Failed to get shares:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/projects/[id]/share
 * 创建项目分享
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params
    await connectDB()

    // Verify project ownership
    const project = await Project.findOne({
      _id: projectId,
      userId: session.user.id,
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const body = await req.json()
    const {
      permission = 'view',
      sharedWithEmail,
      password,
      expiresIn,  // in hours
      title,
      message,
    } = body

    // Calculate expiry date
    let expiresAt: Date | undefined
    if (expiresIn) {
      expiresAt = new Date(Date.now() + expiresIn * 60 * 60 * 1000)
    }

    const share = await ProjectShare.createShare({
      projectId: new Types.ObjectId(projectId),
      userId: new Types.ObjectId(session.user.id),
      permission,
      sharedWithEmail,
      password,
      expiresAt,
      title,
      message,
    })

    // Generate share URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const shareUrl = `${baseUrl}/share/${share.shareToken}`

    return NextResponse.json({
      success: true,
      share: {
        id: share._id,
        token: share.shareToken,
        url: shareUrl,
        permission: share.permission,
        expiresAt: share.expiresAt,
        hasPassword: !!password,
      },
    })
  } catch (error) {
    console.error('Failed to create share:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/projects/[id]/share
 * 撤销分享
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(req.url)
    const shareId = searchParams.get('shareId')

    if (!shareId) {
      return NextResponse.json({ error: 'Missing shareId' }, { status: 400 })
    }

    const revoked = await ProjectShare.revokeShare(
      new Types.ObjectId(shareId),
      new Types.ObjectId(session.user.id)
    )

    if (!revoked) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to revoke share:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
