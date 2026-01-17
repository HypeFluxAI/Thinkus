/**
 * 首条数据创建向导服务
 *
 * 功能：
 * - 手把手教用户创建第一条数据
 * - 降低用户的"动手"心理门槛
 * - 让用户感受到"我做到了"的成就感
 */

// ============================================
// 类型定义
// ============================================

export interface DataCreationWizard {
  productType: string
  entityName: string          // 如"商品"、"文章"、"用户"
  entityNamePlural: string    // 复数形式

  steps: DataCreationStep[]
  completionReward: {
    badge: string
    message: string
    confetti: boolean
  }
}

export interface DataCreationStep {
  id: string
  stepNumber: number
  title: string               // 如"给它起个名字"
  instruction: string         // 详细说明
  fieldName: string           // 字段名
  fieldType: 'text' | 'textarea' | 'number' | 'select' | 'image' | 'date'
  placeholder?: string
  options?: { value: string; label: string }[]
  required: boolean
  example?: string            // 示例值
  tip?: string                // 小贴士
}

// ============================================
// 产品类型配置
// ============================================

const WIZARD_CONFIGS: Record<string, DataCreationWizard> = {
  ecommerce: {
    productType: 'ecommerce',
    entityName: '商品',
    entityNamePlural: '商品',
    steps: [
      {
        id: 'name',
        stepNumber: 1,
        title: '给商品起个名字',
        instruction: '起一个吸引人的商品名称',
        fieldName: 'name',
        fieldType: 'text',
        placeholder: '如：精选有机苹果 5斤装',
        required: true,
        example: '精选有机苹果',
        tip: '好的商品名要简洁、突出卖点'
      },
      {
        id: 'price',
        stepNumber: 2,
        title: '设置价格',
        instruction: '这个商品卖多少钱？',
        fieldName: 'price',
        fieldType: 'number',
        placeholder: '输入价格，如 29.9',
        required: true,
        example: '29.9',
        tip: '可以先设置一个测试价格，之后随时修改'
      },
      {
        id: 'image',
        stepNumber: 3,
        title: '上传商品图片',
        instruction: '一张好图胜过千言万语',
        fieldName: 'image',
        fieldType: 'image',
        required: false,
        tip: '建议使用正方形图片，大小不超过2MB'
      },
      {
        id: 'description',
        stepNumber: 4,
        title: '写几句介绍',
        instruction: '简单介绍一下这个商品的特点',
        fieldName: 'description',
        fieldType: 'textarea',
        placeholder: '如：新鲜采摘，产地直发...',
        required: false,
        example: '精选优质产区，新鲜采摘，48小时送达',
        tip: '不用写太多，简单几句就好'
      }
    ],
    completionReward: {
      badge: '首个商品',
      message: '太棒了！您的第一个商品已经创建成功！',
      confetti: true
    }
  },

  'web-app': {
    productType: 'web-app',
    entityName: '内容',
    entityNamePlural: '内容',
    steps: [
      {
        id: 'title',
        stepNumber: 1,
        title: '写个标题',
        instruction: '给这条内容起个标题',
        fieldName: 'title',
        fieldType: 'text',
        placeholder: '如：今天的工作总结',
        required: true
      },
      {
        id: 'content',
        stepNumber: 2,
        title: '写点内容',
        instruction: '写下您想记录的内容',
        fieldName: 'content',
        fieldType: 'textarea',
        placeholder: '随便写点什么...',
        required: true,
        tip: '先写个简单的，熟悉之后再写详细的'
      }
    ],
    completionReward: {
      badge: '内容创作者',
      message: '很好！您已经掌握了创建内容的方法！',
      confetti: true
    }
  }
}

// ============================================
// 服务实现
// ============================================

export class FirstDataCreationWizardService {

  getWizardConfig(productType: string): DataCreationWizard | null {
    return WIZARD_CONFIGS[productType] || WIZARD_CONFIGS['web-app']
  }

  generateWizardPageHtml(config: DataCreationWizard, currentStep: number = 0): string {
    const step = config.steps[currentStep]
    const progress = Math.round(((currentStep + 1) / config.steps.length) * 100)

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>创建您的第一个${config.entityName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .card {
      background: white;
      border-radius: 24px;
      padding: 40px;
      max-width: 480px;
      width: 100%;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    }

    .progress-bar {
      background: #E5E7EB;
      height: 6px;
      border-radius: 3px;
      margin-bottom: 32px;
    }
    .progress-fill {
      background: linear-gradient(90deg, #10B981, #059669);
      height: 100%;
      border-radius: 3px;
      transition: width 0.3s;
    }

    .step-indicator {
      font-size: 14px;
      color: #6B7280;
      margin-bottom: 8px;
    }
    .step-title {
      font-size: 24px;
      font-weight: 700;
      color: #1F2937;
      margin-bottom: 8px;
    }
    .step-instruction {
      font-size: 16px;
      color: #6B7280;
      margin-bottom: 24px;
    }

    .form-field {
      margin-bottom: 24px;
    }
    .form-input {
      width: 100%;
      border: 2px solid #E5E7EB;
      border-radius: 12px;
      padding: 16px;
      font-size: 16px;
      transition: border-color 0.2s;
    }
    .form-input:focus {
      outline: none;
      border-color: #3B82F6;
    }
    .form-textarea {
      resize: none;
      height: 120px;
    }

    .example {
      background: #F3F4F6;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 16px;
      font-size: 14px;
      color: #6B7280;
    }
    .example-label { font-weight: 500; margin-right: 8px; }

    .tip {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 13px;
      color: #6B7280;
      margin-top: 12px;
    }
    .tip-icon { flex-shrink: 0; }

    .buttons {
      display: flex;
      gap: 12px;
      margin-top: 32px;
    }
    .btn {
      flex: 1;
      padding: 16px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: transform 0.2s;
    }
    .btn:hover { transform: translateY(-2px); }
    .btn-secondary {
      background: #F3F4F6;
      color: #374151;
    }
    .btn-primary {
      background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
      color: white;
    }

    /* 完成状态 */
    .completion {
      text-align: center;
    }
    .completion-icon { font-size: 80px; margin-bottom: 24px; }
    .completion-title {
      font-size: 24px;
      font-weight: 700;
      color: #10B981;
      margin-bottom: 12px;
    }
    .completion-message {
      font-size: 16px;
      color: #6B7280;
      margin-bottom: 24px;
    }
    .badge {
      display: inline-block;
      background: #FEF3C7;
      color: #92400E;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 32px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="progress-bar">
      <div class="progress-fill" style="width: ${progress}%"></div>
    </div>

    <div class="step-indicator">步骤 ${step.stepNumber}/${config.steps.length}</div>
    <h1 class="step-title">${step.title}</h1>
    <p class="step-instruction">${step.instruction}</p>

    ${step.example ? `
    <div class="example">
      <span class="example-label">示例：</span>${step.example}
    </div>
    ` : ''}

    <div class="form-field">
      ${step.fieldType === 'textarea' ? `
        <textarea class="form-input form-textarea" placeholder="${step.placeholder || ''}"></textarea>
      ` : step.fieldType === 'number' ? `
        <input type="number" class="form-input" placeholder="${step.placeholder || ''}" step="0.01">
      ` : step.fieldType === 'image' ? `
        <div style="border: 2px dashed #E5E7EB; border-radius: 12px; padding: 32px; text-align: center; cursor: pointer;">
          <div style="font-size: 48px; margin-bottom: 12px;">📷</div>
          <div style="color: #6B7280;">点击上传图片</div>
        </div>
      ` : `
        <input type="text" class="form-input" placeholder="${step.placeholder || ''}">
      `}

      ${step.tip ? `
      <div class="tip">
        <span class="tip-icon">💡</span>
        <span>${step.tip}</span>
      </div>
      ` : ''}
    </div>

    <div class="buttons">
      ${currentStep > 0 ? '<button class="btn btn-secondary" onclick="prevStep()">上一步</button>' : ''}
      <button class="btn btn-primary" onclick="nextStep()">
        ${currentStep === config.steps.length - 1 ? '完成创建' : '下一步'}
      </button>
    </div>
  </div>

  <script>
    let currentStep = ${currentStep};
    const totalSteps = ${config.steps.length};

    function nextStep() {
      if (currentStep < totalSteps - 1) {
        currentStep++;
        window.location.href = '?step=' + currentStep;
      } else {
        // 完成
        window.location.href = '/wizard/complete';
      }
    }

    function prevStep() {
      if (currentStep > 0) {
        currentStep--;
        window.location.href = '?step=' + currentStep;
      }
    }
  </script>
</body>
</html>`
  }

  generateCompletionPageHtml(config: DataCreationWizard): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>创建成功！</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 24px;
      padding: 48px 40px;
      max-width: 420px;
      width: 100%;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    }
    .icon { font-size: 80px; margin-bottom: 24px; animation: bounce 1s ease infinite; }
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    .title { font-size: 28px; font-weight: 700; color: #10B981; margin-bottom: 12px; }
    .message { font-size: 16px; color: #6B7280; margin-bottom: 24px; }
    .badge {
      display: inline-block;
      background: #FEF3C7;
      color: #92400E;
      padding: 10px 20px;
      border-radius: 24px;
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 32px;
    }
    .btn {
      display: block;
      width: 100%;
      padding: 16px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      margin-bottom: 12px;
    }
    .btn-primary { background: #10B981; color: white; }
    .btn-secondary { background: #F3F4F6; color: #374151; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🎉</div>
    <h1 class="title">${config.completionReward.message}</h1>
    <p class="message">您已经学会了创建${config.entityName}的方法</p>
    <div class="badge">🏆 解锁徽章：${config.completionReward.badge}</div>
    <button class="btn btn-primary" onclick="location.href='/dashboard'">返回主页</button>
    <button class="btn btn-secondary" onclick="location.href='/create'">再创建一个</button>
  </div>
</body>
</html>`
  }
}

export const firstDataCreationWizard = new FirstDataCreationWizardService()
