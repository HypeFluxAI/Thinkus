---
id: discussion-synthesizer
version: 1.0.0
model: claude-opus
temperature: 0.3
max_tokens: 3000
---

# 讨论综合器 - 方案生成

## 任务
综合所有专家讨论，生成最终方案。

## 输入变量
- {requirement}: 原始需求
- {discussion_messages}: 所有讨论消息
- {consensus_points}: 已达成共识的点
- {resolved_disagreements}: 已解决的分歧
- {user_decisions}: 用户做出的决定

## 输出格式

```json
{
  "conclusion": {
    "project_name": "项目名称",
    "positioning": "一句话定位",
    "target_users": "目标用户",
    "core_value": "核心价值",
    
    "features": {
      "mvp": [
        {
          "name": "功能名",
          "description": "描述",
          "priority": 1,
          "expert_notes": "专家建议"
        }
      ],
      "phase2": [],
      "future": []
    },
    
    "tech_decisions": {
      "stack": "Next.js + Tailwind + MongoDB",
      "key_decisions": ["决策1", "决策2"],
      "technical_notes": "技术说明"
    },
    
    "design_direction": {
      "style": "风格",
      "key_ux_points": ["UX要点"],
      "design_notes": "设计说明"
    },
    
    "risks": [
      {
        "type": "technical|business|scope",
        "description": "风险描述",
        "mitigation": "缓解措施"
      }
    ],
    
    "recommendations": ["建议1", "建议2"],
    
    "estimated": {
      "complexity": "L3",
      "development_time": "2-3天",
      "price_range": "$499-699"
    }
  },
  
  "expert_approvals": {
    "mike": { "approved": true, "note": "建议先做MVP验证" },
    "elena": { "approved": true, "note": "注意首次体验" },
    "david": { "approved": true, "note": "技术方案可行" }
  },
  
  "next_steps": [
    "用户确认方案",
    "支付",
    "开始开发"
  ]
}
```

## 综合原则

```yaml
1. 尊重共识:
   - 所有专家同意的点直接采纳
   - 不要推翻已达成的共识

2. 用户优先:
   - 用户明确的决定优先级最高
   - 专家建议供参考

3. MVP原则:
   - 功能尽量精简
   - 核心功能优先
   - 复杂功能放后期

4. 平衡各方:
   - 产品需求 vs 技术可行性
   - 用户体验 vs 开发成本
   - 理想方案 vs 现实约束
```

## 示例输出

```json
{
  "conclusion": {
    "project_name": "萌宠圈",
    "positioning": "宠物主人的温暖社区",
    "target_users": "25-35岁城市养宠人群",
    "core_value": "分享宠物日常，交流养宠经验",
    
    "features": {
      "mvp": [
        {
          "name": "用户系统",
          "description": "手机号注册+微信登录",
          "priority": 1,
          "expert_notes": "Elena建议简化注册流程"
        },
        {
          "name": "宠物档案",
          "description": "添加宠物基本信息",
          "priority": 2,
          "expert_notes": "Mike建议MVP只保留基础字段"
        },
        {
          "name": "动态发布",
          "description": "发布图片+文字动态",
          "priority": 3,
          "expert_notes": "核心功能"
        },
        {
          "name": "社交互动",
          "description": "点赞、评论、关注",
          "priority": 4,
          "expert_notes": "David建议第一版不做私信"
        }
      ],
      "phase2": [
        { "name": "私信功能", "description": "用户间私信" },
        { "name": "话题标签", "description": "内容分类" }
      ],
      "future": [
        { "name": "线下活动", "description": "组织遛狗活动" },
        { "name": "宠物服务", "description": "美容、寄养对接" }
      ]
    },
    
    "tech_decisions": {
      "stack": "Next.js 14 + Tailwind + MongoDB",
      "key_decisions": [
        "图片存储用Cloudflare R2",
        "第一版不做实时推送",
        "Feed按时间倒序排列"
      ],
      "technical_notes": "David认为技术方案成熟可行"
    },
    
    "design_direction": {
      "style": "温暖、可爱、清新",
      "key_ux_points": [
        "注册3步内完成",
        "首页有推荐内容",
        "发布按钮明显"
      ],
      "design_notes": "Elena强调首次体验很重要"
    },
    
    "risks": [
      {
        "type": "business",
        "description": "冷启动困难",
        "mitigation": "Lisa建议先邀请宠物KOL"
      }
    ],
    
    "recommendations": [
      "建议邀请50个宠物博主作为种子用户",
      "MVP先验证核心社交功能再扩展"
    ],
    
    "estimated": {
      "complexity": "L3",
      "development_time": "2-3天",
      "price_range": "$499-699"
    }
  },
  
  "expert_approvals": {
    "mike": { "approved": true, "note": "MVP功能合理" },
    "elena": { "approved": true, "note": "UX方向正确" },
    "david": { "approved": true, "note": "技术可行" }
  }
}
```
