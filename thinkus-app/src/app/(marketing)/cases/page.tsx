import { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowRight,
  Building2,
  Globe,
  Smartphone,
  ShoppingCart,
  Briefcase,
  GraduationCap,
  Sparkles,
  Clock,
  Users,
  TrendingUp,
  Quote,
} from 'lucide-react'

export const metadata: Metadata = {
  title: '成功案例 - Thinkus',
  description: '了解 Thinkus 如何帮助企业和创业者快速构建产品',
}

// 案例数据
const CASE_STUDIES = [
  {
    id: 'saas-platform',
    title: 'SaaS 订阅管理平台',
    company: '某科技初创公司',
    industry: 'SaaS',
    icon: <Building2 className="h-6 w-6" />,
    challenge: '需要在有限预算内快速构建一个功能完善的订阅管理平台，包含用户管理、支付集成、数据分析等核心功能。',
    solution: 'Thinkus AI 高管团队在48小时内完成了产品规划和技术选型，并在2周内交付了可用的MVP版本。',
    results: [
      { metric: '开发周期', value: '缩短 70%', icon: <Clock className="h-4 w-4" /> },
      { metric: '开发成本', value: '节省 60%', icon: <TrendingUp className="h-4 w-4" /> },
      { metric: '首批用户', value: '500+', icon: <Users className="h-4 w-4" /> },
    ],
    testimonial: 'Thinkus 让我们的想法快速落地，AI 高管团队的专业建议帮助我们避免了很多常见的创业陷阱。',
    author: '王总监',
    tags: ['SaaS', 'B2B', '订阅管理'],
    featured: true,
  },
  {
    id: 'ecommerce-app',
    title: '跨境电商移动应用',
    company: '某贸易公司',
    industry: '电商',
    icon: <ShoppingCart className="h-6 w-6" />,
    challenge: '传统贸易公司转型数字化，需要快速搭建跨境电商平台，支持多语言、多币种、国际物流追踪。',
    solution: '通过 Thinkus 的讨论系统，AI 团队帮助梳理复杂的业务流程，并生成了完整的技术方案和实施计划。',
    results: [
      { metric: '上线时间', value: '6周', icon: <Clock className="h-4 w-4" /> },
      { metric: '支持语言', value: '8种', icon: <Globe className="h-4 w-4" /> },
      { metric: '月订单量', value: '10,000+', icon: <ShoppingCart className="h-4 w-4" /> },
    ],
    testimonial: '我们没有技术背景，Thinkus 让我们也能快速进入数字化赛道。',
    author: '李经理',
    tags: ['电商', '移动端', '国际化'],
    featured: true,
  },
  {
    id: 'education-platform',
    title: '在线教育直播平台',
    company: '某教育机构',
    industry: '教育',
    icon: <GraduationCap className="h-6 w-6" />,
    challenge: '疫情期间急需将线下课程迁移到线上，需要支持直播、录播、互动答题、作业提交等功能。',
    solution: 'Thinkus 团队快速输出解决方案，整合第三方直播服务，1周内完成核心功能开发。',
    results: [
      { metric: '并发学生', value: '5,000+', icon: <Users className="h-4 w-4" /> },
      { metric: '课程满意度', value: '98%', icon: <TrendingUp className="h-4 w-4" /> },
      { metric: '开发周期', value: '1周', icon: <Clock className="h-4 w-4" /> },
    ],
    testimonial: '紧急时刻 Thinkus 帮了大忙，让我们的业务没有中断。',
    author: '张校长',
    tags: ['教育', '直播', 'B2C'],
    featured: false,
  },
  {
    id: 'internal-tool',
    title: '企业内部管理系统',
    company: '某制造企业',
    industry: '制造业',
    icon: <Briefcase className="h-6 w-6" />,
    challenge: '替换老旧的 ERP 系统，需要定制化的生产管理、库存管理、员工考勤等模块。',
    solution: '通过 Thinkus 的项目阶段流转功能，将复杂的企业系统拆解为多个可交付的模块，分阶段实施。',
    results: [
      { metric: '效率提升', value: '40%', icon: <TrendingUp className="h-4 w-4" /> },
      { metric: '错误率', value: '下降 80%', icon: <Clock className="h-4 w-4" /> },
      { metric: '员工满意度', value: '提升 50%', icon: <Users className="h-4 w-4" /> },
    ],
    testimonial: 'AI 高管团队比人类顾问更高效，而且7x24小时在线。',
    author: '陈厂长',
    tags: ['企业软件', 'ERP', 'B2B'],
    featured: false,
  },
  {
    id: 'social-app',
    title: '兴趣社交 App',
    company: '个人创业者',
    industry: '社交',
    icon: <Smartphone className="h-6 w-6" />,
    challenge: '独立开发者想验证一个垂直社交产品的想法，需要快速构建原型进行市场验证。',
    solution: 'Thinkus 帮助梳理核心功能，砍掉不必要的复杂度，聚焦于最小可行产品。',
    results: [
      { metric: 'MVP开发', value: '2周', icon: <Clock className="h-4 w-4" /> },
      { metric: '种子用户', value: '1,000+', icon: <Users className="h-4 w-4" /> },
      { metric: '融资金额', value: '200万', icon: <TrendingUp className="h-4 w-4" /> },
    ],
    testimonial: '作为一个非技术背景的创业者，Thinkus 是我最好的技术合伙人。',
    author: '小明',
    tags: ['社交', '移动端', 'C2C'],
    featured: false,
  },
  {
    id: 'ai-assistant',
    title: 'AI 客服助手',
    company: '某客服外包公司',
    industry: '客服',
    icon: <Sparkles className="h-6 w-6" />,
    challenge: '提升客服效率，降低人工成本，需要构建智能客服系统处理常见问题。',
    solution: 'Thinkus 帮助设计 AI 客服架构，整合大语言模型，实现智能问答和工单分流。',
    results: [
      { metric: '自动处理率', value: '75%', icon: <TrendingUp className="h-4 w-4" /> },
      { metric: '响应时间', value: '<3秒', icon: <Clock className="h-4 w-4" /> },
      { metric: '成本节省', value: '50%', icon: <Users className="h-4 w-4" /> },
    ],
    testimonial: 'AI 客服让我们的服务能力提升了一个档次。',
    author: '刘总',
    tags: ['AI', '客服', 'B2B'],
    featured: false,
  },
]

// 行业标签
const INDUSTRY_TAGS = [
  { value: 'all', label: '全部' },
  { value: 'SaaS', label: 'SaaS' },
  { value: '电商', label: '电商' },
  { value: '教育', label: '教育' },
  { value: '制造业', label: '制造业' },
  { value: '社交', label: '社交' },
  { value: '客服', label: '客服' },
]

export default function CasesPage() {
  const featuredCases = CASE_STUDIES.filter(c => c.featured)
  const otherCases = CASE_STUDIES.filter(c => !c.featured)

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto max-w-6xl text-center">
          <Badge variant="secondary" className="mb-4">
            成功案例
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            他们都在用 Thinkus 构建产品
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            从创业公司到大型企业，看看 Thinkus 如何帮助他们加速产品开发
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {INDUSTRY_TAGS.map(tag => (
              <Badge
                key={tag.value}
                variant={tag.value === 'all' ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {tag.label}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Cases */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold mb-8">精选案例</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {featuredCases.map(caseStudy => (
              <Card key={caseStudy.id} className="overflow-hidden border-2 hover:border-primary/50 transition-colors">
                <CardHeader className="bg-muted/30">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        {caseStudy.icon}
                      </div>
                      <div>
                        <CardTitle className="text-xl">{caseStudy.title}</CardTitle>
                        <CardDescription>{caseStudy.company}</CardDescription>
                      </div>
                    </div>
                    <Badge>{caseStudy.industry}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">挑战</h4>
                    <p className="text-sm">{caseStudy.challenge}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">解决方案</h4>
                    <p className="text-sm">{caseStudy.solution}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-4">
                    {caseStudy.results.map((result, idx) => (
                      <div key={idx} className="text-center p-3 rounded-lg bg-muted/50">
                        <div className="flex justify-center mb-1 text-primary">
                          {result.icon}
                        </div>
                        <div className="text-lg font-bold">{result.value}</div>
                        <div className="text-xs text-muted-foreground">{result.metric}</div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4 border-t">
                    <div className="flex items-start gap-2">
                      <Quote className="h-4 w-4 text-primary flex-shrink-0 mt-1" />
                      <div>
                        <p className="text-sm italic">{caseStudy.testimonial}</p>
                        <p className="text-xs text-muted-foreground mt-1">— {caseStudy.author}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between items-center">
                  <div className="flex gap-1">
                    {caseStudy.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Other Cases */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold mb-8">更多案例</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {otherCases.map(caseStudy => (
              <Card key={caseStudy.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      {caseStudy.icon}
                    </div>
                    <Badge variant="outline">{caseStudy.industry}</Badge>
                  </div>
                  <CardTitle className="text-lg">{caseStudy.title}</CardTitle>
                  <CardDescription>{caseStudy.company}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {caseStudy.challenge}
                  </p>
                  <div className="flex gap-4">
                    {caseStudy.results.slice(0, 2).map((result, idx) => (
                      <div key={idx} className="text-center">
                        <div className="text-lg font-bold">{result.value}</div>
                        <div className="text-xs text-muted-foreground">{result.metric}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter>
                  <div className="flex gap-1">
                    {caseStudy.tags.slice(0, 2).map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold mb-4">数据说话</h2>
            <p className="text-muted-foreground">Thinkus 帮助客户取得的成果</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">500+</div>
              <div className="text-sm text-muted-foreground">成功项目</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">70%</div>
              <div className="text-sm text-muted-foreground">平均节省时间</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">98%</div>
              <div className="text-sm text-muted-foreground">客户满意度</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">60%</div>
              <div className="text-sm text-muted-foreground">平均节省成本</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-4">准备开始您的项目了吗？</h2>
          <p className="text-lg opacity-90 mb-8">
            加入众多成功的企业和创业者，让 Thinkus 帮您加速产品开发
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" variant="secondary">
                免费开始
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                联系我们
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
