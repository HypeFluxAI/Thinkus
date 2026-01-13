'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Share2,
  Copy,
  Check,
  Link,
  Mail,
  Lock,
  Clock,
  Eye,
  MessageSquare,
  Edit3,
  Trash2,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ShareInfo {
  id: string
  token: string
  url: string
  permission: string
  expiresAt?: string
  hasPassword: boolean
  status: string
  viewCount: number
  createdAt: string
}

interface ShareDialogProps {
  projectId: string
  projectName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const EXPIRY_OPTIONS = [
  { value: '0', label: '永不过期' },
  { value: '1', label: '1小时' },
  { value: '24', label: '1天' },
  { value: '168', label: '1周' },
  { value: '720', label: '30天' },
]

const PERMISSION_OPTIONS = [
  { value: 'view', label: '仅查看', icon: <Eye className="h-4 w-4" />, desc: '可以查看项目基本信息' },
  { value: 'comment', label: '可评论', icon: <MessageSquare className="h-4 w-4" />, desc: '可以查看详情并添加评论' },
  { value: 'edit', label: '可编辑', icon: <Edit3 className="h-4 w-4" />, desc: '可以编辑项目内容' },
]

export function ShareDialog({
  projectId,
  projectName,
  open,
  onOpenChange,
}: ShareDialogProps) {
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [shares, setShares] = useState<ShareInfo[]>([])
  const [copied, setCopied] = useState<string | null>(null)

  // New share form
  const [permission, setPermission] = useState('view')
  const [expiresIn, setExpiresIn] = useState('0')
  const [usePassword, setUsePassword] = useState(false)
  const [password, setPassword] = useState('')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (open) {
      loadShares()
    }
  }, [open, projectId])

  const loadShares = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/projects/${projectId}/share`)
      if (response.ok) {
        const data = await response.json()
        setShares(data.shares || [])
      }
    } catch (error) {
      console.error('Failed to load shares:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateShare = async () => {
    try {
      setCreating(true)
      const response = await fetch(`/api/projects/${projectId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permission,
          expiresIn: expiresIn !== '0' ? parseInt(expiresIn) : undefined,
          password: usePassword ? password : undefined,
          title: title || undefined,
          message: message || undefined,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setShares(prev => [data.share, ...prev])
        toast.success('分享链接已创建')

        // Reset form
        setPermission('view')
        setExpiresIn('0')
        setUsePassword(false)
        setPassword('')
        setTitle('')
        setMessage('')

        // Copy to clipboard
        await navigator.clipboard.writeText(data.share.url)
        setCopied(data.share.token)
        setTimeout(() => setCopied(null), 3000)
      } else {
        toast.error('创建分享失败')
      }
    } catch (error) {
      console.error('Failed to create share:', error)
      toast.error('创建分享失败')
    } finally {
      setCreating(false)
    }
  }

  const handleCopyLink = async (share: ShareInfo) => {
    await navigator.clipboard.writeText(share.url)
    setCopied(share.token)
    setTimeout(() => setCopied(null), 3000)
    toast.success('链接已复制')
  }

  const handleRevokeShare = async (shareId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/share?shareId=${shareId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setShares(prev => prev.filter(s => s.id !== shareId))
        toast.success('分享已撤销')
      }
    } catch (error) {
      console.error('Failed to revoke share:', error)
      toast.error('撤销失败')
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            分享项目
          </DialogTitle>
          <DialogDescription>
            创建分享链接，让他人查看 "{projectName}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create new share */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <h3 className="font-medium text-sm">创建新分享</h3>

            <div className="grid gap-4">
              {/* Permission */}
              <div className="space-y-2">
                <Label>访问权限</Label>
                <div className="grid grid-cols-3 gap-2">
                  {PERMISSION_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      className={cn(
                        'p-3 rounded-lg border text-left transition-colors',
                        permission === opt.value
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-primary/50'
                      )}
                      onClick={() => setPermission(opt.value)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {opt.icon}
                        <span className="font-medium text-sm">{opt.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Expiry */}
                <div className="space-y-2">
                  <Label>有效期</Label>
                  <Select value={expiresIn} onValueChange={setExpiresIn}>
                    <SelectTrigger>
                      <Clock className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPIRY_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Password toggle */}
                <div className="space-y-2">
                  <Label>密码保护</Label>
                  <div className="flex items-center gap-3 h-10">
                    <Switch
                      checked={usePassword}
                      onCheckedChange={setUsePassword}
                    />
                    <span className="text-sm text-muted-foreground">
                      {usePassword ? '已启用' : '未启用'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Password input */}
              {usePassword && (
                <div className="space-y-2">
                  <Label htmlFor="password">设置密码</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="输入访问密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              )}

              {/* Optional title/message */}
              <div className="space-y-2">
                <Label htmlFor="title">分享标题 (可选)</Label>
                <Input
                  id="title"
                  placeholder="给分享起个名字"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">留言 (可选)</Label>
                <Textarea
                  id="message"
                  placeholder="给查看者的留言..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleCreateShare}
              disabled={creating || (usePassword && !password)}
            >
              {creating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Link className="h-4 w-4 mr-2" />
              )}
              创建分享链接
            </Button>
          </div>

          {/* Existing shares */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">已创建的分享</h3>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : shares.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                暂无分享链接
              </p>
            ) : (
              <div className="space-y-2">
                {shares.filter(s => s.status === 'active').map(share => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {PERMISSION_OPTIONS.find(p => p.value === share.permission)?.label}
                        </Badge>
                        {share.hasPassword && (
                          <Badge variant="secondary" className="text-xs">
                            <Lock className="h-3 w-3 mr-1" />
                            密码保护
                          </Badge>
                        )}
                        {share.expiresAt && (
                          <Badge variant="secondary" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDate(share.expiresAt)}到期
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>创建于 {formatDate(share.createdAt)}</span>
                        <span>·</span>
                        <span>{share.viewCount} 次查看</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleCopyLink(share)}
                      >
                        {copied === share.token ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        asChild
                      >
                        <a href={share.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleRevokeShare(share.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
