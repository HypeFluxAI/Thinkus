/**
 * 立即人工支持服务
 *
 * 功能：
 * - 让用户可以随时快速获得人工帮助
 * - 不需要填表格，直接连接客服
 * - 智能分配最合适的客服
 * - 提供多种联系方式
 *
 * 核心理念：
 * - 用户遇到问题时很焦虑，需要立即有人回应
 * - 第一时间响应比完美解决更重要
 * - 让用户感到被重视和被照顾
 */

// ============================================
// 类型定义
// ============================================

/** 支持渠道 */
export type SupportChannel =
  | 'chat'             // 在线聊天
  | 'phone'            // 电话
  | 'wechat'           // 微信
  | 'callback'         // 回拨
  | 'video'            // 视频

/** 紧急程度 */
export type UrgencyLevel =
  | 'low'              // 一般咨询
  | 'medium'           // 需要帮助
  | 'high'             // 紧急
  | 'critical'         // 非常紧急

/** 问题类型 */
export type IssueQuickType =
  | 'cant_access'      // 打不开
  | 'cant_login'       // 登不进去
  | 'feature_broken'   // 功能坏了
  | 'too_slow'         // 太慢了
  | 'looks_wrong'      // 显示不对
  | 'need_help'        // 不会用
  | 'other'            // 其他

/** 支持请求 */
export interface SupportRequest {
  requestId: string
  projectId: string
  projectName: string
  userId: string
  userName: string

  // 问题信息
  issueType: IssueQuickType
  urgency: UrgencyLevel
  briefDescription?: string
  screenshot?: string

  // 联系方式
  preferredChannel: SupportChannel
  contactInfo: {
    phone?: string
    wechat?: string
    email?: string
  }

  // 状态
  status: 'pending' | 'connecting' | 'connected' | 'resolved' | 'cancelled'
  createdAt: Date
  connectedAt?: Date
  resolvedAt?: Date

  // 分配
  assignedTo?: SupportAgent
  estimatedWaitTime?: number    // 秒
  queuePosition?: number
}

/** 客服代表 */
export interface SupportAgent {
  agentId: string
  name: string
  avatar?: string
  title: string                  // 如"技术支持专员"
  specialties: IssueQuickType[]
  available: boolean
  currentLoad: number            // 当前处理的请求数
  rating: number                 // 评分 1-5
}

/** 支持选项 */
export interface SupportOption {
  channel: SupportChannel
  name: string
  icon: string
  available: boolean
  waitTime?: string              // 预计等待时间
  description: string
  actionUrl?: string
  actionText?: string
}

/** 快速问题选项 */
export interface QuickIssueOption {
  type: IssueQuickType
  label: string
  icon: string
  urgency: UrgencyLevel
}

// ============================================
// 配置
// ============================================

/** 快速问题类型配置 */
const QUICK_ISSUE_OPTIONS: QuickIssueOption[] = [
  { type: 'cant_access', label: '网站打不开', icon: '🌐', urgency: 'high' },
  { type: 'cant_login', label: '登录不进去', icon: '🔑', urgency: 'high' },
  { type: 'feature_broken', label: '功能不好用', icon: '⚙️', urgency: 'medium' },
  { type: 'too_slow', label: '太慢了', icon: '🐢', urgency: 'medium' },
  { type: 'looks_wrong', label: '显示不对', icon: '👀', urgency: 'low' },
  { type: 'need_help', label: '不会用', icon: '❓', urgency: 'low' },
  { type: 'other', label: '其他问题', icon: '💬', urgency: 'low' }
]

/** 渠道配置 */
const CHANNEL_CONFIG: Record<SupportChannel, {
  name: string
  icon: string
  description: string
  availableHours: string
}> = {
  chat: {
    name: '在线聊天',
    icon: '💬',
    description: '立即与客服文字交流',
    availableHours: '7×24小时'
  },
  phone: {
    name: '电话支持',
    icon: '📞',
    description: '直接与客服通话',
    availableHours: '9:00-21:00'
  },
  wechat: {
    name: '微信客服',
    icon: '💚',
    description: '添加专属客服微信',
    availableHours: '9:00-21:00'
  },
  callback: {
    name: '电话回拨',
    icon: '📲',
    description: '留下号码，我们打给您',
    availableHours: '9:00-21:00'
  },
  video: {
    name: '视频指导',
    icon: '🎥',
    description: '远程视频协助（需预约）',
    availableHours: '工作日 10:00-18:00'
  }
}

/** 紧急程度配置 */
const URGENCY_CONFIG: Record<UrgencyLevel, {
  label: string
  color: string
  maxWaitMinutes: number
  autoEscalateMinutes: number
}> = {
  critical: {
    label: '非常紧急',
    color: '#DC2626',
    maxWaitMinutes: 2,
    autoEscalateMinutes: 5
  },
  high: {
    label: '紧急',
    color: '#F59E0B',
    maxWaitMinutes: 5,
    autoEscalateMinutes: 10
  },
  medium: {
    label: '需要帮助',
    color: '#3B82F6',
    maxWaitMinutes: 15,
    autoEscalateMinutes: 30
  },
  low: {
    label: '一般咨询',
    color: '#10B981',
    maxWaitMinutes: 30,
    autoEscalateMinutes: 60
  }
}

// ============================================
// 服务实现
// ============================================

export class ImmediateHumanSupportService {

  /**
   * 获取可用的支持选项
   */
  async getAvailableOptions(params: {
    urgency: UrgencyLevel
    currentTime?: Date
  }): Promise<SupportOption[]> {
    const { urgency, currentTime = new Date() } = params

    const hour = currentTime.getHours()
    const isWorkingHours = hour >= 9 && hour < 21
    const isBusinessDay = currentTime.getDay() >= 1 && currentTime.getDay() <= 5

    const options: SupportOption[] = [
      // 在线聊天 - 24小时可用
      {
        channel: 'chat',
        ...CHANNEL_CONFIG.chat,
        available: true,
        waitTime: urgency === 'critical' ? '立即' : '约1分钟',
        actionUrl: '/support/chat',
        actionText: '开始聊天'
      },
      // 电话 - 工作时间
      {
        channel: 'phone',
        ...CHANNEL_CONFIG.phone,
        available: isWorkingHours,
        waitTime: urgency === 'critical' ? '立即' : '约2分钟',
        actionUrl: 'tel:400-xxx-xxxx',
        actionText: '立即拨打'
      },
      // 微信
      {
        channel: 'wechat',
        ...CHANNEL_CONFIG.wechat,
        available: isWorkingHours,
        waitTime: '约5分钟',
        actionUrl: '/support/wechat',
        actionText: '添加微信'
      },
      // 回拨
      {
        channel: 'callback',
        ...CHANNEL_CONFIG.callback,
        available: isWorkingHours,
        waitTime: '约5分钟内回电',
        actionUrl: '/support/callback',
        actionText: '申请回拨'
      },
      // 视频（需预约）
      {
        channel: 'video',
        ...CHANNEL_CONFIG.video,
        available: isBusinessDay && hour >= 10 && hour < 18,
        waitTime: '需要预约',
        actionUrl: '/support/video-booking',
        actionText: '预约视频'
      }
    ]

    // 根据紧急程度排序
    if (urgency === 'critical' || urgency === 'high') {
      // 紧急情况优先显示电话和聊天
      return options.sort((a, b) => {
        const priority = { phone: 1, chat: 2, callback: 3, wechat: 4, video: 5 }
        return (priority[a.channel] || 99) - (priority[b.channel] || 99)
      })
    }

    return options
  }

  /**
   * 创建支持请求
   */
  async createRequest(params: {
    projectId: string
    projectName: string
    userId: string
    userName: string
    issueType: IssueQuickType
    preferredChannel: SupportChannel
    briefDescription?: string
    screenshot?: string
    contactInfo: { phone?: string; wechat?: string; email?: string }
  }): Promise<SupportRequest> {
    const {
      projectId,
      projectName,
      userId,
      userName,
      issueType,
      preferredChannel,
      briefDescription,
      screenshot,
      contactInfo
    } = params

    const requestId = `support_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // 根据问题类型确定紧急程度
    const urgency = this.determineUrgency(issueType)

    // 估算等待时间
    const estimatedWaitTime = this.estimateWaitTime(urgency, preferredChannel)

    // 分配客服
    const assignedAgent = await this.assignAgent(issueType, urgency)

    const request: SupportRequest = {
      requestId,
      projectId,
      projectName,
      userId,
      userName,
      issueType,
      urgency,
      briefDescription,
      screenshot,
      preferredChannel,
      contactInfo,
      status: 'pending',
      createdAt: new Date(),
      assignedTo: assignedAgent,
      estimatedWaitTime,
      queuePosition: 1
    }

    // 存储请求
    // await db.supportRequests.create(request)

    // 发送通知给客服
    // await this.notifyAgent(request)

    return request
  }

  /**
   * 快速请求支持（最简单的方式）
   */
  async quickSupport(params: {
    projectId: string
    projectName: string
    userId: string
    userName: string
    issueType: IssueQuickType
  }): Promise<{
    request: SupportRequest
    connectUrl: string
    message: string
  }> {
    // 创建请求（使用默认在线聊天）
    const request = await this.createRequest({
      ...params,
      preferredChannel: 'chat',
      contactInfo: {}
    })

    return {
      request,
      connectUrl: `/support/chat/${request.requestId}`,
      message: `正在为您连接客服，预计等待${Math.ceil(request.estimatedWaitTime! / 60)}分钟...`
    }
  }

  /**
   * 生成支持浮窗HTML
   */
  generateFloatingButtonHtml(projectId: string): string {
    return `
<!-- 客服浮窗 -->
<style>
  .support-floating-btn {
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    transition: transform 0.2s, box-shadow 0.2s;
    z-index: 9999;
  }
  .support-floating-btn:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 20px rgba(59, 130, 246, 0.5);
  }
  .support-floating-btn::after {
    content: '需要帮助？';
    position: absolute;
    right: 70px;
    background: #1F2937;
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 14px;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s;
  }
  .support-floating-btn:hover::after {
    opacity: 1;
  }
  .support-pulse {
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: #3B82F6;
    animation: supportPulse 2s infinite;
  }
  @keyframes supportPulse {
    0% { transform: scale(1); opacity: 0.4; }
    100% { transform: scale(1.5); opacity: 0; }
  }
</style>

<button class="support-floating-btn" onclick="openSupport()">
  <span class="support-pulse"></span>
  💬
</button>

<script>
  function openSupport() {
    window.open('/support/quick?projectId=${projectId}', 'support', 'width=400,height=600');
  }
</script>`
  }

  /**
   * 生成支持请求页面HTML
   */
  generateSupportPageHtml(params: {
    projectId: string
    projectName: string
    userName: string
  }): string {
    const { projectId, projectName, userName } = params

    const issueOptionsHtml = QUICK_ISSUE_OPTIONS.map(opt => `
      <button class="issue-btn" data-type="${opt.type}" data-urgency="${opt.urgency}">
        <span class="issue-icon">${opt.icon}</span>
        <span class="issue-label">${opt.label}</span>
      </button>
    `).join('')

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>获取帮助 - ${projectName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #F9FAFB;
      min-height: 100vh;
    }

    .header {
      background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
      color: white;
      padding: 32px 24px;
      text-align: center;
    }
    .header-icon { font-size: 48px; margin-bottom: 12px; }
    .header-title { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
    .header-subtitle { font-size: 14px; opacity: 0.9; }

    .container { padding: 24px; max-width: 500px; margin: 0 auto; }

    .section {
      background: white;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 16px;
    }

    /* 问题类型选择 */
    .issue-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
    .issue-btn {
      background: #F9FAFB;
      border: 2px solid #E5E7EB;
      border-radius: 12px;
      padding: 16px;
      cursor: pointer;
      text-align: center;
      transition: all 0.2s;
    }
    .issue-btn:hover {
      border-color: #3B82F6;
      background: #EFF6FF;
    }
    .issue-btn.selected {
      border-color: #3B82F6;
      background: #DBEAFE;
    }
    .issue-icon { font-size: 24px; display: block; margin-bottom: 8px; }
    .issue-label { font-size: 14px; color: #374151; }

    /* 渠道选择 */
    .channel-list { display: flex; flex-direction: column; gap: 12px; }
    .channel-btn {
      display: flex;
      align-items: center;
      gap: 16px;
      background: white;
      border: 2px solid #E5E7EB;
      border-radius: 12px;
      padding: 16px;
      cursor: pointer;
      text-align: left;
      transition: all 0.2s;
    }
    .channel-btn:hover:not(:disabled) {
      border-color: #3B82F6;
    }
    .channel-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .channel-btn.selected {
      border-color: #3B82F6;
      background: #EFF6FF;
    }
    .channel-icon { font-size: 32px; }
    .channel-info { flex: 1; }
    .channel-name { font-size: 16px; font-weight: 600; color: #1F2937; }
    .channel-desc { font-size: 13px; color: #6B7280; }
    .channel-wait {
      font-size: 12px;
      color: #10B981;
      background: #ECFDF5;
      padding: 4px 8px;
      border-radius: 4px;
    }

    /* 提交按钮 */
    .submit-btn {
      width: 100%;
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
      color: white;
      border: none;
      border-radius: 12px;
      padding: 18px;
      font-size: 18px;
      font-weight: 700;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .submit-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.4);
    }
    .submit-btn:disabled {
      background: #9CA3AF;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    /* 备注输入 */
    .note-input {
      width: 100%;
      border: 2px solid #E5E7EB;
      border-radius: 12px;
      padding: 16px;
      font-size: 15px;
      resize: none;
      height: 80px;
      margin-bottom: 16px;
    }
    .note-input:focus {
      outline: none;
      border-color: #3B82F6;
    }

    /* 加载状态 */
    .loading-overlay {
      display: none;
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(255,255,255,0.9);
      z-index: 100;
      align-items: center;
      justify-content: center;
      flex-direction: column;
    }
    .loading-overlay.show { display: flex; }
    .loading-spinner {
      width: 48px;
      height: 48px;
      border: 4px solid #E5E7EB;
      border-top-color: #3B82F6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 16px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .loading-text { font-size: 16px; color: #374151; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-icon">🆘</div>
    <h1 class="header-title">需要帮助？</h1>
    <p class="header-subtitle">${userName}，我们随时为您服务</p>
  </div>

  <div class="container">
    <!-- 选择问题类型 -->
    <div class="section">
      <div class="section-title">您遇到了什么问题？</div>
      <div class="issue-grid">
        ${issueOptionsHtml}
      </div>
    </div>

    <!-- 选择联系方式 -->
    <div class="section" id="channelSection" style="display:none;">
      <div class="section-title">选择联系方式</div>
      <div class="channel-list" id="channelList">
        <!-- 动态生成 -->
      </div>
    </div>

    <!-- 补充说明 -->
    <div class="section" id="noteSection" style="display:none;">
      <div class="section-title">简单描述一下（可选）</div>
      <textarea class="note-input" id="noteInput" placeholder="比如：点击xx按钮没反应"></textarea>
      <button class="submit-btn" id="submitBtn" disabled>获取帮助</button>
    </div>
  </div>

  <!-- 加载状态 -->
  <div class="loading-overlay" id="loadingOverlay">
    <div class="loading-spinner"></div>
    <div class="loading-text">正在为您连接客服...</div>
  </div>

  <script>
    let selectedIssue = null;
    let selectedChannel = null;

    // 选择问题类型
    document.querySelectorAll('.issue-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.issue-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedIssue = {
          type: btn.dataset.type,
          urgency: btn.dataset.urgency
        };
        showChannels(selectedIssue.urgency);
      });
    });

    // 显示渠道选项
    function showChannels(urgency) {
      document.getElementById('channelSection').style.display = 'block';
      // 这里应该调用API获取可用渠道
      const channels = [
        { channel: 'chat', name: '在线聊天', icon: '💬', desc: '立即与客服文字交流', wait: '立即', available: true },
        { channel: 'phone', name: '电话支持', icon: '📞', desc: '直接与客服通话', wait: '约2分钟', available: true },
        { channel: 'callback', name: '电话回拨', icon: '📲', desc: '我们打给您', wait: '约5分钟', available: true }
      ];

      document.getElementById('channelList').innerHTML = channels.map(ch => \`
        <button class="channel-btn" data-channel="\${ch.channel}" \${ch.available ? '' : 'disabled'}>
          <span class="channel-icon">\${ch.icon}</span>
          <div class="channel-info">
            <div class="channel-name">\${ch.name}</div>
            <div class="channel-desc">\${ch.desc}</div>
          </div>
          <span class="channel-wait">\${ch.wait}</span>
        </button>
      \`).join('');

      // 绑定渠道点击事件
      document.querySelectorAll('.channel-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.channel-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          selectedChannel = btn.dataset.channel;
          document.getElementById('noteSection').style.display = 'block';
          document.getElementById('submitBtn').disabled = false;
        });
      });
    }

    // 提交
    document.getElementById('submitBtn').addEventListener('click', async () => {
      if (!selectedIssue || !selectedChannel) return;

      document.getElementById('loadingOverlay').classList.add('show');

      // 调用API创建支持请求
      const response = await fetch('/api/support/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: '${projectId}',
          issueType: selectedIssue.type,
          preferredChannel: selectedChannel,
          briefDescription: document.getElementById('noteInput').value
        })
      });

      const result = await response.json();

      // 跳转到聊天页面
      window.location.href = result.connectUrl;
    });
  </script>
</body>
</html>`
  }

  // ============================================
  // 私有方法
  // ============================================

  private determineUrgency(issueType: IssueQuickType): UrgencyLevel {
    const option = QUICK_ISSUE_OPTIONS.find(o => o.type === issueType)
    return option?.urgency || 'medium'
  }

  private estimateWaitTime(urgency: UrgencyLevel, channel: SupportChannel): number {
    const baseWait = URGENCY_CONFIG[urgency].maxWaitMinutes * 60

    // 不同渠道的等待时间系数
    const channelMultiplier: Record<SupportChannel, number> = {
      chat: 0.5,
      phone: 1,
      callback: 1.5,
      wechat: 2,
      video: 5
    }

    return Math.round(baseWait * (channelMultiplier[channel] || 1))
  }

  private async assignAgent(
    issueType: IssueQuickType,
    urgency: UrgencyLevel
  ): Promise<SupportAgent | undefined> {
    // 这里应该从数据库查询可用客服
    // 并根据专业领域和当前负载分配

    // 模拟返回
    return {
      agentId: 'agent_001',
      name: '小李',
      title: '技术支持专员',
      specialties: ['cant_access', 'cant_login', 'feature_broken'],
      available: true,
      currentLoad: 2,
      rating: 4.8
    }
  }
}

// ============================================
// 导出单例
// ============================================

export const immediateHumanSupport = new ImmediateHumanSupportService()
