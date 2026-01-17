/**
 * 分阶段用户引导系统
 *
 * 根据用户使用阶段提供针对性的引导，防止用户卡住后放弃
 * 解决"用户可能卡在某个功能上就放弃了"的问题
 */

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 用户使用阶段
 */
export type UserPhase =
  | 'onboarding'        // 初次接触（Day 1）
  | 'exploring'         // 探索期（Day 1-3）
  | 'learning'          // 学习期（Day 3-7）
  | 'practicing'        // 实践期（Week 2）
  | 'advancing'         // 进阶期（Week 3-4）
  | 'mastering'         // 精通期（Month 2+）
  | 'champion'          // 专家期

/**
 * 引导任务
 */
export interface GuideTask {
  id: string
  phase: UserPhase
  title: string
  description: string
  /** 详细说明（支持Markdown） */
  detailedGuide?: string
  /** 预估完成时间（分钟） */
  estimatedMinutes: number
  /** 完成条件 */
  completionCriteria: CompletionCriteria
  /** 奖励 */
  reward?: {
    type: 'badge' | 'feature_unlock' | 'points' | 'celebration'
    value: string
    description: string
  }
  /** 帮助资源 */
  helpResources?: Array<{
    type: 'video' | 'article' | 'faq' | 'live_chat'
    title: string
    url?: string
  }>
  /** 是否必须完成才能进入下一阶段 */
  required: boolean
  /** 显示顺序 */
  order: number
}

/**
 * 完成条件
 */
export interface CompletionCriteria {
  type: 'action' | 'count' | 'duration' | 'custom'
  /** 需要完成的动作 */
  action?: string
  /** 需要达到的数量 */
  targetCount?: number
  /** 需要持续的时间（秒） */
  targetDuration?: number
  /** 自定义检查函数 */
  customCheck?: string
}

/**
 * 用户进度
 */
export interface UserProgress {
  userId: string
  projectId: string
  currentPhase: UserPhase
  /** 阶段开始时间 */
  phaseStartedAt: Date
  /** 已完成的任务 */
  completedTasks: Array<{
    taskId: string
    completedAt: Date
    timeSpent: number  // 分钟
  }>
  /** 当前进行中的任务 */
  currentTaskId?: string
  /** 卡住检测 */
  stuckDetection: {
    lastActivityAt: Date
    stuckOnTaskId?: string
    stuckDuration?: number  // 分钟
    interventionsSent: number
  }
  /** 总体进度 (0-100) */
  overallProgress: number
  /** 获得的徽章 */
  earnedBadges: string[]
  /** 解锁的功能 */
  unlockedFeatures: string[]
}

/**
 * 阶段配置
 */
export interface PhaseConfig {
  phase: UserPhase
  name: string
  description: string
  icon: string
  /** 阶段目标 */
  goals: string[]
  /** 进入条件 */
  entryRequirements?: {
    tasksCompleted?: number
    daysActive?: number
    previousPhase?: UserPhase
  }
  /** 阶段持续时间建议（天） */
  suggestedDays: number
  /** 卡住阈值（分钟） - 超过此时间未活动视为卡住 */
  stuckThresholdMinutes: number
}

/**
 * 干预消息
 */
export interface InterventionMessage {
  type: 'encouragement' | 'help_offer' | 'tip' | 'milestone' | 'check_in'
  title: string
  content: string
  action?: {
    label: string
    type: 'link' | 'task' | 'chat' | 'video'
    value: string
  }
}

// ============================================================================
// 阶段配置
// ============================================================================

const PHASE_CONFIGS: PhaseConfig[] = [
  {
    phase: 'onboarding',
    name: '初次接触',
    description: '欢迎来到您的新产品！让我们一起快速熟悉',
    icon: '🎉',
    goals: [
      '成功登录系统',
      '了解主要功能入口',
      '完成基本设置',
    ],
    suggestedDays: 1,
    stuckThresholdMinutes: 10,
  },
  {
    phase: 'exploring',
    name: '探索期',
    description: '四处看看，了解您的产品能做什么',
    icon: '🔍',
    goals: [
      '浏览所有主要页面',
      '了解核心功能',
      '尝试基本操作',
    ],
    entryRequirements: {
      previousPhase: 'onboarding',
      tasksCompleted: 3,
    },
    suggestedDays: 3,
    stuckThresholdMinutes: 15,
  },
  {
    phase: 'learning',
    name: '学习期',
    description: '动手实践，掌握核心功能',
    icon: '📚',
    goals: [
      '创建第一条数据',
      '完成一个完整流程',
      '理解数据如何流转',
    ],
    entryRequirements: {
      previousPhase: 'exploring',
      tasksCompleted: 5,
    },
    suggestedDays: 4,
    stuckThresholdMinutes: 20,
  },
  {
    phase: 'practicing',
    name: '实践期',
    description: '开始正式使用，建立工作习惯',
    icon: '💪',
    goals: [
      '连续使用3天',
      '完成日常工作流程',
      '解决实际问题',
    ],
    entryRequirements: {
      previousPhase: 'learning',
      tasksCompleted: 8,
      daysActive: 5,
    },
    suggestedDays: 7,
    stuckThresholdMinutes: 30,
  },
  {
    phase: 'advancing',
    name: '进阶期',
    description: '探索高级功能，提升使用效率',
    icon: '🚀',
    goals: [
      '使用高级功能',
      '自定义配置',
      '提高工作效率',
    ],
    entryRequirements: {
      previousPhase: 'practicing',
      daysActive: 14,
    },
    suggestedDays: 14,
    stuckThresholdMinutes: 60,
  },
  {
    phase: 'mastering',
    name: '精通期',
    description: '您已经很熟练了，继续探索更多可能',
    icon: '⭐',
    goals: [
      '熟练使用所有功能',
      '建立最佳实践',
      '分享使用经验',
    ],
    entryRequirements: {
      previousPhase: 'advancing',
      daysActive: 30,
    },
    suggestedDays: 30,
    stuckThresholdMinutes: 120,
  },
  {
    phase: 'champion',
    name: '专家',
    description: '您是产品专家！感谢您的支持',
    icon: '🏆',
    goals: [
      '帮助其他用户',
      '提供产品建议',
      '成为社区贡献者',
    ],
    entryRequirements: {
      previousPhase: 'mastering',
      daysActive: 60,
    },
    suggestedDays: 0,  // 无限期
    stuckThresholdMinutes: 0,  // 不检测
  },
]

// ============================================================================
// 默认引导任务
// ============================================================================

const DEFAULT_TASKS: GuideTask[] = [
  // Onboarding 阶段
  {
    id: 'first_login',
    phase: 'onboarding',
    title: '首次登录',
    description: '使用您的账号登录系统',
    estimatedMinutes: 2,
    completionCriteria: { type: 'action', action: 'login' },
    reward: { type: 'celebration', value: 'welcome', description: '🎉 欢迎加入！' },
    required: true,
    order: 1,
  },
  {
    id: 'view_dashboard',
    phase: 'onboarding',
    title: '查看仪表盘',
    description: '了解您的控制中心',
    detailedGuide: '仪表盘是您的控制中心，在这里您可以看到:\n- 整体数据概览\n- 最近的活动\n- 快捷操作入口',
    estimatedMinutes: 3,
    completionCriteria: { type: 'action', action: 'view_dashboard' },
    helpResources: [
      { type: 'video', title: '仪表盘介绍视频', url: '/help/videos/dashboard' },
    ],
    required: true,
    order: 2,
  },
  {
    id: 'complete_profile',
    phase: 'onboarding',
    title: '完善个人信息',
    description: '填写您的基本信息',
    estimatedMinutes: 5,
    completionCriteria: { type: 'action', action: 'complete_profile' },
    reward: { type: 'badge', value: 'profile_complete', description: '🎯 信息完善' },
    required: false,
    order: 3,
  },

  // Exploring 阶段
  {
    id: 'browse_main_features',
    phase: 'exploring',
    title: '浏览主要功能',
    description: '点击左侧菜单，看看都有什么功能',
    detailedGuide: '花2-3分钟浏览一下所有菜单项，了解系统提供了哪些功能。不需要深入了解每个功能，只需要知道它们在哪里。',
    estimatedMinutes: 5,
    completionCriteria: { type: 'count', action: 'page_view', targetCount: 5 },
    required: true,
    order: 1,
  },
  {
    id: 'view_settings',
    phase: 'exploring',
    title: '查看设置选项',
    description: '了解您可以自定义哪些内容',
    estimatedMinutes: 3,
    completionCriteria: { type: 'action', action: 'view_settings' },
    required: false,
    order: 2,
  },
  {
    id: 'find_help',
    phase: 'exploring',
    title: '找到帮助入口',
    description: '知道在哪里获取帮助',
    detailedGuide: '当您遇到问题时，可以通过以下方式获取帮助:\n1. 点击右下角的帮助按钮\n2. 查看帮助文档\n3. 联系在线客服',
    estimatedMinutes: 2,
    completionCriteria: { type: 'action', action: 'view_help' },
    reward: { type: 'badge', value: 'help_found', description: '🔍 探索者' },
    required: true,
    order: 3,
  },

  // Learning 阶段
  {
    id: 'create_first_item',
    phase: 'learning',
    title: '创建第一条数据',
    description: '动手试试，创建您的第一条记录',
    detailedGuide: '让我们来创建第一条数据！\n\n步骤：\n1. 点击"新建"按钮\n2. 填写必要信息\n3. 点击保存\n\n不用担心填错，您可以随时修改或删除。',
    estimatedMinutes: 5,
    completionCriteria: { type: 'action', action: 'create_item' },
    reward: { type: 'celebration', value: 'first_creation', description: '🎊 太棒了！您创建了第一条数据！' },
    helpResources: [
      { type: 'video', title: '如何创建数据', url: '/help/videos/create' },
      { type: 'faq', title: '常见问题' },
    ],
    required: true,
    order: 1,
  },
  {
    id: 'edit_item',
    phase: 'learning',
    title: '编辑数据',
    description: '尝试修改您创建的数据',
    estimatedMinutes: 3,
    completionCriteria: { type: 'action', action: 'edit_item' },
    required: true,
    order: 2,
  },
  {
    id: 'complete_workflow',
    phase: 'learning',
    title: '完成一个流程',
    description: '从头到尾走完一个完整的业务流程',
    estimatedMinutes: 10,
    completionCriteria: { type: 'action', action: 'complete_workflow' },
    reward: { type: 'badge', value: 'workflow_master', description: '📋 流程达人' },
    required: true,
    order: 3,
  },

  // Practicing 阶段
  {
    id: 'three_day_streak',
    phase: 'practicing',
    title: '连续使用3天',
    description: '养成使用习惯',
    estimatedMinutes: 0,
    completionCriteria: { type: 'duration', targetDuration: 3 * 24 * 60 * 60 },
    reward: { type: 'badge', value: 'streak_3', description: '🔥 3天连续' },
    required: true,
    order: 1,
  },
  {
    id: 'create_multiple_items',
    phase: 'practicing',
    title: '创建10条数据',
    description: '通过练习熟悉操作',
    estimatedMinutes: 30,
    completionCriteria: { type: 'count', action: 'create_item', targetCount: 10 },
    reward: { type: 'badge', value: 'creator_10', description: '✨ 创作达人' },
    required: false,
    order: 2,
  },

  // Advancing 阶段
  {
    id: 'use_advanced_feature',
    phase: 'advancing',
    title: '使用高级功能',
    description: '探索更强大的功能',
    detailedGuide: '您已经掌握了基础功能，现在让我们来看看高级功能：\n- 批量操作\n- 数据导入导出\n- 自动化规则\n- 高级筛选',
    estimatedMinutes: 15,
    completionCriteria: { type: 'action', action: 'use_advanced_feature' },
    reward: { type: 'feature_unlock', value: 'advanced_features', description: '🔓 高级功能解锁' },
    required: true,
    order: 1,
  },
  {
    id: 'customize_settings',
    phase: 'advancing',
    title: '自定义配置',
    description: '根据您的需要调整系统设置',
    estimatedMinutes: 10,
    completionCriteria: { type: 'action', action: 'customize_settings' },
    required: false,
    order: 2,
  },

  // Mastering 阶段
  {
    id: 'seven_day_streak',
    phase: 'mastering',
    title: '连续使用7天',
    description: '您已经是资深用户了',
    estimatedMinutes: 0,
    completionCriteria: { type: 'duration', targetDuration: 7 * 24 * 60 * 60 },
    reward: { type: 'badge', value: 'streak_7', description: '🔥🔥 7天连续' },
    required: true,
    order: 1,
  },
  {
    id: 'invite_team',
    phase: 'mastering',
    title: '邀请团队成员',
    description: '让更多人一起使用',
    estimatedMinutes: 5,
    completionCriteria: { type: 'action', action: 'invite_member' },
    reward: { type: 'badge', value: 'team_builder', description: '👥 团队建设者' },
    required: false,
    order: 2,
  },
]

// ============================================================================
// 干预消息模板
// ============================================================================

const INTERVENTION_TEMPLATES: Record<string, InterventionMessage[]> = {
  stuck_on_first_login: [
    {
      type: 'help_offer',
      title: '需要帮助吗？',
      content: '看起来您在登录时遇到了问题。请检查您的账号和密码是否正确，或者点击下方重置密码。',
      action: { label: '重置密码', type: 'link', value: '/reset-password' },
    },
  ],
  stuck_on_create: [
    {
      type: 'tip',
      title: '创建数据小技巧',
      content: '第一次创建数据可能会有些犹豫，别担心！您可以先随便填写试试，之后可以随时修改或删除。',
      action: { label: '查看教程', type: 'video', value: '/help/videos/create' },
    },
    {
      type: 'help_offer',
      title: '需要指导吗？',
      content: '如果您不确定该填什么，可以联系我们的客服，我们很乐意帮助您。',
      action: { label: '联系客服', type: 'chat', value: 'support' },
    },
  ],
  general_stuck: [
    {
      type: 'encouragement',
      title: '您做得很好！',
      content: '学习新系统需要时间，别着急。有任何问题随时可以寻求帮助。',
    },
    {
      type: 'check_in',
      title: '一切顺利吗？',
      content: '我们注意到您有一段时间没有操作了。是遇到问题了吗？还是需要休息一下？',
      action: { label: '获取帮助', type: 'chat', value: 'support' },
    },
  ],
  milestone_reached: [
    {
      type: 'milestone',
      title: '🎉 恭喜达成里程碑！',
      content: '您已经完成了一个重要的学习目标！继续保持，您做得非常棒！',
    },
  ],
  phase_complete: [
    {
      type: 'celebration',
      title: '🏆 阶段完成！',
      content: '太棒了！您已经完成了当前阶段的学习，准备好进入下一阶段了吗？',
      action: { label: '开始下一阶段', type: 'task', value: 'next_phase' },
    },
  ],
}

// ============================================================================
// 服务实现
// ============================================================================

export class PhasedUserGuideService {
  private static instance: PhasedUserGuideService

  /** 用户进度缓存 */
  private progressCache: Map<string, UserProgress> = new Map()

  /** 自定义任务 */
  private customTasks: Map<string, GuideTask[]> = new Map()

  private constructor() {}

  public static getInstance(): PhasedUserGuideService {
    if (!PhasedUserGuideService.instance) {
      PhasedUserGuideService.instance = new PhasedUserGuideService()
    }
    return PhasedUserGuideService.instance
  }

  /**
   * 获取所有阶段配置
   */
  getPhaseConfigs(): PhaseConfig[] {
    return [...PHASE_CONFIGS]
  }

  /**
   * 获取阶段配置
   */
  getPhaseConfig(phase: UserPhase): PhaseConfig | undefined {
    return PHASE_CONFIGS.find(c => c.phase === phase)
  }

  /**
   * 获取阶段任务
   */
  getPhaseTasks(phase: UserPhase, projectId?: string): GuideTask[] {
    let tasks = DEFAULT_TASKS.filter(t => t.phase === phase)

    // 合并自定义任务
    if (projectId) {
      const custom = this.customTasks.get(projectId)
      if (custom) {
        const customPhaseTasks = custom.filter(t => t.phase === phase)
        tasks = [...tasks, ...customPhaseTasks]
      }
    }

    return tasks.sort((a, b) => a.order - b.order)
  }

  /**
   * 初始化用户进度
   */
  initializeProgress(userId: string, projectId: string): UserProgress {
    const key = `${userId}-${projectId}`

    const progress: UserProgress = {
      userId,
      projectId,
      currentPhase: 'onboarding',
      phaseStartedAt: new Date(),
      completedTasks: [],
      stuckDetection: {
        lastActivityAt: new Date(),
        interventionsSent: 0,
      },
      overallProgress: 0,
      earnedBadges: [],
      unlockedFeatures: [],
    }

    this.progressCache.set(key, progress)
    return progress
  }

  /**
   * 获取用户进度
   */
  getProgress(userId: string, projectId: string): UserProgress | null {
    const key = `${userId}-${projectId}`
    return this.progressCache.get(key) || null
  }

  /**
   * 记录用户活动
   */
  recordActivity(userId: string, projectId: string, action: string): void {
    const progress = this.getProgress(userId, projectId)
    if (!progress) return

    progress.stuckDetection.lastActivityAt = new Date()

    // 检查是否完成了任务
    this.checkTaskCompletion(progress, action)
  }

  /**
   * 完成任务
   */
  completeTask(userId: string, projectId: string, taskId: string): {
    completed: boolean
    reward?: GuideTask['reward']
    nextTask?: GuideTask
    phaseComplete?: boolean
    newPhase?: UserPhase
  } {
    const progress = this.getProgress(userId, projectId)
    if (!progress) {
      return { completed: false }
    }

    // 检查任务是否存在
    const task = this.findTask(taskId, projectId)
    if (!task) {
      return { completed: false }
    }

    // 检查是否已完成
    if (progress.completedTasks.some(t => t.taskId === taskId)) {
      return { completed: false }
    }

    // 标记完成
    progress.completedTasks.push({
      taskId,
      completedAt: new Date(),
      timeSpent: this.calculateTimeSpent(progress),
    })

    // 处理奖励
    if (task.reward) {
      if (task.reward.type === 'badge') {
        progress.earnedBadges.push(task.reward.value)
      } else if (task.reward.type === 'feature_unlock') {
        progress.unlockedFeatures.push(task.reward.value)
      }
    }

    // 更新总体进度
    progress.overallProgress = this.calculateOverallProgress(progress, projectId)

    // 检查是否完成当前阶段
    const phaseComplete = this.isPhaseComplete(progress, projectId)
    let newPhase: UserPhase | undefined

    if (phaseComplete) {
      newPhase = this.advancePhase(progress)
    }

    // 获取下一个任务
    const nextTask = this.getNextTask(progress, projectId)

    return {
      completed: true,
      reward: task.reward,
      nextTask,
      phaseComplete,
      newPhase,
    }
  }

  /**
   * 检查任务完成
   */
  private checkTaskCompletion(progress: UserProgress, action: string): void {
    const tasks = this.getPhaseTasks(progress.currentPhase, progress.projectId)

    for (const task of tasks) {
      if (progress.completedTasks.some(t => t.taskId === task.id)) {
        continue
      }

      if (task.completionCriteria.type === 'action' && task.completionCriteria.action === action) {
        this.completeTask(progress.userId, progress.projectId, task.id)
      }
    }
  }

  /**
   * 检测用户是否卡住
   */
  checkIfStuck(userId: string, projectId: string): {
    isStuck: boolean
    stuckDuration?: number
    intervention?: InterventionMessage
  } {
    const progress = this.getProgress(userId, projectId)
    if (!progress) {
      return { isStuck: false }
    }

    const phaseConfig = this.getPhaseConfig(progress.currentPhase)
    if (!phaseConfig || phaseConfig.stuckThresholdMinutes === 0) {
      return { isStuck: false }
    }

    const minutesSinceActivity = (Date.now() - progress.stuckDetection.lastActivityAt.getTime()) / 60000

    if (minutesSinceActivity >= phaseConfig.stuckThresholdMinutes) {
      const stuckDuration = Math.round(minutesSinceActivity)

      // 获取干预消息
      const intervention = this.getIntervention(progress, stuckDuration)

      progress.stuckDetection.stuckDuration = stuckDuration
      progress.stuckDetection.stuckOnTaskId = progress.currentTaskId

      return {
        isStuck: true,
        stuckDuration,
        intervention,
      }
    }

    return { isStuck: false }
  }

  /**
   * 获取干预消息
   */
  private getIntervention(progress: UserProgress, stuckDuration: number): InterventionMessage | undefined {
    // 根据当前任务选择干预模板
    let templates: InterventionMessage[] = INTERVENTION_TEMPLATES.general_stuck

    if (progress.currentTaskId === 'first_login') {
      templates = INTERVENTION_TEMPLATES.stuck_on_first_login
    } else if (progress.currentTaskId?.includes('create')) {
      templates = INTERVENTION_TEMPLATES.stuck_on_create
    }

    // 根据已发送的干预次数选择不同消息
    const index = Math.min(progress.stuckDetection.interventionsSent, templates.length - 1)
    progress.stuckDetection.interventionsSent++

    return templates[index]
  }

  /**
   * 获取下一个任务
   */
  getNextTask(progress: UserProgress, projectId?: string): GuideTask | undefined {
    const tasks = this.getPhaseTasks(progress.currentPhase, projectId || progress.projectId)
    const completedIds = new Set(progress.completedTasks.map(t => t.taskId))

    return tasks.find(t => !completedIds.has(t.id))
  }

  /**
   * 查找任务
   */
  private findTask(taskId: string, projectId?: string): GuideTask | undefined {
    for (const phase of PHASE_CONFIGS) {
      const tasks = this.getPhaseTasks(phase.phase, projectId)
      const task = tasks.find(t => t.id === taskId)
      if (task) return task
    }
    return undefined
  }

  /**
   * 检查阶段是否完成
   */
  private isPhaseComplete(progress: UserProgress, projectId?: string): boolean {
    const tasks = this.getPhaseTasks(progress.currentPhase, projectId || progress.projectId)
    const requiredTasks = tasks.filter(t => t.required)
    const completedIds = new Set(progress.completedTasks.map(t => t.taskId))

    return requiredTasks.every(t => completedIds.has(t.id))
  }

  /**
   * 进入下一阶段
   */
  private advancePhase(progress: UserProgress): UserPhase | undefined {
    const currentIndex = PHASE_CONFIGS.findIndex(c => c.phase === progress.currentPhase)
    if (currentIndex < 0 || currentIndex >= PHASE_CONFIGS.length - 1) {
      return undefined
    }

    const nextPhase = PHASE_CONFIGS[currentIndex + 1]

    // 检查进入条件
    if (nextPhase.entryRequirements) {
      const req = nextPhase.entryRequirements
      if (req.tasksCompleted && progress.completedTasks.length < req.tasksCompleted) {
        return undefined
      }
      if (req.previousPhase && progress.currentPhase !== req.previousPhase) {
        return undefined
      }
    }

    progress.currentPhase = nextPhase.phase
    progress.phaseStartedAt = new Date()
    progress.currentTaskId = undefined

    return nextPhase.phase
  }

  /**
   * 计算总体进度
   */
  private calculateOverallProgress(progress: UserProgress, projectId?: string): number {
    let totalTasks = 0
    let completedTasks = progress.completedTasks.length

    for (const phase of PHASE_CONFIGS) {
      const tasks = this.getPhaseTasks(phase.phase, projectId || progress.projectId)
      totalTasks += tasks.length
    }

    if (totalTasks === 0) return 0
    return Math.round((completedTasks / totalTasks) * 100)
  }

  /**
   * 计算任务耗时
   */
  private calculateTimeSpent(progress: UserProgress): number {
    const lastCompleted = progress.completedTasks[progress.completedTasks.length - 1]
    if (!lastCompleted) {
      return Math.round((Date.now() - progress.phaseStartedAt.getTime()) / 60000)
    }
    return Math.round((Date.now() - lastCompleted.completedAt.getTime()) / 60000)
  }

  /**
   * 添加自定义任务
   */
  addCustomTasks(projectId: string, tasks: GuideTask[]): void {
    const existing = this.customTasks.get(projectId) || []
    this.customTasks.set(projectId, [...existing, ...tasks])
  }

  /**
   * 生成引导进度摘要
   */
  generateProgressSummary(userId: string, projectId: string): string {
    const progress = this.getProgress(userId, projectId)
    if (!progress) return '未找到用户进度'

    const phaseConfig = this.getPhaseConfig(progress.currentPhase)
    const nextTask = this.getNextTask(progress, projectId)

    const lines = [
      `📊 学习进度：${progress.overallProgress}%`,
      `📍 当前阶段：${phaseConfig?.icon || ''} ${phaseConfig?.name || progress.currentPhase}`,
      `✅ 已完成任务：${progress.completedTasks.length}个`,
      `🏅 获得徽章：${progress.earnedBadges.length}个`,
    ]

    if (nextTask) {
      lines.push(``, `📌 下一个任务：${nextTask.title}`)
      lines.push(`   ${nextTask.description}`)
    }

    return lines.join('\n')
  }

  /**
   * 生成引导页面HTML
   */
  generateGuidePageHtml(userId: string, projectId: string): string {
    const progress = this.getProgress(userId, projectId)
    if (!progress) return '<p>未找到用户进度</p>'

    const phaseConfig = this.getPhaseConfig(progress.currentPhase)
    const tasks = this.getPhaseTasks(progress.currentPhase, projectId)
    const completedIds = new Set(progress.completedTasks.map(t => t.taskId))
    const nextTask = tasks.find(t => !completedIds.has(t.id))

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>学习进度</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; min-height: 100vh; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .phase-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 16px; text-align: center; margin-bottom: 20px; }
    .phase-icon { font-size: 48px; margin-bottom: 10px; }
    .phase-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
    .phase-desc { opacity: 0.9; }
    .progress-bar { background: rgba(255,255,255,0.3); border-radius: 10px; height: 10px; margin-top: 20px; overflow: hidden; }
    .progress-fill { background: white; height: 100%; border-radius: 10px; transition: width 0.5s; }
    .progress-text { margin-top: 10px; font-size: 14px; }
    .section { background: white; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
    .section-title { font-size: 18px; font-weight: bold; color: #333; margin-bottom: 15px; display: flex; align-items: center; gap: 8px; }
    .task-list { list-style: none; }
    .task-item { display: flex; align-items: flex-start; padding: 15px 0; border-bottom: 1px solid #eee; }
    .task-item:last-child { border-bottom: none; }
    .task-checkbox { width: 24px; height: 24px; border-radius: 50%; border: 2px solid #ddd; margin-right: 15px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .task-checkbox.completed { background: #4caf50; border-color: #4caf50; color: white; }
    .task-checkbox.current { border-color: #667eea; animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.4); } 50% { box-shadow: 0 0 0 10px rgba(102, 126, 234, 0); } }
    .task-content { flex: 1; }
    .task-title { font-weight: 500; color: #333; margin-bottom: 4px; }
    .task-desc { font-size: 14px; color: #666; }
    .task-time { font-size: 12px; color: #999; margin-top: 4px; }
    .current-task { background: linear-gradient(135deg, #667eea10 0%, #764ba210 100%); border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 2px solid #667eea; }
    .current-task h3 { color: #667eea; margin-bottom: 10px; }
    .current-task p { color: #666; margin-bottom: 15px; }
    .current-task .guide { background: #f8f9fa; padding: 15px; border-radius: 8px; color: #555; font-size: 14px; line-height: 1.6; white-space: pre-line; }
    .btn { display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; text-decoration: none; }
    .badges { display: flex; gap: 10px; flex-wrap: wrap; }
    .badge { background: #fff3cd; padding: 8px 16px; border-radius: 20px; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="phase-header">
      <div class="phase-icon">${phaseConfig?.icon || '📚'}</div>
      <div class="phase-name">${phaseConfig?.name || '学习中'}</div>
      <div class="phase-desc">${phaseConfig?.description || ''}</div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${progress.overallProgress}%"></div>
      </div>
      <div class="progress-text">总进度 ${progress.overallProgress}%</div>
    </div>

    ${nextTask ? `
      <div class="current-task">
        <h3>📌 当前任务：${nextTask.title}</h3>
        <p>${nextTask.description}</p>
        ${nextTask.detailedGuide ? `<div class="guide">${nextTask.detailedGuide}</div>` : ''}
        ${nextTask.estimatedMinutes > 0 ? `<p class="task-time">预计需要 ${nextTask.estimatedMinutes} 分钟</p>` : ''}
      </div>
    ` : ''}

    <div class="section">
      <h3 class="section-title">📋 本阶段任务</h3>
      <ul class="task-list">
        ${tasks.map(task => `
          <li class="task-item">
            <div class="task-checkbox ${completedIds.has(task.id) ? 'completed' : nextTask?.id === task.id ? 'current' : ''}">
              ${completedIds.has(task.id) ? '✓' : ''}
            </div>
            <div class="task-content">
              <div class="task-title">${task.title}</div>
              <div class="task-desc">${task.description}</div>
              ${task.estimatedMinutes > 0 ? `<div class="task-time">约 ${task.estimatedMinutes} 分钟</div>` : ''}
            </div>
          </li>
        `).join('')}
      </ul>
    </div>

    ${progress.earnedBadges.length > 0 ? `
      <div class="section">
        <h3 class="section-title">🏅 获得的徽章</h3>
        <div class="badges">
          ${progress.earnedBadges.map(badge => `<span class="badge">${badge}</span>`).join('')}
        </div>
      </div>
    ` : ''}
  </div>
</body>
</html>
    `.trim()
  }
}

// 导出单例
export const phasedUserGuide = PhasedUserGuideService.getInstance()
