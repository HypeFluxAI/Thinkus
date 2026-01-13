'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ExpertList, ConsultationChat } from '@/components/experts'

export default function ExpertsPage() {
  const [activeTab, setActiveTab] = useState<string>('experts')
  const [activeConsultationId, setActiveConsultationId] = useState<string | null>(null)

  const handleStartConsultation = (consultationId: string) => {
    setActiveConsultationId(consultationId)
    setActiveTab('consultation')
  }

  const handleBack = () => {
    setActiveConsultationId(null)
    setActiveTab('experts')
  }

  return (
    <div className="bg-background min-h-screen">
      {/* Page Header */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-4 max-w-6xl">
          <h1 className="text-2xl font-bold">外部专家咨询</h1>
          <p className="text-muted-foreground">
            与行业顶尖专家对话，获取专业建议和解决方案
          </p>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="experts">专家列表</TabsTrigger>
            <TabsTrigger value="consultation" disabled={!activeConsultationId}>
              进行中的咨询
            </TabsTrigger>
          </TabsList>

          <TabsContent value="experts">
            <ExpertList onStartConsultation={handleStartConsultation} />
          </TabsContent>

          <TabsContent value="consultation">
            {activeConsultationId && (
              <ConsultationChat
                consultationId={activeConsultationId}
                onBack={handleBack}
              />
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
