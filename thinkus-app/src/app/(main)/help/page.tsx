'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { FeedbackDialog } from '@/components/feedback'
import {
  HelpCircle,
  MessageSquare,
  BookOpen,
  Zap,
  Users,
  Target,
  Calendar,
  Brain,
  Search,
  ArrowLeft,
  Mail,
  ExternalLink,
  Lightbulb,
  Sparkles,
} from 'lucide-react'

interface FAQItem {
  id: string
  question: string
  answer: string
  category: string
}

const FAQ_ITEMS: FAQItem[] = [
  {
    id: 'what-is-thinkus',
    question: '什么是 Thinkus？',
    answer: 'Thinkus 是一个 AI 驱动的创业成功平台。我们提供专属的 AI 高管团队，帮助您从想法到产品的全流程。只需说出您的想法，AI 团队会进行专业讨论、方案设计、开发执行，直到产品上线。',
    category: '基础问题',
  },
  {
    id: 'ai-team',
    question: 'AI 高管团队包括哪些角色？',
    answer: '您的专属 AI 团队包含 18 位高管，涵盖：CEO（战略规划）、CTO（技术架构）、CPO（产品设计）、CMO（市场策略）、CFO（财务分析）等核心高管，以及安全专家、区块链专家、增长专家等专业人才。他们会根据您的需求协同工作。',
    category: '基础问题',
  },
  {
    id: 'how-to-start',
    question: '如何开始第一个项目？',
    answer: '非常简单！1) 点击\"创建项目\"按钮；2) 用自然语言描述您的想法；3) AI 团队会进行讨论并生成方案；4) 确认方案后支付；5) 等待 AI 团队开发完成。整个过程都有清晰的进度展示。',
    category: '使用指南',
  },
  {
    id: 'discussion-mode',
    question: '什么是团队讨论？有什么用？',
    answer: '团队讨论是我们的核心功能之一。当您提出需求时，多位 AI 高管会从各自专业角度进行讨论，互相质疑和补充，最终形成更全面的方案。您可以选择快速模式（看结论）、标准模式（看关键讨论）或深度模式（完整参与）。',
    category: '使用指南',
  },
  {
    id: 'decision-confirm',
    question: '为什么有些决策需要我确认？',
    answer: '为了保护您的利益，我们将决策分为四个等级：L0（自动执行）、L1（通知您）、L2（需要确认）、L3（关键决策）。高风险操作如修改核心功能、超预算支出等都会等待您的确认。您可以在\"自动化设置\"中调整这些规则。',
    category: '使用指南',
  },
  {
    id: 'standup-meeting',
    question: '每日站会是什么？',
    answer: '每日站会是 AI 团队的日常协调会议。在站会中，各高管会汇报进度、讨论问题、制定当日计划。您可以设置站会时间，系统会自动进行并向您汇报结果。这确保项目始终在正轨上运行。',
    category: '功能介绍',
  },
  {
    id: 'memory-system',
    question: '系统如何记住我的偏好？',
    answer: '我们的记忆系统会在每次交互中学习：您的决策风格、偏好的沟通方式、项目背景等。这些记忆分为用户层（跨项目通用）和项目层（特定项目）。随着使用时间增长，AI 团队会越来越了解您，提供更精准的服务。',
    category: '功能介绍',
  },
  {
    id: 'pricing',
    question: '定价是如何计算的？',
    answer: '项目定价基于复杂度等级（L1-L5）和可选服务。L1 简单落地页 $49 起，L5 平台级产品 $2999 起。我们在方案确认阶段会给出明确报价，没有隐藏费用。您也可以选择 SEO 优化、数据分析等增值服务。',
    category: '费用相关',
  },
  {
    id: 'subscription',
    question: '订阅计划有哪些？',
    answer: '我们提供四种订阅计划：免费版（基础功能）、Pro 版（更多讨论次数）、Team 版（团队协作）、Enterprise 版（定制服务）。订阅主要影响每月可用的 AI 交互次数和高级功能。',
    category: '费用相关',
  },
  {
    id: 'data-security',
    question: '我的数据安全吗？',
    answer: '绝对安全。我们采用业界领先的安全措施：数据加密存储、严格的访问控制、定期安全审计。您的项目数据、对话记录、敏感凭证都有完善的保护。我们不会将您的数据用于其他目的或分享给第三方。',
    category: '安全隐私',
  },
]

const CATEGORIES = [
  { id: 'all', label: '全部', icon: HelpCircle },
  { id: '基础问题', label: '基础问题', icon: BookOpen },
  { id: '使用指南', label: '使用指南', icon: Zap },
  { id: '功能介绍', label: '功能介绍', icon: Sparkles },
  { id: '费用相关', label: '费用相关', icon: Target },
  { id: '安全隐私', label: '安全隐私', icon: Users },
]

const QUICK_LINKS = [
  {
    title: '创建项目',
    description: '开始您的第一个 AI 驱动项目',
    href: '/create',
    icon: Sparkles,
    color: 'text-purple-500',
  },
  {
    title: 'AI 团队',
    description: '了解您的专属高管团队',
    href: '/executives',
    icon: Users,
    color: 'text-blue-500',
  },
  {
    title: 'CEO 工作台',
    description: '管理决策和全局视图',
    href: '/ceo',
    icon: Target,
    color: 'text-orange-500',
  },
  {
    title: '自动化设置',
    description: '配置自动执行规则',
    href: '/settings/automation',
    icon: Zap,
    color: 'text-green-500',
  },
]

export default function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  const filteredFAQ = FAQ_ITEMS.filter((item) => {
    const matchesSearch =
      searchQuery === '' ||
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory =
      selectedCategory === 'all' || item.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <span className="font-semibold ml-4">帮助中心</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <section className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
            <HelpCircle className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">有什么可以帮您？</h1>
          <p className="text-muted-foreground mb-6">
            搜索常见问题或浏览帮助文档
          </p>

          {/* Search */}
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索问题..."
              className="pl-10 h-12"
            />
          </div>
        </section>

        {/* Quick Links */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold mb-4">快速入口</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {QUICK_LINKS.map((link) => {
              const Icon = link.icon
              return (
                <Link key={link.href} href={link.href}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 bg-muted rounded-lg ${link.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-medium">{link.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {link.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold mb-4">常见问题</h2>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-6">
            {CATEGORIES.map((category) => {
              const Icon = category.icon
              return (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <Icon className="h-4 w-4 mr-1" />
                  {category.label}
                </Button>
              )
            })}
          </div>

          {/* FAQ Accordion */}
          {filteredFAQ.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <Accordion type="single" collapsible className="w-full">
                  {filteredFAQ.map((item) => (
                    <AccordionItem key={item.id} value={item.id}>
                      <AccordionTrigger className="px-4 hover:no-underline">
                        <div className="flex items-center gap-3 text-left">
                          <span>{item.question}</span>
                          <Badge variant="secondary" className="text-xs">
                            {item.category}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <p className="text-muted-foreground">{item.answer}</p>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Search className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">未找到相关问题</p>
                <p className="text-sm text-muted-foreground mt-1">
                  尝试其他关键词或联系我们
                </p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Contact Section */}
        <section>
          <h2 className="text-lg font-semibold mb-4">需要更多帮助？</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <MessageSquare className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base">提交反馈</CardTitle>
                    <CardDescription>
                      告诉我们您的问题或建议
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <FeedbackDialog
                  trigger={
                    <Button className="w-full">
                      <Lightbulb className="h-4 w-4 mr-2" />
                      提交反馈
                    </Button>
                  }
                  page="/help"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Mail className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base">联系我们</CardTitle>
                    <CardDescription>
                      发送邮件获取人工支持
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <a href="mailto:support@thinkus.ai">
                  <Button variant="outline" className="w-full">
                    <Mail className="h-4 w-4 mr-2" />
                    support@thinkus.ai
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </Button>
                </a>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  )
}
