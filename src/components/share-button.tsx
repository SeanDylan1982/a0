'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Share2, 
  Copy, 
  Mail, 
  MessageSquare, 
  Download,
  ExternalLink
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ShareButtonProps {
  title: string
  url?: string
  data?: any
  type: 'document' | 'record' | 'calendar'
  size?: 'sm' | 'default'
  variant?: 'default' | 'outline' | 'ghost'
}

export function ShareButton({ 
  title, 
  url, 
  data, 
  type, 
  size = 'sm',
  variant = 'outline' 
}: ShareButtonProps) {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)

  const shareUrl = url || `${window.location.origin}${window.location.pathname}`
  const shareText = `${title} - Account Zero`

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast({
        title: "Link copied",
        description: "Share link copied to clipboard",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      })
    }
    setIsOpen(false)
  }

  const handleEmailShare = () => {
    const subject = encodeURIComponent(shareText)
    const body = encodeURIComponent(`Check out this ${type}: ${shareUrl}`)
    window.open(`mailto:?subject=${subject}&body=${body}`)
    setIsOpen(false)
  }

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(`${shareText}: ${shareUrl}`)
    window.open(`https://wa.me/?text=${text}`)
    setIsOpen(false)
  }

  const handleDownload = () => {
    if (data) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title.replace(/\s+/g, '_')}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast({
        title: "Download started",
        description: `${title} data downloaded`,
      })
    }
    setIsOpen(false)
  }

  const handleOpenInNewTab = () => {
    window.open(shareUrl, '_blank')
    setIsOpen(false)
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size}>
          <Share2 className="h-4 w-4 mr-1" />
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleCopyLink}>
          <Copy className="h-4 w-4 mr-2" />
          Copy Link
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleEmailShare}>
          <Mail className="h-4 w-4 mr-2" />
          Email
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleWhatsAppShare}>
          <MessageSquare className="h-4 w-4 mr-2" />
          WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleOpenInNewTab}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Open in New Tab
        </DropdownMenuItem>
        {data && (
          <DropdownMenuItem onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download Data
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}