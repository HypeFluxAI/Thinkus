'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Key,
  Eye,
  EyeOff,
  Copy,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'

interface ApiKey {
  id: string
  name: string
  key: string
  createdAt: Date
  lastUsed?: Date
}

const MOCK_API_KEYS: ApiKey[] = [
  {
    id: '1',
    name: 'Production Key',
    key: 'sk-ant-api03-xxxx...xxxx',
    createdAt: new Date('2026-01-05'),
    lastUsed: new Date('2026-01-11'),
  },
  {
    id: '2',
    name: 'Development Key',
    key: 'sk-ant-api03-yyyy...yyyy',
    createdAt: new Date('2026-01-10'),
  },
]

export default function CredentialsSettingsPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(MOCK_API_KEYS)
  const [showKey, setShowKey] = useState<Record<string, boolean>>({})
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyValue, setNewKeyValue] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const toggleKeyVisibility = (id: string) => {
    setShowKey(prev => ({ ...prev, [id]: !prev[id] }))
  }

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

    const newKey: ApiKey = {
      id: Date.now().toString(),
      name: newKeyName,
      key: newKeyValue.slice(0, 15) + '...' + newKeyValue.slice(-4),
      createdAt: new Date(),
    }

    setApiKeys(prev => [...prev, newKey])
    setNewKeyName('')
    setNewKeyValue('')
    toast.success('API 密钥已添加')
  }

  const handleDeleteKey = (id: string) => {
    setApiKeys(prev => prev.filter(key => key.id !== id))
    toast.success('API 密钥已删除')
  }

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
              API 密钥会被加密存储。我们仅在您项目开发时使用这些密钥，不会用于其他目的。
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
          {apiKeys.length === 0 ? (
            <div className="text-center py-8">
              <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">还没有保存任何 API 密钥</p>
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys.map(apiKey => (
                <div
                  key={apiKey.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{apiKey.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {apiKey.createdAt.toLocaleDateString('zh-CN')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-sm text-muted-foreground font-mono">
                        {showKey[apiKey.id] ? apiKey.key : '••••••••••••••••'}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => toggleKeyVisibility(apiKey.id)}
                      >
                        {showKey[apiKey.id] ? (
                          <EyeOff className="h-3 w-3" />
                        ) : (
                          <Eye className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(apiKey.key, apiKey.id)}
                      >
                        {copiedId === apiKey.id ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                    {apiKey.lastUsed && (
                      <p className="text-xs text-muted-foreground mt-1">
                        最后使用: {apiKey.lastUsed.toLocaleDateString('zh-CN')}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeleteKey(apiKey.id)}
                  >
                    <Trash2 className="h-4 w-4" />
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
          <div className="space-y-2">
            <Label htmlFor="keyName">密钥名称</Label>
            <Input
              id="keyName"
              value={newKeyName}
              onChange={e => setNewKeyName(e.target.value)}
              placeholder="例如: Anthropic API Key"
            />
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
          <Button onClick={handleAddKey} disabled={!newKeyName || !newKeyValue}>
            <Plus className="h-4 w-4 mr-2" />
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
            {[
              { name: 'Anthropic', desc: 'Claude AI API' },
              { name: 'OpenAI', desc: 'GPT API' },
              { name: 'Stripe', desc: '支付服务' },
              { name: 'AWS', desc: '云服务' },
              { name: 'Cloudflare', desc: 'CDN/R2' },
              { name: 'MongoDB', desc: '数据库' },
            ].map(service => (
              <div
                key={service.name}
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
