'use client'

import { use } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { StandupPanel } from '@/components/standup'

export default function ProjectStandupsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: projectId } = use(params)

  return (
    <div className="bg-background min-h-screen">
      {/* Page Header */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-4 max-w-5xl">
          <div className="flex items-center gap-3">
            <Link href={`/projects/${projectId}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回项目
              </Button>
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="font-semibold">团队例会</span>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <StandupPanel projectId={projectId} />
      </main>
    </div>
  )
}
