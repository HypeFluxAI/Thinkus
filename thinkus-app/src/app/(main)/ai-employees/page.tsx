'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AIEmployeeChat } from '@/components/ai-employee'
import { Cpu, MessageSquare, ArrowLeft } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'

type EmployeeId =
  // 核心管理层
  | 'mike_pm' | 'david_tech' | 'elena_ux' | 'marcus_cmo' | 'sarah_cfo' | 'james_legal'
  // 技术专家组
  | 'frank_devops' | 'grace_security' | 'henry_mobile' | 'ivan_ai' | 'jack_architect' | 'kevin_qa'
  // 业务专家组
  | 'lisa_data' | 'nancy_sales' | 'oscar_bd' | 'paul_pr' | 'quinn_ops'
  // 特殊角色
  | 'librarian'

interface Employee {
  id: EmployeeId
  name: string
  title: string
  avatar: string
  color: string
  description: string
  department: string
}

const EMPLOYEE_GROUPS: { title: string; employees: Employee[] }[] = [
  {
    title: '核心管理层',
    employees: [
      { id: 'mike_pm', name: 'Mike Chen', title: 'PM总监', avatar: '💡', color: '#3B82F6', description: '需求分析、产品规划、PRD编写', department: 'Product' },
      { id: 'david_tech', name: 'David Zhang', title: '技术总监', avatar: '💻', color: '#10B981', description: '架构设计、技术选型、代码审查', department: 'Engineering' },
      { id: 'elena_ux', name: 'Elena Rodriguez', title: 'UX总监', avatar: '🎨', color: '#EC4899', description: '界面设计、交互设计、用户体验', department: 'Design' },
      { id: 'marcus_cmo', name: 'Marcus Wang', title: 'CMO', avatar: '📊', color: '#F59E0B', description: '市场策略、品牌定位、增长运营', department: 'Marketing' },
      { id: 'sarah_cfo', name: 'Sarah Liu', title: 'CFO', avatar: '💰', color: '#6366F1', description: '财务规划、成本控制、商业模式', department: 'Finance' },
      { id: 'james_legal', name: 'James Chen', title: '法务总监', avatar: '⚖️', color: '#8B5CF6', description: '合规审查、隐私政策、合同条款', department: 'Legal' },
    ],
  },
  {
    title: '技术专家组',
    employees: [
      { id: 'frank_devops', name: 'Frank Li', title: 'DevOps', avatar: '🔧', color: '#14B8A6', description: 'CI/CD、部署运维、监控告警', department: 'Engineering' },
      { id: 'grace_security', name: 'Grace Wang', title: '安全专家', avatar: '🛡️', color: '#EF4444', description: '安全审计、漏洞修复、数据保护', department: 'Engineering' },
      { id: 'henry_mobile', name: 'Henry Zhou', title: '移动端专家', avatar: '📱', color: '#0EA5E9', description: 'iOS/Android、React Native/Flutter', department: 'Engineering' },
      { id: 'ivan_ai', name: 'Ivan Petrov', title: 'AI/ML专家', avatar: '🤖', color: '#A855F7', description: 'AI功能集成、模型选型、智能优化', department: 'Engineering' },
      { id: 'jack_architect', name: 'Jack Wu', title: '架构师', avatar: '🏗️', color: '#64748B', description: '系统设计、性能优化、技术债务', department: 'Engineering' },
      { id: 'kevin_qa', name: 'Kevin Park', title: 'QA总监', avatar: '🔬', color: '#22C55E', description: '测试策略、质量保障、自动化测试', department: 'Engineering' },
    ],
  },
  {
    title: '业务专家组',
    employees: [
      { id: 'lisa_data', name: 'Lisa Zhang', title: '数据分析', avatar: '📈', color: '#F97316', description: '数据洞察、报表设计、决策支持', department: 'Analytics' },
      { id: 'nancy_sales', name: 'Nancy Chen', title: '销售总监', avatar: '🎯', color: '#DC2626', description: '销售策略、客户转化、定价建议', department: 'Sales' },
      { id: 'oscar_bd', name: 'Oscar Liu', title: 'BD总监', avatar: '💼', color: '#7C3AED', description: '合作伙伴、渠道拓展、商务谈判', department: 'Business Development' },
      { id: 'paul_pr', name: 'Paul Wang', title: 'PR总监', avatar: '📢', color: '#06B6D4', description: '公关传播、媒体关系、危机处理', department: 'Public Relations' },
      { id: 'quinn_ops', name: 'Quinn Yang', title: '运营总监', avatar: '⚙️', color: '#84CC16', description: '运营管理、流程优化、效率提升', department: 'Operations' },
    ],
  },
  {
    title: '特殊角色',
    employees: [
      { id: 'librarian', name: 'Dr. Alex Reed', title: '研究员', avatar: '🔬', color: '#6366F1', description: '技术调研、文档查找、开源方案推荐', department: 'Research' },
    ],
  },
]

export default function AIEmployeesPage() {
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeId | null>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)

  // Check if AI Engine service is available
  const { data: healthData } = trpc.aiEmployee.health.useQuery(undefined, {
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  const isServiceAvailable = healthData?.available ?? false

  const handleStartChat = (employeeId: EmployeeId) => {
    setSelectedEmployee(employeeId)
    setIsChatOpen(true)
  }

  const findEmployee = (id: EmployeeId): Employee | undefined => {
    for (const group of EMPLOYEE_GROUPS) {
      const emp = group.employees.find(e => e.id === id)
      if (emp) return emp
    }
    return undefined
  }

  const selectedEmployeeInfo = selectedEmployee ? findEmployee(selectedEmployee) : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Cpu className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">AI 高管团队</h1>
            <Badge variant={isServiceAvailable ? 'default' : 'destructive'}>
              {isServiceAvailable ? '在线' : '离线'}
            </Badge>
            <Badge variant="outline" className="ml-2">
              {healthData?.employeesLoaded || 0} 位高管
            </Badge>
          </div>
          <p className="text-muted-foreground">
            18位AI高管团队，覆盖产品、技术、设计、营销、财务、法务等各个领域
          </p>
          {!isServiceAvailable && (
            <p className="text-sm text-destructive mt-2">
              AI引擎服务不可用。请启动 py-ai-engine 服务
            </p>
          )}
        </div>

        {/* Employee Groups */}
        {EMPLOYEE_GROUPS.map((group) => (
          <div key={group.title} className="mb-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              {group.title}
              <Badge variant="secondary">{group.employees.length}位</Badge>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {group.employees.map((employee) => (
                <Card
                  key={employee.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => isServiceAvailable && handleStartChat(employee.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback style={{ backgroundColor: employee.color }}>
                          <span className="text-lg">{employee.avatar}</span>
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">{employee.name}</CardTitle>
                        <CardDescription className="text-xs">{employee.title}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground mb-3">
                      {employee.description}
                    </p>
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={!isServiceAvailable}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStartChat(employee.id)
                      }}
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      对话
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}

        {/* Service Info */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">服务信息</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">服务状态</p>
                <p className="font-medium">{healthData?.status || '未知'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">已加载高管</p>
                <p className="font-medium">{healthData?.employeesLoaded || 0} / 18</p>
              </div>
              <div>
                <p className="text-muted-foreground">服务地址</p>
                <p className="font-medium">localhost:8011</p>
              </div>
              <div>
                <p className="text-muted-foreground">架构</p>
                <p className="font-medium">Python FastAPI</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chat Dialog */}
        <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
          <DialogContent className="!max-w-[90vw] w-[90vw] h-[90vh] flex flex-col p-0" showCloseButton={false}>
            <DialogHeader className="px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsChatOpen(false)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <DialogTitle className="flex items-center gap-2">
                  {selectedEmployeeInfo && (
                    <>
                      <span>{selectedEmployeeInfo.avatar}</span>
                      <span>{selectedEmployeeInfo.name}</span>
                      <Badge variant="outline" className="ml-1">{selectedEmployeeInfo.title}</Badge>
                    </>
                  )}
                </DialogTitle>
              </div>
            </DialogHeader>
            {selectedEmployee && (
              <div className="flex-1 overflow-hidden">
                <AIEmployeeChat
                  employeeId={selectedEmployee}
                  className="h-full"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
