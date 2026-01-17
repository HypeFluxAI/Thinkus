/**
 * 首登魔力时刻服务
 *
 * 功能：
 * - 用户第一次登录时的"哇"体验
 * - 温暖的欢迎 + 沉浸式引导
 * - 让用户感到被重视和照顾
 * - 每一步都有成就感
 *
 * 核心理念：
 * - 第一印象决定一切
 * - 用户不知道从哪里开始，我们带着他走
 * - 小小的庆祝让用户感到成功
 */

// ============================================
// 类型定义
// ============================================

/** 引导步骤类型 */
export type OnboardingStepType =
  | 'welcome'          // 欢迎
  | 'highlight'        // 高亮功能
  | 'action'           // 执行操作
  | 'celebration'      // 庆祝
  | 'tip'              // 小贴士

/** 引导步骤 */
export interface OnboardingStep {
  id: string
  stepNumber: number
  type: OnboardingStepType

  // 显示内容
  title: string              // 标题
  message: string            // 消息
  icon?: string              // 图标/emoji

  // 目标元素（用于高亮）
  targetSelector?: string    // CSS选择器
  targetPosition?: 'top' | 'bottom' | 'left' | 'right'

  // 操作
  action?: {
    type: 'click' | 'input' | 'navigate' | 'none'
    target?: string          // 目标元素或URL
    value?: string           // 输入值
    waitForEvent?: string    // 等待的事件
  }

  // 显示控制
  delay?: number             // 显示延迟(ms)
  duration?: number          // 显示时长(ms)，0为需要用户确认
  canSkip: boolean
  autoAdvance: boolean       // 是否自动进入下一步

  // 完成后
  onComplete?: {
    confetti?: boolean       // 撒花效果
    sound?: string           // 音效
    badge?: string           // 获得徽章
    message?: string         // 庆祝消息
  }
}

/** 引导会话 */
export interface OnboardingSession {
  sessionId: string
  userId: string
  projectId: string
  productType: string

  // 步骤
  steps: OnboardingStep[]
  currentStepIndex: number
  totalSteps: number

  // 进度
  completedSteps: string[]
  skippedSteps: string[]
  progress: number           // 0-100

  // 状态
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped'
  startedAt?: Date
  completedAt?: Date

  // 用户偏好
  preferences: {
    showHints: boolean
    animationSpeed: 'slow' | 'normal' | 'fast'
    soundEnabled: boolean
  }
}

/** 欢迎消息配置 */
export interface WelcomeConfig {
  userName: string
  projectName: string
  productType: string
  features: string[]         // 主要功能列表
  customGreeting?: string
}

// ============================================
// 默认引导步骤模板
// ============================================

const getDefaultSteps = (productType: string): Omit<OnboardingStep, 'id' | 'stepNumber'>[] => {
  // 通用步骤
  const commonSteps: Omit<OnboardingStep, 'id' | 'stepNumber'>[] = [
    // 欢迎
    {
      type: 'welcome',
      title: '欢迎来到您的产品！👋',
      message: '让我花1分钟带您快速了解',
      icon: '🎉',
      canSkip: true,
      autoAdvance: false,
      delay: 500,
      onComplete: {
        confetti: true
      }
    },
    // 概览
    {
      type: 'highlight',
      title: '这是您的仪表盘',
      message: '所有重要信息都在这里一目了然',
      icon: '📊',
      targetSelector: '.dashboard-overview',
      targetPosition: 'bottom',
      canSkip: true,
      autoAdvance: false
    },
    // 导航
    {
      type: 'highlight',
      title: '这是导航菜单',
      message: '点击这里可以切换不同的功能',
      icon: '🧭',
      targetSelector: '.sidebar-nav',
      targetPosition: 'right',
      canSkip: true,
      autoAdvance: false
    },
    // 核心功能
    {
      type: 'highlight',
      title: '这是核心功能区',
      message: '您最常用的功能都在这里',
      icon: '⚙️',
      targetSelector: '.main-feature-area',
      targetPosition: 'top',
      canSkip: true,
      autoAdvance: false
    },
    // 帮助按钮
    {
      type: 'highlight',
      title: '需要帮助？',
      message: '随时点击这里联系我们的客服',
      icon: '💬',
      targetSelector: '.help-button',
      targetPosition: 'left',
      canSkip: true,
      autoAdvance: false
    },
    // 第一个操作
    {
      type: 'action',
      title: '试试创建第一条内容',
      message: '点击下面的按钮开始',
      icon: '✨',
      action: {
        type: 'click',
        target: '.create-button'
      },
      canSkip: true,
      autoAdvance: false,
      onComplete: {
        confetti: true,
        badge: '新手上路',
        message: '太棒了！您完成了第一个操作！'
      }
    },
    // 完成
    {
      type: 'celebration',
      title: '恭喜！您已经入门了！🎊',
      message: '现在您可以自由探索了。如果有任何问题，随时找我们！',
      icon: '🏆',
      canSkip: false,
      autoAdvance: false,
      onComplete: {
        confetti: true,
        badge: '快速学习者'
      }
    }
  ]

  // 根据产品类型添加特定步骤
  if (productType === 'ecommerce') {
    // 电商特有步骤
    commonSteps.splice(4, 0, {
      type: 'highlight',
      title: '商品管理',
      message: '在这里管理您的所有商品',
      icon: '🛍️',
      targetSelector: '.products-menu',
      targetPosition: 'right',
      canSkip: true,
      autoAdvance: false
    }, {
      type: 'highlight',
      title: '订单中心',
      message: '所有订单都会显示在这里',
      icon: '📦',
      targetSelector: '.orders-menu',
      targetPosition: 'right',
      canSkip: true,
      autoAdvance: false
    })
  }

  return commonSteps
}

// ============================================
// 服务实现
// ============================================

export class FirstLoginMagicMomentService {

  /**
   * 创建引导会话
   */
  async createSession(params: {
    userId: string
    projectId: string
    productType: string
    customSteps?: Omit<OnboardingStep, 'id' | 'stepNumber'>[]
  }): Promise<OnboardingSession> {
    const { userId, projectId, productType, customSteps } = params

    const sessionId = `onboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // 生成步骤
    const stepTemplates = customSteps || getDefaultSteps(productType)
    const steps: OnboardingStep[] = stepTemplates.map((template, index) => ({
      ...template,
      id: `step_${index}`,
      stepNumber: index + 1
    }))

    return {
      sessionId,
      userId,
      projectId,
      productType,
      steps,
      currentStepIndex: 0,
      totalSteps: steps.length,
      completedSteps: [],
      skippedSteps: [],
      progress: 0,
      status: 'not_started',
      preferences: {
        showHints: true,
        animationSpeed: 'normal',
        soundEnabled: true
      }
    }
  }

  /**
   * 开始引导
   */
  async startOnboarding(sessionId: string): Promise<{
    session: OnboardingSession
    currentStep: OnboardingStep
    welcomeAnimation: string
  }> {
    // 更新状态
    const session = {
      sessionId,
      status: 'in_progress',
      startedAt: new Date()
    } as OnboardingSession

    return {
      session,
      currentStep: session.steps?.[0] || {} as OnboardingStep,
      welcomeAnimation: this.getWelcomeAnimation()
    }
  }

  /**
   * 完成当前步骤
   */
  async completeStep(params: {
    sessionId: string
    stepId: string
    skipped?: boolean
  }): Promise<{
    session: OnboardingSession
    nextStep?: OnboardingStep
    celebration?: {
      confetti: boolean
      badge?: string
      message?: string
    }
    isCompleted: boolean
  }> {
    const { sessionId, stepId, skipped = false } = params

    // 这里应该从数据库获取并更新会话

    // 模拟返回
    return {
      session: {} as OnboardingSession,
      nextStep: undefined,
      celebration: {
        confetti: true,
        message: '做得好！'
      },
      isCompleted: true
    }
  }

  /**
   * 跳过整个引导
   */
  async skipOnboarding(sessionId: string): Promise<void> {
    // 更新状态为 skipped
  }

  /**
   * 生成欢迎页面HTML
   */
  generateWelcomePageHtml(config: WelcomeConfig): string {
    const { userName, projectName, features } = config

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>欢迎 - ${projectName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .welcome-card {
      background: white;
      border-radius: 32px;
      padding: 48px;
      max-width: 480px;
      width: 90%;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      animation: slideUp 0.6s ease-out;
    }
    @keyframes slideUp {
      from { transform: translateY(50px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .avatar {
      width: 100px;
      height: 100px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 48px;
      margin: 0 auto 24px;
      animation: bounce 1s ease infinite;
    }
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }

    .greeting {
      font-size: 14px;
      color: #6B7280;
      margin-bottom: 8px;
      animation: fadeIn 0.6s ease-out 0.2s backwards;
    }
    .name {
      font-size: 32px;
      font-weight: 700;
      color: #1F2937;
      margin-bottom: 8px;
      animation: fadeIn 0.6s ease-out 0.3s backwards;
    }
    .project-name {
      font-size: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      font-weight: 600;
      margin-bottom: 32px;
      animation: fadeIn 0.6s ease-out 0.4s backwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .features {
      background: #F9FAFB;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 32px;
      text-align: left;
      animation: fadeIn 0.6s ease-out 0.5s backwards;
    }
    .features-title {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 16px;
    }
    .feature-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 0;
    }
    .feature-icon { font-size: 20px; }
    .feature-text { font-size: 14px; color: #4B5563; }

    .start-btn {
      width: 100%;
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
      color: white;
      border: none;
      border-radius: 16px;
      padding: 18px;
      font-size: 18px;
      font-weight: 700;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      animation: fadeIn 0.6s ease-out 0.6s backwards;
    }
    .start-btn:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.4);
    }

    .skip-link {
      margin-top: 16px;
      font-size: 14px;
      color: #9CA3AF;
      cursor: pointer;
      animation: fadeIn 0.6s ease-out 0.7s backwards;
    }
    .skip-link:hover { color: #6B7280; }

    /* 撒花效果 */
    .confetti {
      position: fixed;
      width: 10px;
      height: 10px;
      background: #f00;
      animation: confetti-fall 3s ease-out forwards;
    }
    @keyframes confetti-fall {
      0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
      100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
    }
  </style>
</head>
<body>
  <div class="welcome-card">
    <div class="avatar">👋</div>
    <p class="greeting">欢迎回来</p>
    <h1 class="name">${userName}</h1>
    <p class="project-name">${projectName} 已经准备好了！</p>

    <div class="features">
      <div class="features-title">您的产品包含以下功能：</div>
      ${features.map(f => `
        <div class="feature-item">
          <span class="feature-icon">✨</span>
          <span class="feature-text">${f}</span>
        </div>
      `).join('')}
    </div>

    <button class="start-btn" onclick="startTour()">
      开始使用 🚀
    </button>

    <p class="skip-link" onclick="skipTour()">跳过引导，直接使用</p>
  </div>

  <script>
    // 页面加载时撒花
    window.onload = () => {
      createConfetti();
    };

    function createConfetti() {
      const colors = ['#667eea', '#764ba2', '#10B981', '#F59E0B', '#EF4444'];
      for (let i = 0; i < 50; i++) {
        setTimeout(() => {
          const confetti = document.createElement('div');
          confetti.className = 'confetti';
          confetti.style.left = Math.random() * 100 + 'vw';
          confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
          confetti.style.animationDuration = (2 + Math.random() * 2) + 's';
          document.body.appendChild(confetti);
          setTimeout(() => confetti.remove(), 4000);
        }, i * 50);
      }
    }

    function startTour() {
      // 开始引导
      window.location.href = '/onboarding/start';
    }

    function skipTour() {
      // 跳过引导
      window.location.href = '/dashboard';
    }
  </script>
</body>
</html>`
  }

  /**
   * 生成引导覆盖层组件代码
   */
  generateOnboardingOverlayScript(): string {
    return `
// 引导覆盖层组件
class OnboardingOverlay {
  constructor(options = {}) {
    this.currentStep = 0;
    this.steps = options.steps || [];
    this.onComplete = options.onComplete || (() => {});
    this.onSkip = options.onSkip || (() => {});

    this.createElements();
  }

  createElements() {
    // 创建覆盖层
    this.overlay = document.createElement('div');
    this.overlay.className = 'onboarding-overlay';
    this.overlay.innerHTML = \`
      <div class="onboarding-backdrop"></div>
      <div class="onboarding-spotlight"></div>
      <div class="onboarding-tooltip">
        <div class="onboarding-tooltip-content">
          <div class="onboarding-icon"></div>
          <h3 class="onboarding-title"></h3>
          <p class="onboarding-message"></p>
        </div>
        <div class="onboarding-actions">
          <button class="onboarding-skip">跳过</button>
          <button class="onboarding-next">下一步</button>
        </div>
        <div class="onboarding-progress"></div>
      </div>
    \`;

    // 绑定事件
    this.overlay.querySelector('.onboarding-skip').onclick = () => this.skip();
    this.overlay.querySelector('.onboarding-next').onclick = () => this.next();

    // 添加样式
    const style = document.createElement('style');
    style.textContent = \`
      .onboarding-overlay {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        z-index: 10000;
        pointer-events: none;
      }
      .onboarding-backdrop {
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5);
        pointer-events: auto;
      }
      .onboarding-spotlight {
        position: absolute;
        border-radius: 8px;
        box-shadow: 0 0 0 9999px rgba(0,0,0,0.5);
        transition: all 0.3s ease;
      }
      .onboarding-tooltip {
        position: absolute;
        background: white;
        border-radius: 16px;
        padding: 24px;
        max-width: 320px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        pointer-events: auto;
        animation: tooltipIn 0.3s ease;
      }
      @keyframes tooltipIn {
        from { transform: translateY(10px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      .onboarding-icon { font-size: 40px; margin-bottom: 12px; }
      .onboarding-title { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
      .onboarding-message { font-size: 14px; color: #6B7280; margin-bottom: 20px; }
      .onboarding-actions { display: flex; gap: 12px; }
      .onboarding-skip {
        flex: 1; padding: 12px; border: 1px solid #E5E7EB;
        background: white; border-radius: 8px; cursor: pointer;
      }
      .onboarding-next {
        flex: 1; padding: 12px; border: none;
        background: #3B82F6; color: white; border-radius: 8px;
        cursor: pointer; font-weight: 600;
      }
      .onboarding-progress {
        display: flex; gap: 4px; justify-content: center; margin-top: 16px;
      }
      .onboarding-dot {
        width: 8px; height: 8px; border-radius: 50%;
        background: #E5E7EB; transition: background 0.2s;
      }
      .onboarding-dot.active { background: #3B82F6; }
      .onboarding-dot.completed { background: #10B981; }
    \`;
    document.head.appendChild(style);
  }

  start() {
    document.body.appendChild(this.overlay);
    this.showStep(0);
  }

  showStep(index) {
    const step = this.steps[index];
    if (!step) {
      this.complete();
      return;
    }

    this.currentStep = index;

    // 更新内容
    this.overlay.querySelector('.onboarding-icon').textContent = step.icon || '✨';
    this.overlay.querySelector('.onboarding-title').textContent = step.title;
    this.overlay.querySelector('.onboarding-message').textContent = step.message;

    // 更新进度点
    const progressHtml = this.steps.map((_, i) => \`
      <div class="onboarding-dot \${i < index ? 'completed' : ''} \${i === index ? 'active' : ''}"></div>
    \`).join('');
    this.overlay.querySelector('.onboarding-progress').innerHTML = progressHtml;

    // 更新按钮文字
    const nextBtn = this.overlay.querySelector('.onboarding-next');
    nextBtn.textContent = index === this.steps.length - 1 ? '完成' : '下一步';

    // 高亮目标元素
    if (step.targetSelector) {
      const target = document.querySelector(step.targetSelector);
      if (target) {
        const rect = target.getBoundingClientRect();
        const spotlight = this.overlay.querySelector('.onboarding-spotlight');
        spotlight.style.top = (rect.top - 8) + 'px';
        spotlight.style.left = (rect.left - 8) + 'px';
        spotlight.style.width = (rect.width + 16) + 'px';
        spotlight.style.height = (rect.height + 16) + 'px';

        // 定位提示框
        const tooltip = this.overlay.querySelector('.onboarding-tooltip');
        const pos = step.targetPosition || 'bottom';
        if (pos === 'bottom') {
          tooltip.style.top = (rect.bottom + 16) + 'px';
          tooltip.style.left = rect.left + 'px';
        } else if (pos === 'right') {
          tooltip.style.top = rect.top + 'px';
          tooltip.style.left = (rect.right + 16) + 'px';
        }
      }
    } else {
      // 居中显示
      const tooltip = this.overlay.querySelector('.onboarding-tooltip');
      tooltip.style.top = '50%';
      tooltip.style.left = '50%';
      tooltip.style.transform = 'translate(-50%, -50%)';
    }
  }

  next() {
    if (this.currentStep < this.steps.length - 1) {
      this.showStep(this.currentStep + 1);
    } else {
      this.complete();
    }
  }

  skip() {
    this.overlay.remove();
    this.onSkip();
  }

  complete() {
    // 撒花庆祝
    this.createConfetti();
    setTimeout(() => {
      this.overlay.remove();
      this.onComplete();
    }, 2000);
  }

  createConfetti() {
    const colors = ['#667eea', '#764ba2', '#10B981', '#F59E0B', '#EF4444'];
    for (let i = 0; i < 50; i++) {
      setTimeout(() => {
        const confetti = document.createElement('div');
        confetti.style.cssText = \`
          position: fixed;
          width: 10px;
          height: 10px;
          background: \${colors[Math.floor(Math.random() * colors.length)]};
          left: \${Math.random() * 100}vw;
          top: -20px;
          z-index: 10001;
          animation: confetti-fall 3s ease-out forwards;
        \`;
        document.body.appendChild(confetti);
        setTimeout(() => confetti.remove(), 3000);
      }, i * 30);
    }
  }
}

// 使用示例
// const onboarding = new OnboardingOverlay({
//   steps: [...],
//   onComplete: () => console.log('完成！'),
//   onSkip: () => console.log('跳过')
// });
// onboarding.start();
`
  }

  // ============================================
  // 私有方法
  // ============================================

  private getWelcomeAnimation(): string {
    return 'slideUp' // 可以是 slideUp, fadeIn, bounceIn 等
  }
}

// ============================================
// 导出单例
// ============================================

export const firstLoginMagicMoment = new FirstLoginMagicMomentService()
