/**
 * 集成AI助手聊天服务
 *
 * 功能：
 * - 侧边栏AI助手，随时回答用户问题
 * - 理解用户当前上下文，给出针对性建议
 * - 可以自动导航到相关页面
 * - 不会的问题自动转人工
 *
 * 核心理念：
 * - 用户不需要找文档，直接问就好
 * - AI应该主动帮忙，而不是等用户问
 * - 回答要简单直接，不要长篇大论
 */

// ============================================
// 类型定义
// ============================================

/** 消息类型 */
export type MessageType = 'user' | 'ai' | 'system' | 'action'

/** 消息 */
export interface ChatMessage {
  id: string
  type: MessageType
  content: string
  timestamp: Date

  // AI消息特有
  suggestions?: string[]      // 建议的后续问题
  actions?: ChatAction[]      // 可执行的操作
  sources?: string[]          // 信息来源

  // 系统消息特有
  systemType?: 'welcome' | 'transfer' | 'error' | 'success'
}

/** 可执行操作 */
export interface ChatAction {
  id: string
  label: string
  icon: string
  type: 'navigate' | 'execute' | 'link' | 'copy'
  target: string              // URL或命令
}

/** 聊天会话 */
export interface ChatSession {
  sessionId: string
  userId: string
  projectId: string

  // 消息
  messages: ChatMessage[]

  // 上下文
  context: {
    currentPage: string       // 当前页面
    recentActions: string[]   // 最近操作
    userRole: string          // 用户角色
    productType: string       // 产品类型
  }

  // 状态
  status: 'active' | 'idle' | 'transferred' | 'ended'
  isTyping: boolean

  // AI配置
  aiPersonality: 'friendly' | 'professional' | 'concise'
  language: 'zh-CN' | 'en'
}

/** AI回复 */
export interface AIResponse {
  message: string
  suggestions?: string[]
  actions?: ChatAction[]
  shouldTransfer?: boolean    // 是否需要转人工
  transferReason?: string
  confidence: number          // 0-1，回答置信度
}

// ============================================
// 预设回复模板
// ============================================

const FAQ_RESPONSES: Record<string, {
  keywords: string[]
  response: string
  suggestions?: string[]
  actions?: ChatAction[]
}> = {
  how_to_login: {
    keywords: ['怎么登录', '登录', '账号', '密码', '登不进去'],
    response: '登录很简单！\n\n1. 在交付邮件中找到您的账号密码\n2. 打开管理后台链接\n3. 输入账号密码点击登录\n\n如果忘记密码了，可以点击"忘记密码"重置。',
    suggestions: ['我忘记密码了', '找不到交付邮件'],
    actions: [
      { id: 'reset_pwd', label: '重置密码', icon: '🔑', type: 'navigate', target: '/reset-password' },
      { id: 'resend_email', label: '重发交付邮件', icon: '📧', type: 'execute', target: 'resendDeliveryEmail' }
    ]
  },
  how_to_use: {
    keywords: ['怎么用', '怎么使用', '不会用', '教我', '操作'],
    response: '我来教您！您想了解哪个功能？\n\n您可以选择下面的常见功能，或者直接告诉我您想做什么。',
    suggestions: ['怎么添加内容', '怎么管理用户', '怎么查看数据', '怎么修改设置'],
    actions: [
      { id: 'tutorial', label: '查看新手教程', icon: '📚', type: 'navigate', target: '/tutorials' }
    ]
  },
  slow_speed: {
    keywords: ['太慢', '很慢', '加载慢', '卡', '响应慢'],
    response: '抱歉给您带来不好的体验！让我帮您检查一下。\n\n常见原因：\n• 网络不稳定\n• 服务器繁忙\n• 浏览器缓存\n\n您可以试试刷新页面或清除缓存。如果问题持续，我帮您联系技术支持。',
    suggestions: ['还是很慢', '帮我联系技术支持'],
    actions: [
      { id: 'refresh', label: '刷新页面', icon: '🔄', type: 'execute', target: 'refreshPage' },
      { id: 'clear_cache', label: '清除缓存', icon: '🗑️', type: 'execute', target: 'clearCache' }
    ]
  },
  feature_not_working: {
    keywords: ['坏了', '不工作', '报错', '出错', '有问题', 'bug'],
    response: '很抱歉遇到问题！能告诉我具体是哪个功能出问题了吗？\n\n或者您可以截图发给我，我帮您分析。',
    suggestions: ['登录有问题', '数据显示不对', '按钮点不了'],
    actions: [
      { id: 'screenshot', label: '上传截图', icon: '📸', type: 'execute', target: 'uploadScreenshot' },
      { id: 'report', label: '提交问题报告', icon: '📝', type: 'navigate', target: '/report-issue' }
    ]
  },
  contact_support: {
    keywords: ['客服', '人工', '真人', '联系', '电话', '帮助'],
    response: '好的，我帮您转接人工客服！\n\n您也可以选择以下方式联系我们：',
    suggestions: [],
    actions: [
      { id: 'chat', label: '在线客服', icon: '💬', type: 'execute', target: 'transferToHuman' },
      { id: 'phone', label: '电话支持', icon: '📞', type: 'link', target: 'tel:400-xxx-xxxx' },
      { id: 'wechat', label: '微信客服', icon: '💚', type: 'navigate', target: '/support/wechat' }
    ]
  },
  pricing: {
    keywords: ['价格', '费用', '收费', '多少钱', '续费'],
    response: '关于费用问题，您可以在设置中查看当前套餐和续费信息。\n\n有任何疑问都可以联系我们的销售团队。',
    actions: [
      { id: 'billing', label: '查看账单', icon: '💰', type: 'navigate', target: '/settings/billing' },
      { id: 'plans', label: '查看套餐', icon: '📊', type: 'navigate', target: '/pricing' }
    ]
  }
}

// ============================================
// 服务实现
// ============================================

export class IntegratedAIChatService {

  /**
   * 创建聊天会话
   */
  async createSession(params: {
    userId: string
    projectId: string
    context: ChatSession['context']
  }): Promise<ChatSession> {
    const { userId, projectId, context } = params

    const sessionId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // 生成欢迎消息
    const welcomeMessage: ChatMessage = {
      id: 'msg_welcome',
      type: 'ai',
      content: this.getWelcomeMessage(context),
      timestamp: new Date(),
      suggestions: ['怎么使用这个系统', '我遇到了问题', '联系客服']
    }

    return {
      sessionId,
      userId,
      projectId,
      messages: [welcomeMessage],
      context,
      status: 'active',
      isTyping: false,
      aiPersonality: 'friendly',
      language: 'zh-CN'
    }
  }

  /**
   * 发送消息
   */
  async sendMessage(params: {
    session: ChatSession
    content: string
  }): Promise<{
    session: ChatSession
    response: AIResponse
  }> {
    const { session, content } = params

    // 添加用户消息
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      type: 'user',
      content,
      timestamp: new Date()
    }
    session.messages.push(userMessage)

    // 生成AI回复
    session.isTyping = true
    const response = await this.generateResponse(content, session.context)

    // 添加AI消息
    const aiMessage: ChatMessage = {
      id: `msg_${Date.now() + 1}`,
      type: 'ai',
      content: response.message,
      timestamp: new Date(),
      suggestions: response.suggestions,
      actions: response.actions
    }
    session.messages.push(aiMessage)
    session.isTyping = false

    // 如果需要转人工
    if (response.shouldTransfer) {
      session.status = 'transferred'
      const transferMessage: ChatMessage = {
        id: `msg_${Date.now() + 2}`,
        type: 'system',
        content: '正在为您转接人工客服，请稍等...',
        timestamp: new Date(),
        systemType: 'transfer'
      }
      session.messages.push(transferMessage)
    }

    return { session, response }
  }

  /**
   * 执行操作
   */
  async executeAction(params: {
    session: ChatSession
    actionId: string
  }): Promise<{
    success: boolean
    message: string
    result?: any
  }> {
    const { session, actionId } = params

    // 查找操作
    const lastAIMessage = [...session.messages]
      .reverse()
      .find(m => m.type === 'ai' && m.actions)

    const action = lastAIMessage?.actions?.find(a => a.id === actionId)

    if (!action) {
      return { success: false, message: '操作不存在' }
    }

    // 执行操作
    switch (action.type) {
      case 'navigate':
        return { success: true, message: '正在跳转...', result: { redirect: action.target } }

      case 'execute':
        // 执行特定命令
        return this.executeCommand(action.target, session)

      case 'link':
        return { success: true, message: '正在打开...', result: { openUrl: action.target } }

      case 'copy':
        return { success: true, message: '已复制到剪贴板', result: { copyText: action.target } }

      default:
        return { success: false, message: '不支持的操作类型' }
    }
  }

  /**
   * 生成聊天组件代码
   */
  generateChatWidgetScript(): string {
    return `
// AI聊天组件
class AIChatWidget {
  constructor(options = {}) {
    this.sessionId = null;
    this.messages = [];
    this.isOpen = false;
    this.isTyping = false;
    this.options = {
      position: 'bottom-right',
      title: 'AI助手',
      placeholder: '有什么可以帮您？',
      ...options
    };

    this.createElements();
    this.bindEvents();
  }

  createElements() {
    // 创建聊天窗口
    this.container = document.createElement('div');
    this.container.className = 'ai-chat-widget';
    this.container.innerHTML = \`
      <button class="ai-chat-toggle">
        <span class="ai-chat-toggle-icon">💬</span>
        <span class="ai-chat-toggle-text">需要帮助？</span>
      </button>

      <div class="ai-chat-window">
        <div class="ai-chat-header">
          <div class="ai-chat-avatar">🤖</div>
          <div class="ai-chat-info">
            <div class="ai-chat-title">\${this.options.title}</div>
            <div class="ai-chat-status">在线</div>
          </div>
          <button class="ai-chat-close">✕</button>
        </div>

        <div class="ai-chat-messages"></div>

        <div class="ai-chat-suggestions"></div>

        <div class="ai-chat-input-area">
          <input type="text" class="ai-chat-input" placeholder="\${this.options.placeholder}">
          <button class="ai-chat-send">发送</button>
        </div>
      </div>
    \`;

    // 添加样式
    const style = document.createElement('style');
    style.textContent = \`
      .ai-chat-widget {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }

      .ai-chat-toggle {
        background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
        color: white;
        border: none;
        border-radius: 50px;
        padding: 12px 20px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        transition: transform 0.2s, box-shadow 0.2s;
      }
      .ai-chat-toggle:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(59, 130, 246, 0.5);
      }
      .ai-chat-toggle-icon { font-size: 20px; }
      .ai-chat-toggle-text { font-size: 14px; font-weight: 500; }

      .ai-chat-window {
        display: none;
        position: absolute;
        bottom: 60px;
        right: 0;
        width: 360px;
        height: 500px;
        background: white;
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
        overflow: hidden;
        flex-direction: column;
      }
      .ai-chat-window.open { display: flex; }

      .ai-chat-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
        color: white;
      }
      .ai-chat-avatar {
        width: 40px;
        height: 40px;
        background: rgba(255,255,255,0.2);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
      }
      .ai-chat-info { flex: 1; }
      .ai-chat-title { font-size: 16px; font-weight: 600; }
      .ai-chat-status { font-size: 12px; opacity: 0.8; }
      .ai-chat-close {
        background: none;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        padding: 4px;
      }

      .ai-chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .ai-chat-message {
        max-width: 85%;
        padding: 12px 16px;
        border-radius: 16px;
        font-size: 14px;
        line-height: 1.5;
        white-space: pre-wrap;
      }
      .ai-chat-message.user {
        background: #3B82F6;
        color: white;
        align-self: flex-end;
        border-bottom-right-radius: 4px;
      }
      .ai-chat-message.ai {
        background: #F3F4F6;
        color: #1F2937;
        align-self: flex-start;
        border-bottom-left-radius: 4px;
      }

      .ai-chat-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 8px;
      }
      .ai-chat-action {
        background: white;
        border: 1px solid #E5E7EB;
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .ai-chat-action:hover {
        border-color: #3B82F6;
        color: #3B82F6;
      }

      .ai-chat-suggestions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        padding: 12px 16px;
        border-top: 1px solid #F3F4F6;
      }
      .ai-chat-suggestion {
        background: #EFF6FF;
        color: #3B82F6;
        border: none;
        border-radius: 20px;
        padding: 8px 16px;
        font-size: 13px;
        cursor: pointer;
        transition: background 0.2s;
      }
      .ai-chat-suggestion:hover { background: #DBEAFE; }

      .ai-chat-input-area {
        display: flex;
        gap: 8px;
        padding: 12px 16px;
        border-top: 1px solid #E5E7EB;
      }
      .ai-chat-input {
        flex: 1;
        border: 1px solid #E5E7EB;
        border-radius: 8px;
        padding: 10px 14px;
        font-size: 14px;
        outline: none;
      }
      .ai-chat-input:focus { border-color: #3B82F6; }
      .ai-chat-send {
        background: #3B82F6;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 10px 16px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
      }
      .ai-chat-send:hover { background: #2563EB; }

      .ai-chat-typing {
        display: flex;
        gap: 4px;
        padding: 12px 16px;
        align-self: flex-start;
      }
      .ai-chat-typing span {
        width: 8px;
        height: 8px;
        background: #9CA3AF;
        border-radius: 50%;
        animation: typing 1.4s infinite;
      }
      .ai-chat-typing span:nth-child(2) { animation-delay: 0.2s; }
      .ai-chat-typing span:nth-child(3) { animation-delay: 0.4s; }
      @keyframes typing {
        0%, 60%, 100% { transform: translateY(0); }
        30% { transform: translateY(-4px); }
      }
    \`;
    document.head.appendChild(style);
    document.body.appendChild(this.container);

    this.messagesEl = this.container.querySelector('.ai-chat-messages');
    this.suggestionsEl = this.container.querySelector('.ai-chat-suggestions');
    this.inputEl = this.container.querySelector('.ai-chat-input');
    this.windowEl = this.container.querySelector('.ai-chat-window');
  }

  bindEvents() {
    // 切换窗口
    this.container.querySelector('.ai-chat-toggle').onclick = () => this.toggle();
    this.container.querySelector('.ai-chat-close').onclick = () => this.close();

    // 发送消息
    this.container.querySelector('.ai-chat-send').onclick = () => this.send();
    this.inputEl.onkeypress = (e) => {
      if (e.key === 'Enter') this.send();
    };
  }

  toggle() {
    this.isOpen = !this.isOpen;
    this.windowEl.classList.toggle('open', this.isOpen);
    if (this.isOpen && this.messages.length === 0) {
      this.showWelcome();
    }
  }

  close() {
    this.isOpen = false;
    this.windowEl.classList.remove('open');
  }

  async send() {
    const content = this.inputEl.value.trim();
    if (!content) return;

    this.inputEl.value = '';
    this.addMessage('user', content);
    this.showTyping();

    // 调用API获取回复
    try {
      const response = await fetch('/api/ai-chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: this.sessionId, content })
      });
      const data = await response.json();

      this.hideTyping();
      this.addMessage('ai', data.response.message, data.response.actions);
      this.showSuggestions(data.response.suggestions || []);
    } catch (error) {
      this.hideTyping();
      this.addMessage('ai', '抱歉，出了点问题，请稍后再试。');
    }
  }

  addMessage(type, content, actions) {
    const messageEl = document.createElement('div');
    messageEl.className = \`ai-chat-message \${type}\`;
    messageEl.textContent = content;

    if (actions && actions.length > 0) {
      const actionsEl = document.createElement('div');
      actionsEl.className = 'ai-chat-actions';
      actions.forEach(action => {
        const btn = document.createElement('button');
        btn.className = 'ai-chat-action';
        btn.innerHTML = \`\${action.icon} \${action.label}\`;
        btn.onclick = () => this.executeAction(action);
        actionsEl.appendChild(btn);
      });
      messageEl.appendChild(actionsEl);
    }

    this.messagesEl.appendChild(messageEl);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    this.messages.push({ type, content, actions });
  }

  showSuggestions(suggestions) {
    this.suggestionsEl.innerHTML = suggestions.map(s =>
      \`<button class="ai-chat-suggestion">\${s}</button>\`
    ).join('');

    this.suggestionsEl.querySelectorAll('.ai-chat-suggestion').forEach((btn, i) => {
      btn.onclick = () => {
        this.inputEl.value = suggestions[i];
        this.send();
      };
    });
  }

  showTyping() {
    const typing = document.createElement('div');
    typing.className = 'ai-chat-typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    this.messagesEl.appendChild(typing);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  hideTyping() {
    const typing = this.messagesEl.querySelector('.ai-chat-typing');
    if (typing) typing.remove();
  }

  showWelcome() {
    this.addMessage('ai', '您好！我是AI助手小T 👋\\n\\n有什么可以帮您的？您可以直接问我问题，或者选择下面的常见问题。');
    this.showSuggestions(['怎么使用这个系统', '我遇到了问题', '联系人工客服']);
  }

  async executeAction(action) {
    // 根据操作类型执行
    if (action.type === 'navigate') {
      window.location.href = action.target;
    } else if (action.type === 'link') {
      window.open(action.target, '_blank');
    } else if (action.type === 'execute') {
      const response = await fetch('/api/ai-chat/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: this.sessionId, actionId: action.id })
      });
      const result = await response.json();
      if (result.success) {
        this.addMessage('ai', '✅ ' + result.message);
      }
    }
  }
}

// 初始化
window.aiChat = new AIChatWidget();
`
  }

  // ============================================
  // 私有方法
  // ============================================

  private getWelcomeMessage(context: ChatSession['context']): string {
    const pageGreetings: Record<string, string> = {
      dashboard: '您好！我是AI助手小T 👋\n\n看起来您在查看仪表盘，有什么数据需要我帮您解读吗？',
      settings: '您好！我是AI助手小T 👋\n\n我看到您在设置页面，需要帮您配置什么吗？',
      products: '您好！我是AI助手小T 👋\n\n商品管理有任何问题都可以问我！'
    }

    return pageGreetings[context.currentPage] || '您好！我是AI助手小T 👋\n\n有什么可以帮您的？您可以直接问我问题，或者选择下面的常见问题。'
  }

  private async generateResponse(
    content: string,
    context: ChatSession['context']
  ): Promise<AIResponse> {
    // 先检查是否匹配预设FAQ
    for (const faq of Object.values(FAQ_RESPONSES)) {
      if (faq.keywords.some(kw => content.includes(kw))) {
        return {
          message: faq.response,
          suggestions: faq.suggestions,
          actions: faq.actions,
          confidence: 0.9
        }
      }
    }

    // 检查是否需要转人工
    if (['人工', '客服', '真人'].some(kw => content.includes(kw))) {
      return {
        message: '好的，我帮您转接人工客服！请稍等...',
        shouldTransfer: true,
        transferReason: '用户主动请求',
        confidence: 1
      }
    }

    // 默认回复
    return {
      message: '我明白您的问题了。这个问题可能需要更详细的了解，我帮您转接人工客服来解答，好吗？',
      suggestions: ['好的，帮我转人工', '让我换个方式问'],
      confidence: 0.3
    }
  }

  private async executeCommand(
    command: string,
    session: ChatSession
  ): Promise<{
    success: boolean
    message: string
    result?: any
  }> {
    switch (command) {
      case 'refreshPage':
        return { success: true, message: '正在刷新页面...', result: { action: 'refresh' } }

      case 'clearCache':
        return { success: true, message: '已清除缓存，请刷新页面', result: { action: 'clearCache' } }

      case 'transferToHuman':
        return { success: true, message: '正在为您连接人工客服...', result: { action: 'transfer' } }

      case 'resendDeliveryEmail':
        return { success: true, message: '交付邮件已重新发送，请查收！' }

      case 'uploadScreenshot':
        return { success: true, message: '请选择截图文件', result: { action: 'openFilePicker' } }

      default:
        return { success: false, message: '未知命令' }
    }
  }
}

// ============================================
// 导出单例
// ============================================

export const integratedAIChat = new IntegratedAIChatService()
