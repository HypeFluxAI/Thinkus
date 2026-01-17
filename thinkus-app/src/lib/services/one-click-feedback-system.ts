/**
 * 一键反馈系统
 *
 * 功能：
 * - 用户可以快速提交反馈（截图+一句话）
 * - 不需要填写复杂表单
 * - 自动收集上下文信息
 */

// ============================================
// 类型定义
// ============================================

export type FeedbackType = 'bug' | 'suggestion' | 'praise' | 'question'

export interface Feedback {
  feedbackId: string
  userId: string
  userName: string
  projectId: string

  type: FeedbackType
  message: string
  screenshot?: string
  rating?: 1 | 2 | 3 | 4 | 5

  // 自动收集的上下文
  context: {
    pageUrl: string
    pageTitle: string
    userAgent: string
    timestamp: Date
    sessionDuration: number
  }

  status: 'submitted' | 'read' | 'replied' | 'resolved'
  createdAt: Date
}

const FEEDBACK_TYPES: Record<FeedbackType, { label: string; icon: string; color: string; placeholder: string }> = {
  bug: { label: '报告问题', icon: '🐛', color: '#EF4444', placeholder: '遇到了什么问题？' },
  suggestion: { label: '提建议', icon: '💡', color: '#F59E0B', placeholder: '有什么改进建议？' },
  praise: { label: '点个赞', icon: '👍', color: '#10B981', placeholder: '哪里做得好？' },
  question: { label: '问问题', icon: '❓', color: '#3B82F6', placeholder: '有什么疑问？' }
}

// ============================================
// 服务实现
// ============================================

export class OneClickFeedbackSystemService {

  async submitFeedback(params: {
    userId: string
    userName: string
    projectId: string
    type: FeedbackType
    message: string
    screenshot?: string
    rating?: 1 | 2 | 3 | 4 | 5
    context: Feedback['context']
  }): Promise<Feedback> {
    const feedbackId = `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const feedback: Feedback = {
      feedbackId,
      ...params,
      status: 'submitted',
      createdAt: new Date()
    }

    // 存储反馈
    // await db.feedbacks.create(feedback)

    // 发送通知给团队
    // await this.notifyTeam(feedback)

    return feedback
  }

  generateFeedbackWidgetScript(): string {
    return `
// 一键反馈组件
class FeedbackWidget {
  constructor() {
    this.isOpen = false;
    this.selectedType = null;
    this.createElements();
  }

  createElements() {
    this.container = document.createElement('div');
    this.container.innerHTML = \`
      <button class="feedback-toggle" title="反馈">💬</button>

      <div class="feedback-panel">
        <div class="feedback-header">
          <span>快速反馈</span>
          <button class="feedback-close">✕</button>
        </div>

        <div class="feedback-types">
          <button class="feedback-type" data-type="bug">🐛 报告问题</button>
          <button class="feedback-type" data-type="suggestion">💡 提建议</button>
          <button class="feedback-type" data-type="praise">👍 点个赞</button>
          <button class="feedback-type" data-type="question">❓ 问问题</button>
        </div>

        <div class="feedback-form" style="display:none;">
          <textarea class="feedback-input" placeholder="说点什么..."></textarea>
          <div class="feedback-actions">
            <button class="feedback-screenshot">📸 截图</button>
            <button class="feedback-submit">发送</button>
          </div>
        </div>

        <div class="feedback-success" style="display:none;">
          <div class="feedback-success-icon">✅</div>
          <div class="feedback-success-text">感谢您的反馈！</div>
        </div>
      </div>
    \`;

    const style = document.createElement('style');
    style.textContent = \`
      .feedback-toggle {
        position: fixed;
        bottom: 100px;
        right: 20px;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: #6366F1;
        border: none;
        font-size: 20px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        z-index: 9998;
      }

      .feedback-panel {
        display: none;
        position: fixed;
        bottom: 160px;
        right: 20px;
        width: 320px;
        background: white;
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.15);
        z-index: 9999;
        overflow: hidden;
      }
      .feedback-panel.open { display: block; }

      .feedback-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
        background: #6366F1;
        color: white;
        font-weight: 600;
      }
      .feedback-close {
        background: none;
        border: none;
        color: white;
        font-size: 18px;
        cursor: pointer;
      }

      .feedback-types {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        padding: 16px;
      }
      .feedback-type {
        padding: 16px;
        border: 2px solid #E5E7EB;
        border-radius: 12px;
        background: white;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
      }
      .feedback-type:hover { border-color: #6366F1; background: #EEF2FF; }
      .feedback-type.selected { border-color: #6366F1; background: #EEF2FF; }

      .feedback-form { padding: 16px; }
      .feedback-input {
        width: 100%;
        border: 2px solid #E5E7EB;
        border-radius: 12px;
        padding: 12px;
        font-size: 14px;
        resize: none;
        height: 100px;
        margin-bottom: 12px;
      }
      .feedback-input:focus { outline: none; border-color: #6366F1; }

      .feedback-actions { display: flex; gap: 8px; }
      .feedback-screenshot {
        flex: 1;
        padding: 12px;
        border: 1px solid #E5E7EB;
        border-radius: 8px;
        background: white;
        cursor: pointer;
      }
      .feedback-submit {
        flex: 1;
        padding: 12px;
        border: none;
        border-radius: 8px;
        background: #6366F1;
        color: white;
        font-weight: 600;
        cursor: pointer;
      }

      .feedback-success {
        padding: 48px 16px;
        text-align: center;
      }
      .feedback-success-icon { font-size: 48px; margin-bottom: 12px; }
      .feedback-success-text { font-size: 16px; color: #10B981; font-weight: 600; }
    \`;
    document.head.appendChild(style);
    document.body.appendChild(this.container);

    this.bindEvents();
  }

  bindEvents() {
    const toggle = this.container.querySelector('.feedback-toggle');
    const panel = this.container.querySelector('.feedback-panel');
    const close = this.container.querySelector('.feedback-close');
    const types = this.container.querySelectorAll('.feedback-type');
    const form = this.container.querySelector('.feedback-form');
    const submit = this.container.querySelector('.feedback-submit');
    const success = this.container.querySelector('.feedback-success');

    toggle.onclick = () => {
      this.isOpen = !this.isOpen;
      panel.classList.toggle('open', this.isOpen);
    };

    close.onclick = () => {
      this.isOpen = false;
      panel.classList.remove('open');
    };

    types.forEach(btn => {
      btn.onclick = () => {
        types.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.selectedType = btn.dataset.type;
        this.container.querySelector('.feedback-types').style.display = 'none';
        form.style.display = 'block';
      };
    });

    submit.onclick = async () => {
      const message = this.container.querySelector('.feedback-input').value;
      if (!message.trim()) return;

      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: this.selectedType,
          message,
          context: {
            pageUrl: window.location.href,
            pageTitle: document.title,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
          }
        })
      });

      form.style.display = 'none';
      success.style.display = 'block';

      setTimeout(() => {
        this.isOpen = false;
        panel.classList.remove('open');
        this.reset();
      }, 2000);
    };
  }

  reset() {
    this.selectedType = null;
    this.container.querySelector('.feedback-types').style.display = 'grid';
    this.container.querySelector('.feedback-form').style.display = 'none';
    this.container.querySelector('.feedback-success').style.display = 'none';
    this.container.querySelector('.feedback-input').value = '';
    this.container.querySelectorAll('.feedback-type').forEach(b => b.classList.remove('selected'));
  }
}

window.feedbackWidget = new FeedbackWidget();
`
  }
}

export const oneClickFeedbackSystem = new OneClickFeedbackSystemService()
