import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db/connect'
import Project from '@/lib/db/models/project'
import { Discussion, Decision, ActionItem } from '@/lib/db/models'
import { Types } from 'mongoose'

interface SearchResult {
  id: string
  type: 'project' | 'discussion' | 'decision' | 'action'
  title: string
  description?: string
  href: string
  projectId?: string
  projectName?: string
  status?: string
  createdAt: Date
}

/**
 * GET /api/search
 * 全局搜索 API
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')?.trim()
    const type = searchParams.get('type') // project, discussion, decision, action, all
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        results: [],
        message: 'Query must be at least 2 characters',
      })
    }

    const userId = new Types.ObjectId(session.user.id)
    const searchRegex = new RegExp(query, 'i')
    const results: SearchResult[] = []

    // 并行搜索各类数据
    const searchPromises: Promise<void>[] = []

    // 搜索项目
    if (!type || type === 'all' || type === 'project') {
      searchPromises.push(
        Project.find({
          userId,
          $or: [
            { name: searchRegex },
            { 'requirement.original': searchRegex },
            { description: searchRegex },
          ],
        })
          .sort({ updatedAt: -1 })
          .limit(limit)
          .select('name requirement.original status createdAt')
          .lean()
          .then((projects) => {
            for (const project of projects) {
              results.push({
                id: project._id.toString(),
                type: 'project',
                title: project.name,
                description: project.requirement?.original?.substring(0, 100),
                href: `/projects/${project._id}`,
                status: project.status,
                createdAt: project.createdAt,
              })
            }
          })
      )
    }

    // 搜索讨论
    if (!type || type === 'all' || type === 'discussion') {
      searchPromises.push(
        Discussion.find({
          userId,
          $or: [
            { topic: searchRegex },
            { summary: searchRegex },
          ],
        })
          .sort({ updatedAt: -1 })
          .limit(limit)
          .select('topic summary projectId status createdAt')
          .populate('projectId', 'name')
          .lean()
          .then((discussions) => {
            for (const discussion of discussions) {
              const project = discussion.projectId as unknown as { _id: Types.ObjectId; name: string } | null
              results.push({
                id: discussion._id.toString(),
                type: 'discussion',
                title: discussion.topic,
                description: discussion.summary?.substring(0, 100),
                href: project
                  ? `/projects/${project._id}/discuss`
                  : `/discussions/${discussion._id}`,
                projectId: project?._id?.toString(),
                projectName: project?.name,
                status: discussion.status,
                createdAt: discussion.createdAt,
              })
            }
          })
      )
    }

    // 搜索决策
    if (!type || type === 'all' || type === 'decision') {
      searchPromises.push(
        Decision.find({
          userId,
          $or: [
            { title: searchRegex },
            { description: searchRegex },
            { rationale: searchRegex },
          ],
        })
          .sort({ updatedAt: -1 })
          .limit(limit)
          .select('title description projectId status createdAt')
          .populate('projectId', 'name')
          .lean()
          .then((decisions) => {
            for (const decision of decisions) {
              const project = decision.projectId as unknown as { _id: Types.ObjectId; name: string } | null
              results.push({
                id: decision._id.toString(),
                type: 'decision',
                title: decision.title,
                description: decision.description?.substring(0, 100),
                href: project
                  ? `/projects/${project._id}/decisions`
                  : `/ceo`,
                projectId: project?._id?.toString(),
                projectName: project?.name,
                status: decision.status,
                createdAt: decision.createdAt,
              })
            }
          })
      )
    }

    // 搜索行动项
    if (!type || type === 'all' || type === 'action') {
      searchPromises.push(
        ActionItem.find({
          userId,
          $or: [
            { title: searchRegex },
            { description: searchRegex },
          ],
        })
          .sort({ updatedAt: -1 })
          .limit(limit)
          .select('title description projectId status priority createdAt')
          .populate('projectId', 'name')
          .lean()
          .then((actions) => {
            for (const action of actions) {
              const project = action.projectId as unknown as { _id: Types.ObjectId; name: string } | null
              results.push({
                id: action._id.toString(),
                type: 'action',
                title: action.title,
                description: action.description?.substring(0, 100),
                href: project
                  ? `/projects/${project._id}/actions`
                  : `/actions`,
                projectId: project?._id?.toString(),
                projectName: project?.name,
                status: action.status,
                createdAt: action.createdAt,
              })
            }
          })
      )
    }

    await Promise.all(searchPromises)

    // 按创建时间排序并限制总数
    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    const limitedResults = results.slice(0, limit)

    return NextResponse.json({
      success: true,
      results: limitedResults,
      total: results.length,
      query,
    })
  } catch (error) {
    console.error('Search failed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
