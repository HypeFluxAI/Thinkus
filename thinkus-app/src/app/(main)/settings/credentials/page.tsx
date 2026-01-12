'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Key,
  Copy,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { trpc } from '@/lib/trpc/client'

type ServiceType =
  | 'anthropic'
  | 'openai'
  | 'stripe'
  | 'aws'
  | 'cloudflare'
  | 'mongodb'
  | 'github'
  | 'vercel'
  | 'custom'

const SERVICE_INFO: Record<ServiceType, { name: string; desc: string }> = {
  anthropic: { name: 'Anthropic', desc: 'Claude AI API' },
  openai: { name: 'OpenAI', desc: 'GPT API' },
  stripe: { name: 'Stripe', desc: '支付服务' },
  aws: { name: 'AWS', desc: '云服务' },
  cloudflare: { name: 'Cloudflare', desc: 'CDN/R2' },
  mongodb: { name: 'MongoDB', desc: '数据库' },
  github: { name: 'GitHub', desc: '代码托管' },
  vercel: { name: 'Vercel', desc: '部署平台' },
  custom: { name: '自定义', desc: '其他服务' },
}

export default function CredentialsSettingsPage() {
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyValue, setNewKeyValue] = useState('')
  const [newKeyService, setNewKeyService] = useState<ServiceType>('anthropic')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const utils = trpc.useUtils()

  // 获取凭证列表
  const { data, isLoading } = trpc.user.listCredentials.useQuery()

  // 添加凭证
  const addMutation = trpc.user.addCredential.useMutation({
    onSuccess: () => {
      toast.success('API 密钥已添加')
      setNewKeyName('')
      setNewKeyValue('')
      setNewKeyService('anthropic')
      utils.user.listCredentials.invalidate()
    },
    onError: error => {
      toast.error(error.message || '添加失败')
    },
  })

  // 删除凭证
  const deleteMutation = trpc.user.deleteCredential.useMutation({
    onSuccess: () => {
      toast.success('API 密钥已删除')
      utils.user.listCredentials.invalidate()
    },
    onError: error => {
      toast.error(error.message || '删除失败')
    },
  })

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    toast.success('已复制到剪贴板')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleAddKey = () => {
    if (!newKeyName || !newKeyValue) {
      toast.error('请填写密钥名称和密钥值')
      return
    }

    addMutation.mutate({
      name: newKeyName,
      service: newKeyService,
      key: newKeyValue,
    })
  }

  const handleDeleteKey = (id: string) => {
    deleteMutation.mutate({ id })
  }

  const credentials = data?.credentials || []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">API 密钥管理</h2>
        <p className="text-muted-foreground">管理您的外部服务 API 密钥</p>
      </div>

      {/* Info Banner */}
      <Card className="bg-blue-500/10 border-blue-500/30">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">安全提示</p>
            <p className="text-sm text-muted-foreground">
              API 密钥会使用 AES-256-GCM 加密存储。我们仅在您项目开发时使用这些密钥，不会用于其他目的。
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Existing Keys */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4" />
            已保存的密钥
          </CardTitle>
          <CardDescription>用于项目开发的第三方服务密钥</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : credentials.length === 0 ? (
            <div className="text-center py-8">
              <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">还没有保存任何 API 密钥</p>
            </div>
          ) : (
            <div className="space-y-4">
              {credentials.map(credential => (
                <div
                  key={credential.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{credential.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {SERVICE_INFO[credential.service as ServiceType]?.name || credential.service}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {new Date(credential.createdAt).toLocaleDateString('zh-CN')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-sm text-muted-foreground font-mono">
                        {credential.keyPreview}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(credential.keyPreview, credential.id)}
                      >
                        {copiedId === credential.id ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                    {credential.lastUsedAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        最后使用: {new Date(credential.lastUsedAt).toLocaleDateString('zh-CN')}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeleteKey(credential.id)}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add New Key */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" />
            添加新密钥
          </CardTitle>
          <CardDescription>添加第三方服务的 API 密钥</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="keyName">密钥名称</Label>
              <Input
                id="keyName"
                value={newKeyName}
                onChange={e => setNewKeyName(e.target.value)}
                placeholder="例如: Production API Key"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="keyService">服务类型</Label>
              <Select
                value={newKeyService}
                onValueChange={value => setNewKeyService(value as ServiceType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择服务" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SERVICE_INFO).map(([key, info]) => (
                    <SelectItem key={key} value={key}>
                      {info.name} - {info.desc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="keyValue">密钥值</Label>
            <Input
              id="keyValue"
              type="password"
              value={newKeyValue}
              onChange={e => setNewKeyValue(e.target.value)}
              placeholder="sk-ant-..."
            />
          </div>
          <Button
            onClick={handleAddKey}
            disabled={!newKeyName || !newKeyValue || addMutation.isPending}
          >
            {addMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            添加密钥
          </Button>
        </CardContent>
      </Card>

      {/* Supported Services */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">支持的服务</CardTitle>
          <CardDescription>我们支持以下第三方服务的集成</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(SERVICE_INFO)
              .filter(([key]) => key !== 'custom')
              .map(([key, service]) => (
                <div
                  key={key}
                  className="p-3 rounded-lg border hover:border-primary/50 transition-colors"
                >
                  <div className="font-medium">{service.name}</div>
                  <div className="text-sm text-muted-foreground">{service.desc}</div>
                </div>
              ))}
          </div>
          <Separator className="my-4" />
          <p className="text-sm text-muted-foreground">
            需要集成其他服务？
            <a href="#" className="text-primary hover:underline ml-1 inline-flex items-center">
              联系我们 <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
