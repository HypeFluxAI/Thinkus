/**
 * 运营交付看板服务
 * 为运营团队提供所有项目交付状态的可视化视图
 */

// ========== 类型定义 ==========

export type DeliveryStage =
  | 'backlog'        // 待处理
  | 'in_development' // 开发中
  | 'testing'        // 测试中
  | 'staging'        // 预发环境
  | 'deploying'      // 部署中
  | 'delivered'      // 已交付
  | 'monitoring';    // 监控中

export type Priority = 'urgent' | 'high' | 'normal' | 'low';

export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

export interface DeliveryItem {
  id: string;
  projectId: string;
  projectName: string;
  productType: string;

  // 客户信息
  clientName: string;
  clientEmail: string;

  // 状态
  stage: DeliveryStage;
  priority: Priority;
  progress: number;  // 0-100

  // SLA
  slaDeadline?: Date;
  slaDaysRemaining?: number;
  slaStatus: 'on_track' | 'at_risk' | 'breached';

  // 负责人
  assignee?: string;

  // 阻塞问题
  blockers: Blocker[];

  // 最近活动
  lastActivity?: Activity;
  lastUpdatedAt: Date;

  // 健康状态（已交付的项目）
  healthStatus?: HealthStatus;

  // 时间
  createdAt: Date;
  startedAt?: Date;
  deliveredAt?: Date;
}

export interface Blocker {
  id: string;
  type: 'bug' | 'dependency' | 'client' | 'resource' | 'other';
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  createdAt: Date;
  resolvedAt?: Date;
}

export interface Activity {
  type: string;
  description: string;
  actor: string;
  timestamp: Date;
}

export interface BoardColumn {
  stage: DeliveryStage;
  label: string;
  items: DeliveryItem[];
  count: number;
  color: string;
}

export interface BoardStats {
  totalProjects: number;
  byStage: Record<DeliveryStage, number>;
  byPriority: Record<Priority, number>;
  slaAtRisk: number;
  slaBreached: number;
  avgDeliveryDays: number;
  deliveredThisWeek: number;
  deliveredThisMonth: number;
  healthyProjects: number;
  warningProjects: number;
  criticalProjects: number;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  activeProjects: number;
  capacity: number;  // 最大项目数
}

// ========== 阶段配置 ==========

const STAGE_CONFIG: Record<DeliveryStage, {
  label: string;
  color: string;
  order: number;
}> = {
  backlog: { label: '待处理', color: '#6b7280', order: 1 },
  in_development: { label: '开发中', color: '#3b82f6', order: 2 },
  testing: { label: '测试中', color: '#8b5cf6', order: 3 },
  staging: { label: '预发布', color: '#f59e0b', order: 4 },
  deploying: { label: '部署中', color: '#ec4899', order: 5 },
  delivered: { label: '已交付', color: '#10b981', order: 6 },
  monitoring: { label: '监控中', color: '#06b6d4', order: 7 },
};

const PRIORITY_CONFIG: Record<Priority, {
  label: string;
  color: string;
  slaMultiplier: number;
}> = {
  urgent: { label: '紧急', color: '#ef4444', slaMultiplier: 0.5 },
  high: { label: '高', color: '#f97316', slaMultiplier: 0.75 },
  normal: { label: '普通', color: '#3b82f6', slaMultiplier: 1 },
  low: { label: '低', color: '#6b7280', slaMultiplier: 1.5 },
};

// ========== 服务实现 ==========

export class OpsDeliveryBoardService {
  private items: Map<string, DeliveryItem> = new Map();
  private team: Map<string, TeamMember> = new Map();

  /**
   * 添加交付项目
   */
  addItem(input: Omit<DeliveryItem, 'id' | 'createdAt' | 'lastUpdatedAt' | 'slaStatus' | 'blockers'>): DeliveryItem {
    const id = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const item: DeliveryItem = {
      ...input,
      id,
      createdAt: now,
      lastUpdatedAt: now,
      slaStatus: 'on_track',
      blockers: [],
    };

    // 计算 SLA 状态
    if (item.slaDeadline) {
      item.slaDaysRemaining = Math.ceil((item.slaDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      item.slaStatus = this.calculateSlaStatus(item.slaDaysRemaining, item.progress);
    }

    this.items.set(id, item);
    return item;
  }

  /**
   * 更新交付项目阶段
   */
  updateStage(itemId: string, stage: DeliveryStage): DeliveryItem | null {
    const item = this.items.get(itemId);
    if (!item) return null;

    item.stage = stage;
    item.lastUpdatedAt = new Date();

    // 记录活动
    item.lastActivity = {
      type: 'stage_change',
      description: `阶段变更为: ${STAGE_CONFIG[stage].label}`,
      actor: 'system',
      timestamp: new Date(),
    };

    // 特殊处理
    if (stage === 'in_development' && !item.startedAt) {
      item.startedAt = new Date();
    }
    if (stage === 'delivered') {
      item.deliveredAt = new Date();
      item.progress = 100;
    }

    return item;
  }

  /**
   * 更新进度
   */
  updateProgress(itemId: string, progress: number): DeliveryItem | null {
    const item = this.items.get(itemId);
    if (!item) return null;

    item.progress = Math.min(100, Math.max(0, progress));
    item.lastUpdatedAt = new Date();

    // 更新 SLA 状态
    if (item.slaDaysRemaining !== undefined) {
      item.slaStatus = this.calculateSlaStatus(item.slaDaysRemaining, item.progress);
    }

    return item;
  }

  /**
   * 添加阻塞问题
   */
  addBlocker(itemId: string, blocker: Omit<Blocker, 'id' | 'createdAt'>): Blocker | null {
    const item = this.items.get(itemId);
    if (!item) return null;

    const newBlocker: Blocker = {
      ...blocker,
      id: `blocker_${Date.now()}`,
      createdAt: new Date(),
    };

    item.blockers.push(newBlocker);
    item.lastUpdatedAt = new Date();

    return newBlocker;
  }

  /**
   * 解决阻塞问题
   */
  resolveBlocker(itemId: string, blockerId: string): boolean {
    const item = this.items.get(itemId);
    if (!item) return false;

    const blocker = item.blockers.find(b => b.id === blockerId);
    if (!blocker) return false;

    blocker.resolvedAt = new Date();
    item.lastUpdatedAt = new Date();

    return true;
  }

  /**
   * 分配负责人
   */
  assignTo(itemId: string, assignee: string): DeliveryItem | null {
    const item = this.items.get(itemId);
    if (!item) return null;

    item.assignee = assignee;
    item.lastUpdatedAt = new Date();

    item.lastActivity = {
      type: 'assigned',
      description: `分配给: ${assignee}`,
      actor: 'system',
      timestamp: new Date(),
    };

    return item;
  }

  /**
   * 获取看板视图
   */
  getBoardView(filters?: {
    assignee?: string;
    priority?: Priority;
    clientName?: string;
  }): BoardColumn[] {
    let items = Array.from(this.items.values());

    // 应用过滤器
    if (filters?.assignee) {
      items = items.filter(i => i.assignee === filters.assignee);
    }
    if (filters?.priority) {
      items = items.filter(i => i.priority === filters.priority);
    }
    if (filters?.clientName) {
      const clientNameFilter = filters.clientName;
      items = items.filter(i => i.clientName.includes(clientNameFilter));
    }

    // 按阶段分组
    const columns: BoardColumn[] = [];

    for (const stage of Object.keys(STAGE_CONFIG) as DeliveryStage[]) {
      const stageItems = items.filter(i => i.stage === stage);

      // 按优先级和 SLA 排序
      stageItems.sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return (a.slaDaysRemaining || 999) - (b.slaDaysRemaining || 999);
      });

      columns.push({
        stage,
        label: STAGE_CONFIG[stage].label,
        items: stageItems,
        count: stageItems.length,
        color: STAGE_CONFIG[stage].color,
      });
    }

    return columns;
  }

  /**
   * 获取统计数据
   */
  getStats(): BoardStats {
    const items = Array.from(this.items.values());

    const stats: BoardStats = {
      totalProjects: items.length,
      byStage: {} as Record<DeliveryStage, number>,
      byPriority: {} as Record<Priority, number>,
      slaAtRisk: 0,
      slaBreached: 0,
      avgDeliveryDays: 0,
      deliveredThisWeek: 0,
      deliveredThisMonth: 0,
      healthyProjects: 0,
      warningProjects: 0,
      criticalProjects: 0,
    };

    // 初始化
    for (const stage of Object.keys(STAGE_CONFIG) as DeliveryStage[]) {
      stats.byStage[stage] = 0;
    }
    for (const priority of Object.keys(PRIORITY_CONFIG) as Priority[]) {
      stats.byPriority[priority] = 0;
    }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let totalDeliveryDays = 0;
    let deliveredCount = 0;

    for (const item of items) {
      stats.byStage[item.stage]++;
      stats.byPriority[item.priority]++;

      if (item.slaStatus === 'at_risk') stats.slaAtRisk++;
      if (item.slaStatus === 'breached') stats.slaBreached++;

      if (item.healthStatus === 'healthy') stats.healthyProjects++;
      if (item.healthStatus === 'warning') stats.warningProjects++;
      if (item.healthStatus === 'critical') stats.criticalProjects++;

      if (item.deliveredAt) {
        deliveredCount++;
        if (item.startedAt) {
          totalDeliveryDays += (item.deliveredAt.getTime() - item.startedAt.getTime()) / (1000 * 60 * 60 * 24);
        }
        if (item.deliveredAt >= weekAgo) stats.deliveredThisWeek++;
        if (item.deliveredAt >= monthAgo) stats.deliveredThisMonth++;
      }
    }

    stats.avgDeliveryDays = deliveredCount > 0 ? Math.round(totalDeliveryDays / deliveredCount) : 0;

    return stats;
  }

  /**
   * 获取需要关注的项目
   */
  getAttentionItems(): DeliveryItem[] {
    const items = Array.from(this.items.values());

    return items.filter(item => {
      // SLA 风险
      if (item.slaStatus === 'at_risk' || item.slaStatus === 'breached') return true;
      // 有未解决的阻塞
      if (item.blockers.some(b => !b.resolvedAt)) return true;
      // 紧急优先级
      if (item.priority === 'urgent') return true;
      // 健康状态异常
      if (item.healthStatus === 'critical' || item.healthStatus === 'warning') return true;
      return false;
    }).sort((a, b) => {
      // 按紧急程度排序
      const urgency = { urgent: 0, high: 1, normal: 2, low: 3 };
      return urgency[a.priority] - urgency[b.priority];
    });
  }

  /**
   * 获取团队负载
   */
  getTeamWorkload(): { member: TeamMember; items: DeliveryItem[]; utilization: number }[] {
    const items = Array.from(this.items.values());
    const members = Array.from(this.team.values());

    return members.map(member => {
      const memberItems = items.filter(i => i.assignee === member.id && i.stage !== 'delivered');
      return {
        member,
        items: memberItems,
        utilization: Math.round((memberItems.length / member.capacity) * 100),
      };
    });
  }

  /**
   * 生成日报
   */
  generateDailyReport(): string {
    const stats = this.getStats();
    const attention = this.getAttentionItems();

    let report = `
# 交付日报 - ${new Date().toLocaleDateString('zh-CN')}

## 概览

| 指标 | 数值 |
|------|------|
| 总项目数 | ${stats.totalProjects} |
| 本周交付 | ${stats.deliveredThisWeek} |
| 本月交付 | ${stats.deliveredThisMonth} |
| 平均交付周期 | ${stats.avgDeliveryDays} 天 |
| SLA 风险 | ${stats.slaAtRisk} |
| SLA 违约 | ${stats.slaBreached} |

## 各阶段项目数

`;

    for (const [stage, count] of Object.entries(stats.byStage)) {
      if (count > 0) {
        report += `- ${STAGE_CONFIG[stage as DeliveryStage].label}: ${count}\n`;
      }
    }

    if (attention.length > 0) {
      report += `\n## 需要关注 (${attention.length})\n\n`;
      for (const item of attention.slice(0, 10)) {
        const reasons = [];
        if (item.slaStatus !== 'on_track') reasons.push(`SLA ${item.slaStatus}`);
        if (item.blockers.some(b => !b.resolvedAt)) reasons.push('有阻塞');
        if (item.priority === 'urgent') reasons.push('紧急');
        if (item.healthStatus === 'critical') reasons.push('健康异常');

        report += `- **${item.projectName}** (${item.clientName}) - ${reasons.join(', ')}\n`;
      }
    }

    return report.trim();
  }

  // ========== 辅助方法 ==========

  private calculateSlaStatus(daysRemaining: number, progress: number): 'on_track' | 'at_risk' | 'breached' {
    if (daysRemaining < 0) return 'breached';

    // 预期进度
    const expectedProgress = 100 - (daysRemaining / 7) * 100; // 假设 7 天周期

    if (progress < expectedProgress - 20) return 'at_risk';
    return 'on_track';
  }

  getItem(id: string): DeliveryItem | undefined {
    return this.items.get(id);
  }

  getAllItems(): DeliveryItem[] {
    return Array.from(this.items.values());
  }
}

// 导出单例
export const opsDeliveryBoard = new OpsDeliveryBoardService();
