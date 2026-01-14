// ========== Token 消耗定价算法 ==========

// 每个功能的预估token消耗（开发+测试完整周期）
const TOKEN_ESTIMATES = {
  // 每个功能按优先级的token消耗
  perFeature: {
    P0: 80000,   // 核心功能：需求分析(5k) + 设计(10k) + 代码生成(30k) + 测试(15k) + 调试修复(20k)
    P1: 50000,   // 重要功能：需求(3k) + 设计(5k) + 代码(20k) + 测试(10k) + 调试(12k)
    P2: 25000,   // 简单功能：需求(2k) + 设计(3k) + 代码(10k) + 测试(5k) + 调试(5k)
  },
  // 项目基础开销（架构设计、配置、部署等）
  projectBase: 50000,
  // 集成测试额外开销比例
  integrationOverhead: 0.2, // 20%
}

// Claude API 价格 (USD per 1M tokens)
// Sonnet: Input $3, Output $15, 假设 1:2 输入输出比例 ≈ $11/1M
const TOKEN_PRICE_PER_MILLION = 11

// 利润倍数
const PROFIT_MULTIPLIER = 4

// 最低价格保障
const MIN_PRICE = 29

export interface PriceBreakdown {
  p0Count: number
  p1Count: number
  p2Count: number
  p0Tokens: number
  p1Tokens: number
  p2Tokens: number
  baseTokens: number
  integrationTokens: number
}

export interface PriceCalculationResult {
  estimatedTokens: number
  tokenCost: number
  finalPrice: number
  breakdown: PriceBreakdown
}

/**
 * 根据功能列表计算项目价格
 * 价格 = (预估token消耗 × token单价) × 4倍
 */
export function calculateProjectPrice(features: Array<{ priority: string }>): PriceCalculationResult {
  const p0Features = features.filter(f => f.priority === 'P0')
  const p1Features = features.filter(f => f.priority === 'P1')
  const p2Features = features.filter(f => f.priority === 'P2')

  // 计算各类功能的token消耗
  const p0Tokens = p0Features.length * TOKEN_ESTIMATES.perFeature.P0
  const p1Tokens = p1Features.length * TOKEN_ESTIMATES.perFeature.P1
  const p2Tokens = p2Features.length * TOKEN_ESTIMATES.perFeature.P2
  const baseTokens = TOKEN_ESTIMATES.projectBase

  // 功能总token
  const featureTokens = p0Tokens + p1Tokens + p2Tokens + baseTokens

  // 集成测试开销
  const integrationTokens = Math.round(featureTokens * TOKEN_ESTIMATES.integrationOverhead)

  // 总token消耗
  const estimatedTokens = featureTokens + integrationTokens

  // Token成本 (USD)
  const tokenCost = (estimatedTokens / 1_000_000) * TOKEN_PRICE_PER_MILLION

  // 最终价格 = token成本 × 4，向上取整到整数
  const rawPrice = tokenCost * PROFIT_MULTIPLIER
  const finalPrice = Math.max(MIN_PRICE, Math.ceil(rawPrice))

  return {
    estimatedTokens,
    tokenCost: Math.round(tokenCost * 100) / 100,
    finalPrice,
    breakdown: {
      p0Count: p0Features.length,
      p1Count: p1Features.length,
      p2Count: p2Features.length,
      p0Tokens,
      p1Tokens,
      p2Tokens,
      baseTokens,
      integrationTokens,
    },
  }
}

// Price IDs for different complexity levels (保留用于参考)
export const PRICE_CONFIG: Record<string, { amount: number; description: string }> = {
  L1: { amount: 29, description: '简单应用 - 1-3个功能' },
  L2: { amount: 49, description: '标准应用 - 4-6个功能' },
  L3: { amount: 99, description: '复杂应用 - 7-10个功能' },
  L4: { amount: 199, description: '企业级应用 - 11-15个功能' },
  L5: { amount: 399, description: '平台级产品 - 15+个功能' },
}

export function getPriceForComplexity(complexity: string): number {
  return PRICE_CONFIG[complexity]?.amount || PRICE_CONFIG.L2.amount
}
