/**
 * 上下文帮助系统
 *
 * 功能：
 * - 为UI元素提供悬停提示
 * - 根据用户当前操作显示相关帮助
 * - 智能推荐下一步操作
 */

// ============================================
// 类型定义
// ============================================

export interface HelpTip {
  id: string
  selector: string           // CSS选择器
  title: string
  content: string
  position: 'top' | 'bottom' | 'left' | 'right'
  learnMoreUrl?: string
  videoUrl?: string
}

export interface ContextualHelp {
  pageId: string
  pageName: string
  tips: HelpTip[]
  quickActions: {
    label: string
    icon: string
    action: string
  }[]
}

// ============================================
// 帮助内容配置
// ============================================

const PAGE_HELP_CONFIG: Record<string, ContextualHelp> = {
  dashboard: {
    pageId: 'dashboard',
    pageName: '仪表盘',
    tips: [
      {
        id: 'overview-stats',
        selector: '.overview-stats',
        title: '数据概览',
        content: '这里显示您产品的关键数据，包括访问量、用户数等',
        position: 'bottom'
      },
      {
        id: 'recent-activity',
        selector: '.recent-activity',
        title: '最近动态',
        content: '这里显示最近的用户操作和系统事件',
        position: 'left'
      },
      {
        id: 'quick-actions',
        selector: '.quick-actions',
        title: '快捷操作',
        content: '常用功能的快捷入口',
        position: 'bottom'
      }
    ],
    quickActions: [
      { label: '添加内容', icon: '➕', action: '/create' },
      { label: '查看数据', icon: '📊', action: '/analytics' },
      { label: '系统设置', icon: '⚙️', action: '/settings' }
    ]
  },
  products: {
    pageId: 'products',
    pageName: '商品管理',
    tips: [
      {
        id: 'product-list',
        selector: '.product-list',
        title: '商品列表',
        content: '点击商品可以编辑详情，拖动可以调整顺序',
        position: 'top'
      },
      {
        id: 'add-product',
        selector: '.add-product-btn',
        title: '添加商品',
        content: '点击这里添加新商品',
        position: 'left'
      }
    ],
    quickActions: [
      { label: '添加商品', icon: '➕', action: '/products/create' },
      { label: '批量导入', icon: '📤', action: '/products/import' }
    ]
  }
}

// ============================================
// 服务实现
// ============================================

export class ContextualHelpSystemService {

  getPageHelp(pageId: string): ContextualHelp | null {
    return PAGE_HELP_CONFIG[pageId] || null
  }

  generateHelpSystemScript(): string {
    return `
// 上下文帮助系统
class ContextualHelpSystem {
  constructor() {
    this.tips = [];
    this.activeTip = null;
    this.init();
  }

  init() {
    // 添加样式
    const style = document.createElement('style');
    style.textContent = \`
      .help-tooltip {
        position: absolute;
        background: #1F2937;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 13px;
        max-width: 280px;
        z-index: 10000;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        opacity: 0;
        transition: opacity 0.2s;
        pointer-events: none;
      }
      .help-tooltip.visible {
        opacity: 1;
        pointer-events: auto;
      }
      .help-tooltip-title {
        font-weight: 600;
        margin-bottom: 6px;
        font-size: 14px;
      }
      .help-tooltip-content {
        line-height: 1.5;
        color: #D1D5DB;
      }
      .help-tooltip-arrow {
        position: absolute;
        width: 10px;
        height: 10px;
        background: #1F2937;
        transform: rotate(45deg);
      }

      .help-highlight {
        position: relative;
      }
      .help-highlight::after {
        content: '?';
        position: absolute;
        top: -8px;
        right: -8px;
        width: 18px;
        height: 18px;
        background: #6366F1;
        color: white;
        border-radius: 50%;
        font-size: 11px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: help;
        opacity: 0;
        transition: opacity 0.2s;
      }
      .help-highlight:hover::after {
        opacity: 1;
      }

      .help-panel {
        position: fixed;
        bottom: 20px;
        left: 20px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        padding: 16px;
        width: 280px;
        z-index: 9998;
        display: none;
      }
      .help-panel.visible { display: block; }
      .help-panel-title {
        font-size: 14px;
        font-weight: 600;
        color: #374151;
        margin-bottom: 12px;
      }
      .help-quick-action {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 12px;
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.2s;
      }
      .help-quick-action:hover { background: #F3F4F6; }
      .help-quick-action-icon { font-size: 18px; }
      .help-quick-action-label { font-size: 14px; color: #374151; }
    \`;
    document.head.appendChild(style);

    // 创建tooltip元素
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'help-tooltip';
    this.tooltip.innerHTML = \`
      <div class="help-tooltip-title"></div>
      <div class="help-tooltip-content"></div>
      <div class="help-tooltip-arrow"></div>
    \`;
    document.body.appendChild(this.tooltip);

    // 监听鼠标事件
    document.addEventListener('mouseover', (e) => this.handleMouseOver(e));
    document.addEventListener('mouseout', () => this.hideTooltip());
  }

  registerTips(tips) {
    this.tips = tips;
    tips.forEach(tip => {
      const el = document.querySelector(tip.selector);
      if (el) {
        el.classList.add('help-highlight');
        el.dataset.helpId = tip.id;
      }
    });
  }

  handleMouseOver(e) {
    const target = e.target.closest('[data-help-id]');
    if (!target) return;

    const helpId = target.dataset.helpId;
    const tip = this.tips.find(t => t.id === helpId);
    if (tip) {
      this.showTooltip(target, tip);
    }
  }

  showTooltip(element, tip) {
    const title = this.tooltip.querySelector('.help-tooltip-title');
    const content = this.tooltip.querySelector('.help-tooltip-content');
    const arrow = this.tooltip.querySelector('.help-tooltip-arrow');

    title.textContent = tip.title;
    content.textContent = tip.content;

    const rect = element.getBoundingClientRect();
    const pos = tip.position || 'top';

    let top, left;
    if (pos === 'top') {
      top = rect.top - this.tooltip.offsetHeight - 10;
      left = rect.left + rect.width / 2 - this.tooltip.offsetWidth / 2;
      arrow.style.cssText = 'bottom: -5px; left: 50%; transform: translateX(-50%) rotate(45deg);';
    } else if (pos === 'bottom') {
      top = rect.bottom + 10;
      left = rect.left + rect.width / 2 - this.tooltip.offsetWidth / 2;
      arrow.style.cssText = 'top: -5px; left: 50%; transform: translateX(-50%) rotate(45deg);';
    } else if (pos === 'left') {
      top = rect.top + rect.height / 2 - this.tooltip.offsetHeight / 2;
      left = rect.left - this.tooltip.offsetWidth - 10;
      arrow.style.cssText = 'right: -5px; top: 50%; transform: translateY(-50%) rotate(45deg);';
    } else {
      top = rect.top + rect.height / 2 - this.tooltip.offsetHeight / 2;
      left = rect.right + 10;
      arrow.style.cssText = 'left: -5px; top: 50%; transform: translateY(-50%) rotate(45deg);';
    }

    this.tooltip.style.top = top + 'px';
    this.tooltip.style.left = left + 'px';
    this.tooltip.classList.add('visible');
  }

  hideTooltip() {
    this.tooltip.classList.remove('visible');
  }
}

window.contextualHelp = new ContextualHelpSystem();
`
  }
}

export const contextualHelpSystem = new ContextualHelpSystemService()
