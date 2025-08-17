'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Send, 
  Search, 
  Paperclip, 
  Smile, 
  MoreVertical,
  Phone,
  Video,
  Users,
  Star,
  Clock
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { PageLayout } from '@/components/page-layout'

const conversations = [
  {
    id: 1,
    name: 'Sales Team',
    type: 'group',
    lastMessage: 'New targets for Q2 have been set',
    time: '2 min ago',
    unread: 3,
    avatar: '📊',
    members: 8,
    online: 5
  },
  {
    id: 2,
    name: 'Jane Smith',
    type: 'individual',
    lastMessage: 'Can you review the inventory report?',
    time: '15 min ago',
    unread: 0,
    avatar: '/placeholder-avatar.jpg',
    status: 'online'
  },
  {
    id: 3,
    name: 'HR Department',
    type: 'group',
    lastMessage: 'Leave applications pending approval',
    time: '1 hour ago',
    unread: 1,
    avatar: '👥',
    members: 4,
    online: 2
  },
  {
    id: 4,
    name: 'John Doe',
    type: 'individual',
    lastMessage: 'Thanks for the quick response!',
    time: '2 hours ago',
    unread: 0,
    avatar: '/placeholder-avatar.jpg',
    status: 'away'
  }
]

const messages = [
  {
    id: 1,
    sender: 'Jane Smith',
    content: 'Hi team, I need help with the customer order #1234',
    time: '10:30 AM',
    type: 'text'
  },
  {
    id: 2,
    sender: 'You',
    content: 'I can help with that. What specific information do you need?',
    time: '10:32 AM',
    type: 'text'
  },
  {
    id: 3,
    sender: 'Jane Smith',
    content: 'The customer wants to know about delivery timelines and payment options',
    time: '10:33 AM',
    type: 'text'
  },
  {
    id: 4,
    sender: 'Mike Johnson',
    content: 'I can handle the delivery timeline part. Standard delivery is 3-5 business days.',
    time: '10:35 AM',
    type: 'text'
  }
]

export default function MessagingPage() {
  const [selectedConversation, setSelectedConversation] = useState(1)
  const [newMessage, setNewMessage] = useState('')
  const { toast } = useToast()

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      toast({
        title: "Message sent",
        description: "Your message has been delivered successfully.",
      })
      setNewMessage('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <PageLayout currentPage="/messaging" breadcrumbs={[{ name: 'Home', href: '/' }, { name: 'Messaging' }]}>
        {/* Page header with card styling */}
        <div className="mb-6">
          <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-l-4 border-l-indigo-500 shadow-md">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">Messaging</h1>
                  <p className="text-gray-600 text-sm mb-2">Internal team communication and collaboration</p>
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 text-sm font-medium">
                    💬 Real-time messaging platform
                  </div>
                </div>
                <div className="hidden md:block">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white text-xl">💬</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat interface */}
        <div className="flex h-[calc(100vh-80px)]">
          {/* Sidebar */}
          <div className="w-80 bg-white border-r border-gray-200 flex flex-col rounded-l-lg">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Messages</h2>
                <Button size="sm" onClick={() => toast({ title: "New conversation", description: "Feature coming soon!" })}>
                  <Users className="h-4 w-4 mr-2" />
                  New
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search conversations..."
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedConversation === conversation.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                  onClick={() => setSelectedConversation(conversation.id)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="relative">
                      {conversation.type === 'group' ? (
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-lg">
                          {conversation.avatar}
                        </div>
                      ) : (
                        <Avatar>
                          <AvatarImage src={conversation.avatar} />
                          <AvatarFallback>
                            {conversation.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      {conversation.type === 'individual' && conversation.status === 'online' && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 truncate">
                          {conversation.name}
                        </h3>
                        <span className="text-xs text-gray-500">{conversation.time}</span>
                      </div>
                      
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-sm text-gray-600 truncate">
                          {conversation.lastMessage}
                        </p>
                        {conversation.unread > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {conversation.unread}
                          </Badge>
                        )}
                      </div>
                      
                      {conversation.type === 'group' && (
                        <div className="flex items-center mt-1 text-xs text-gray-500">
                          <Users className="h-3 w-3 mr-1" />
                          {conversation.online}/{conversation.members} online
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Main chat area */}
          <div className="flex-1 flex flex-col bg-white rounded-r-lg">
            {/* Chat header */}
            <div className="border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-lg">
                    📊
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Sales Team</h3>
                    <p className="text-sm text-gray-500">5 members online • Group chat</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Video className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Star className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'You' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow-sm ${
                      message.sender === 'You'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white text-gray-900 border'
                    }`}
                  >
                    {message.sender !== 'You' && (
                      <div className="text-xs font-medium mb-1">{message.sender}</div>
                    )}
                    <div className="text-sm">{message.content}</div>
                    <div className="text-xs mt-1 opacity-70">{message.time}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Message input */}
            <div className="border-t border-gray-200 p-4 bg-white">
              <div className="flex items-end space-x-2">
                <Button variant="ghost" size="sm">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <div className="flex-1">
                  <Textarea
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    className="resize-none"
                    rows={1}
                  />
                </div>
                <Button variant="ghost" size="sm">
                  <Smile className="h-4 w-4" />
                </Button>
                <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
    </PageLayout>
  )
}