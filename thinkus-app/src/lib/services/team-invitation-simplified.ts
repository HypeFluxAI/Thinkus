/**
 * 简化邀请服务
 *
 * 功能：
 * - 一键邀请团队成员
 * - 支持多种邀请方式（链接/邮件/二维码）
 * - 角色预设和权限说明
 */

// ============================================
// 类型定义
// ============================================

export type TeamRole =
  | 'owner'           // 所有者
  | 'admin'           // 管理员
  | 'editor'          // 编辑
  | 'viewer'          // 查看者
  | 'support'         // 客服

export type InviteMethod = 'link' | 'email' | 'qrcode' | 'wechat' | 'sms'

export interface TeamMember {
  id: string
  name: string
  email: string
  phone?: string
  avatar?: string
  role: TeamRole
  status: 'active' | 'pending' | 'disabled'
  invitedBy: string
  invitedAt: Date
  joinedAt?: Date
  lastActiveAt?: Date
}

export interface Invitation {
  id: string
  projectId: string
  role: TeamRole
  method: InviteMethod
  inviteCode: string
  inviteUrl: string
  qrCodeUrl?: string
  email?: string
  phone?: string
  message?: string
  expiresAt: Date
  maxUses: number
  usedCount: number
  status: 'active' | 'expired' | 'used' | 'cancelled'
  createdBy: string
  createdAt: Date
}

export interface InviteTemplate {
  id: string
  name: string
  description: string
  role: TeamRole
  message: string
  expirationHours: number
}

// ============================================
// 角色配置
// ============================================

const ROLE_CONFIG: Record<TeamRole, {
  label: string
  icon: string
  color: string
  description: string
  permissions: string[]
}> = {
  owner: {
    label: '所有者',
    icon: '👑',
    color: '#F59E0B',
    description: '拥有完全控制权',
    permissions: ['所有权限', '转让所有权', '删除项目']
  },
  admin: {
    label: '管理员',
    icon: '🛡️',
    color: '#6366F1',
    description: '管理项目和团队',
    permissions: ['管理成员', '管理设置', '查看数据', '编辑内容']
  },
  editor: {
    label: '编辑',
    icon: '✏️',
    color: '#10B981',
    description: '编辑和发布内容',
    permissions: ['编辑内容', '发布内容', '上传文件', '查看数据']
  },
  viewer: {
    label: '查看者',
    icon: '👁️',
    color: '#6B7280',
    description: '只能查看内容',
    permissions: ['查看内容', '查看数据']
  },
  support: {
    label: '客服',
    icon: '🎧',
    color: '#EC4899',
    description: '处理客户咨询',
    permissions: ['查看订单', '回复消息', '处理工单']
  }
}

const INVITE_METHOD_CONFIG: Record<InviteMethod, {
  label: string
  icon: string
  description: string
}> = {
  link: {
    label: '邀请链接',
    icon: '🔗',
    description: '复制链接分享给成员'
  },
  email: {
    label: '邮件邀请',
    icon: '✉️',
    description: '发送邀请邮件'
  },
  qrcode: {
    label: '二维码',
    icon: '📱',
    description: '扫码加入团队'
  },
  wechat: {
    label: '微信邀请',
    icon: '💬',
    description: '通过微信分享'
  },
  sms: {
    label: '短信邀请',
    icon: '📲',
    description: '发送短信邀请'
  }
}

const DEFAULT_TEMPLATES: InviteTemplate[] = [
  {
    id: 'template_admin',
    name: '邀请管理员',
    description: '邀请可以管理项目的管理员',
    role: 'admin',
    message: '邀请您加入我们的团队，担任管理员角色。',
    expirationHours: 72
  },
  {
    id: 'template_editor',
    name: '邀请编辑',
    description: '邀请内容编辑人员',
    role: 'editor',
    message: '邀请您加入我们的团队，一起创作内容。',
    expirationHours: 168
  },
  {
    id: 'template_viewer',
    name: '邀请查看者',
    description: '邀请只读权限成员',
    role: 'viewer',
    message: '邀请您查看我们的项目。',
    expirationHours: 168
  }
]

// ============================================
// 服务实现
// ============================================

export class TeamInvitationSimplifiedService {

  getRoleConfig(role: TeamRole) {
    return ROLE_CONFIG[role]
  }

  getAllRoles() {
    return Object.entries(ROLE_CONFIG).map(([key, config]) => ({
      id: key as TeamRole,
      ...config
    }))
  }

  getInviteMethodConfig(method: InviteMethod) {
    return INVITE_METHOD_CONFIG[method]
  }

  getTemplates(): InviteTemplate[] {
    return DEFAULT_TEMPLATES
  }

  // 生成邀请码
  private generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  // 创建邀请
  async createInvitation(params: {
    projectId: string
    role: TeamRole
    method: InviteMethod
    createdBy: string
    email?: string
    phone?: string
    message?: string
    expirationHours?: number
    maxUses?: number
  }): Promise<Invitation> {
    const inviteCode = this.generateInviteCode()
    const inviteId = `invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const invitation: Invitation = {
      id: inviteId,
      projectId: params.projectId,
      role: params.role,
      method: params.method,
      inviteCode,
      inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.thinkus.com'}/invite/${inviteCode}`,
      email: params.email,
      phone: params.phone,
      message: params.message,
      expiresAt: new Date(Date.now() + (params.expirationHours || 72) * 60 * 60 * 1000),
      maxUses: params.maxUses || 1,
      usedCount: 0,
      status: 'active',
      createdBy: params.createdBy,
      createdAt: new Date()
    }

    // 生成二维码URL
    if (params.method === 'qrcode') {
      invitation.qrCodeUrl = this.generateQRCodeUrl(invitation.inviteUrl)
    }

    // TODO: 存储到数据库

    // 如果是邮件邀请，发送邮件
    if (params.method === 'email' && params.email) {
      await this.sendInviteEmail(invitation)
    }

    // 如果是短信邀请，发送短信
    if (params.method === 'sms' && params.phone) {
      await this.sendInviteSMS(invitation)
    }

    return invitation
  }

  // 生成二维码URL
  private generateQRCodeUrl(url: string): string {
    // 使用 Google Charts API 或其他二维码服务
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`
  }

  // 发送邀请邮件
  private async sendInviteEmail(invitation: Invitation): Promise<void> {
    const roleConfig = ROLE_CONFIG[invitation.role]
    // TODO: 实际发送邮件
    console.log(`Sending invite email to ${invitation.email}`)
  }

  // 发送邀请短信
  private async sendInviteSMS(invitation: Invitation): Promise<void> {
    // TODO: 实际发送短信
    console.log(`Sending invite SMS to ${invitation.phone}`)
  }

  // 一键邀请（使用模板）
  async quickInvite(params: {
    projectId: string
    templateId: string
    createdBy: string
    email?: string
    method?: InviteMethod
  }): Promise<Invitation> {
    const template = DEFAULT_TEMPLATES.find(t => t.id === params.templateId)
    if (!template) {
      throw new Error('模板不存在')
    }

    return this.createInvitation({
      projectId: params.projectId,
      role: template.role,
      method: params.method || 'link',
      createdBy: params.createdBy,
      email: params.email,
      message: template.message,
      expirationHours: template.expirationHours
    })
  }

  // 验证邀请码
  async validateInvitation(inviteCode: string): Promise<{
    valid: boolean
    invitation?: Invitation
    error?: string
  }> {
    // TODO: 从数据库查询
    // 模拟验证
    return {
      valid: true,
      invitation: {
        id: 'test',
        projectId: 'test_project',
        role: 'editor',
        method: 'link',
        inviteCode,
        inviteUrl: `https://app.thinkus.com/invite/${inviteCode}`,
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
        maxUses: 1,
        usedCount: 0,
        status: 'active',
        createdBy: 'test_user',
        createdAt: new Date()
      }
    }
  }

  // 接受邀请
  async acceptInvitation(inviteCode: string, userId: string): Promise<TeamMember> {
    const validation = await this.validateInvitation(inviteCode)
    if (!validation.valid || !validation.invitation) {
      throw new Error(validation.error || '邀请无效')
    }

    const invitation = validation.invitation

    // TODO: 创建团队成员记录
    const member: TeamMember = {
      id: `member_${Date.now()}`,
      name: '',
      email: '',
      role: invitation.role,
      status: 'active',
      invitedBy: invitation.createdBy,
      invitedAt: invitation.createdAt,
      joinedAt: new Date()
    }

    // 更新邀请使用次数
    invitation.usedCount++
    if (invitation.usedCount >= invitation.maxUses) {
      invitation.status = 'used'
    }

    return member
  }

  // 生成邀请页面HTML
  generateInvitePageHtml(projectName: string): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>邀请成员 - ${projectName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #F9FAFB;
      padding: 40px 20px;
    }

    .container { max-width: 600px; margin: 0 auto; }

    .header {
      text-align: center;
      margin-bottom: 32px;
    }
    .title {
      font-size: 28px;
      font-weight: 700;
      color: #1F2937;
      margin-bottom: 8px;
    }
    .subtitle {
      color: #6B7280;
    }

    .section {
      background: white;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
    }
    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: #1F2937;
      margin-bottom: 16px;
    }

    .roles {
      display: grid;
      gap: 12px;
    }
    .role {
      display: flex;
      align-items: center;
      padding: 16px;
      border: 2px solid #E5E7EB;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .role:hover { border-color: #6366F1; }
    .role.selected {
      border-color: #6366F1;
      background: #EEF2FF;
    }
    .role-icon {
      font-size: 28px;
      margin-right: 16px;
    }
    .role-info { flex: 1; }
    .role-label {
      font-weight: 600;
      color: #374151;
      margin-bottom: 4px;
    }
    .role-desc {
      font-size: 13px;
      color: #9CA3AF;
    }
    .role-radio {
      width: 24px;
      height: 24px;
      border: 2px solid #D1D5DB;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .role.selected .role-radio {
      border-color: #6366F1;
    }
    .role.selected .role-radio::after {
      content: '';
      width: 12px;
      height: 12px;
      background: #6366F1;
      border-radius: 50%;
    }

    .methods {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    .method {
      padding: 20px 16px;
      border: 2px solid #E5E7EB;
      border-radius: 12px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
    }
    .method:hover { border-color: #6366F1; }
    .method.selected {
      border-color: #6366F1;
      background: #EEF2FF;
    }
    .method-icon { font-size: 28px; margin-bottom: 8px; }
    .method-label { font-weight: 500; color: #374151; }

    .input-group {
      margin-bottom: 16px;
    }
    .input-label {
      font-size: 14px;
      font-weight: 500;
      color: #374151;
      margin-bottom: 8px;
    }
    .input-field {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #E5E7EB;
      border-radius: 10px;
      font-size: 16px;
    }
    .input-field:focus {
      outline: none;
      border-color: #6366F1;
    }

    .invite-btn {
      width: 100%;
      padding: 16px;
      background: #6366F1;
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .invite-btn:hover { background: #4F46E5; }

    .result {
      text-align: center;
      padding: 32px;
    }
    .result-icon { font-size: 48px; margin-bottom: 16px; }
    .result-title {
      font-size: 20px;
      font-weight: 600;
      color: #1F2937;
      margin-bottom: 8px;
    }
    .result-link {
      background: #F3F4F6;
      padding: 16px;
      border-radius: 10px;
      font-family: monospace;
      font-size: 14px;
      margin: 16px 0;
      word-break: break-all;
    }
    .copy-btn {
      background: #6366F1;
      color: white;
      border: none;
      padding: 12px 32px;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">👥 邀请成员</h1>
      <p class="subtitle">邀请团队成员加入 ${projectName}</p>
    </div>

    <div class="section">
      <h2 class="section-title">选择角色</h2>
      <div class="roles">
        ${Object.entries(ROLE_CONFIG).filter(([key]) => key !== 'owner').map(([key, config], i) => `
          <div class="role ${i === 0 ? 'selected' : ''}" onclick="selectRole('${key}')">
            <div class="role-icon">${config.icon}</div>
            <div class="role-info">
              <div class="role-label">${config.label}</div>
              <div class="role-desc">${config.description}</div>
            </div>
            <div class="role-radio"></div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">邀请方式</h2>
      <div class="methods">
        ${Object.entries(INVITE_METHOD_CONFIG).slice(0, 3).map(([key, config], i) => `
          <div class="method ${i === 0 ? 'selected' : ''}" onclick="selectMethod('${key}')">
            <div class="method-icon">${config.icon}</div>
            <div class="method-label">${config.label}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="section" id="emailSection" style="display: none;">
      <div class="input-group">
        <div class="input-label">邮箱地址</div>
        <input type="email" class="input-field" placeholder="输入被邀请人的邮箱">
      </div>
      <div class="input-group">
        <div class="input-label">邀请留言（可选）</div>
        <input type="text" class="input-field" placeholder="添加一句话留言">
      </div>
    </div>

    <button class="invite-btn" onclick="createInvite()">
      生成邀请
    </button>
  </div>

  <script>
    let selectedRole = 'admin';
    let selectedMethod = 'link';

    function selectRole(role) {
      selectedRole = role;
      document.querySelectorAll('.role').forEach(el => el.classList.remove('selected'));
      event.target.closest('.role').classList.add('selected');
    }

    function selectMethod(method) {
      selectedMethod = method;
      document.querySelectorAll('.method').forEach(el => el.classList.remove('selected'));
      event.target.closest('.method').classList.add('selected');
      document.getElementById('emailSection').style.display = method === 'email' ? 'block' : 'none';
    }

    function createInvite() {
      alert('邀请已创建！');
    }
  </script>
</body>
</html>`
  }

  // 生成邀请接受页面HTML
  generateAcceptPageHtml(invitation: Invitation, projectName: string): string {
    const roleConfig = ROLE_CONFIG[invitation.role]

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>加入团队 - ${projectName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .card {
      background: white;
      border-radius: 20px;
      padding: 48px;
      max-width: 420px;
      width: 100%;
      text-align: center;
      box-shadow: 0 25px 50px rgba(0,0,0,0.25);
    }

    .icon { font-size: 64px; margin-bottom: 24px; }

    .title {
      font-size: 24px;
      font-weight: 700;
      color: #1F2937;
      margin-bottom: 8px;
    }
    .subtitle {
      color: #6B7280;
      margin-bottom: 32px;
    }

    .role-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: ${roleConfig.color}20;
      color: ${roleConfig.color};
      padding: 12px 24px;
      border-radius: 30px;
      font-weight: 600;
      margin-bottom: 24px;
    }

    .permissions {
      text-align: left;
      background: #F9FAFB;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 32px;
    }
    .permissions-title {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 12px;
    }
    .permission-item {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #6B7280;
      font-size: 14px;
      margin-bottom: 8px;
    }
    .permission-item:last-child { margin-bottom: 0; }

    .accept-btn {
      width: 100%;
      padding: 16px;
      background: #6366F1;
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
    }
    .accept-btn:hover { background: #4F46E5; }

    .decline-link {
      display: block;
      margin-top: 16px;
      color: #9CA3AF;
      font-size: 14px;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🎉</div>
    <h1 class="title">您被邀请加入</h1>
    <p class="subtitle">${projectName}</p>

    <div class="role-badge">
      ${roleConfig.icon} ${roleConfig.label}
    </div>

    <div class="permissions">
      <div class="permissions-title">您将拥有以下权限：</div>
      ${roleConfig.permissions.map(p => `
        <div class="permission-item">
          <span>✓</span>
          <span>${p}</span>
        </div>
      `).join('')}
    </div>

    <button class="accept-btn" onclick="acceptInvite()">
      接受邀请
    </button>

    <a href="#" class="decline-link">婉拒邀请</a>
  </div>

  <script>
    function acceptInvite() {
      alert('已接受邀请！');
      location.href = '/dashboard';
    }
  </script>
</body>
</html>`
  }
}

export const teamInvitationSimplified = new TeamInvitationSimplifiedService()
