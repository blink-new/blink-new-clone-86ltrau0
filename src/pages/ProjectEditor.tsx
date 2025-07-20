import { useState, useRef, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { 
  Send,
  Download,
  Globe,
  Code,
  Database,
  Settings,
  Play,
  Sparkles,
  ArrowLeft,
  Copy,
  ExternalLink,
  Smartphone,
  Monitor
} from 'lucide-react'

export default function ProjectEditor() {
  const { id } = useParams()
  const [message, setMessage] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [chatMessages, setChatMessages] = useState([
    {
      id: '1',
      type: 'user' as const,
      content: 'Build a todo app with user authentication',
      timestamp: new Date('2024-01-15T10:00:00')
    },
    {
      id: '2',
      type: 'assistant' as const,
      content: 'I\'ll build a todo app with user authentication for you. Let me create the components, set up the database schema, and implement the authentication flow.',
      timestamp: new Date('2024-01-15T10:00:30')
    },
    {
      id: '3',
      type: 'system' as const,
      content: 'Created React components: TodoList, TodoItem, AuthForm\nSet up Supabase database with todos and users tables\nImplemented JWT authentication\nDeployed to production',
      timestamp: new Date('2024-01-15T10:01:00')
    }
  ])

  const project = {
    id: id || '1',
    name: 'Todo App with Auth',
    description: 'A modern todo application with user authentication',
    status: 'deployed',
    tech: 'React + Supabase',
    url: 'https://todo-app.blink.app'
  }

  const codeFiles = [
    { name: 'App.tsx', language: 'typescript', size: '2.1 KB' },
    { name: 'components/TodoList.tsx', language: 'typescript', size: '1.8 KB' },
    { name: 'components/TodoItem.tsx', language: 'typescript', size: '1.2 KB' },
    { name: 'components/AuthForm.tsx', language: 'typescript', size: '2.5 KB' },
    { name: 'lib/supabase.ts', language: 'typescript', size: '0.8 KB' },
    { name: 'styles/globals.css', language: 'css', size: '1.1 KB' }
  ]

  const databaseTables = [
    { name: 'users', rows: 156, columns: ['id', 'email', 'created_at'] },
    { name: 'todos', rows: 1247, columns: ['id', 'user_id', 'title', 'completed', 'created_at'] }
  ]

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const handleSendMessage = async () => {
    if (!message.trim()) return

    const newMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      content: message,
      timestamp: new Date()
    }

    setChatMessages(prev => [...prev, newMessage])
    setMessage('')
    setIsGenerating(true)

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = {
        id: (Date.now() + 1).toString(),
        type: 'assistant' as const,
        content: 'I understand you want to modify the todo app. Let me implement those changes for you.',
        timestamp: new Date()
      }
      setChatMessages(prev => [...prev, aiResponse])
      setIsGenerating(false)
    }, 2000)
  }

  const handleDownloadCode = () => {
    // In a real app, this would trigger a zip download
    alert('Code download started! Check your downloads folder.')
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between h-16 px-6">
          <div className="flex items-center space-x-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-primary to-accent rounded-lg flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-semibold">{project.name}</h1>
                <p className="text-xs text-muted-foreground">{project.tech}</p>
              </div>
            </div>
            <Badge variant={project.status === 'deployed' ? 'default' : 'secondary'}>
              {project.status}
            </Badge>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleDownloadCode}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            {project.url && (
              <Button variant="outline" size="sm" asChild>
                <a href={project.url} target="_blank" rel="noopener noreferrer">
                  <Globe className="h-4 w-4 mr-2" />
                  Live Site
                </a>
              </Button>
            )}
            <Button size="sm">
              <Play className="h-4 w-4 mr-2" />
              Deploy
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Chat Panel */}
          <ResizablePanel defaultSize={35} minSize={25}>
            <div className="h-full flex flex-col">
              {/* Chat Header */}
              <div className="p-4 border-b">
                <h2 className="font-semibold flex items-center">
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI Assistant
                </h2>
                <p className="text-sm text-muted-foreground">
                  Describe changes you want to make
                </p>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg p-3 ${
                      msg.type === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : msg.type === 'system'
                        ? 'bg-muted text-muted-foreground text-sm font-mono'
                        : 'bg-muted'
                    }`}>
                      <p className="text-sm">{msg.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {msg.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                {isGenerating && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg p-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t">
                <div className="flex space-x-2">
                  <Textarea
                    placeholder="Describe what you want to change..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="min-h-[60px] resize-none"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={!message.trim() || isGenerating}
                    size="icon"
                    className="self-end"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Main Panel */}
          <ResizablePanel defaultSize={65}>
            <Tabs defaultValue="preview" className="h-full flex flex-col">
              <div className="border-b">
                <div className="flex items-center justify-between px-4">
                  <TabsList>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                    <TabsTrigger value="code">Code</TabsTrigger>
                    <TabsTrigger value="database">Database</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                  </TabsList>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant={previewMode === 'desktop' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPreviewMode('desktop')}
                    >
                      <Monitor className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={previewMode === 'mobile' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPreviewMode('mobile')}
                    >
                      <Smartphone className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-hidden">
                <TabsContent value="preview" className="h-full m-0">
                  <div className="h-full flex items-center justify-center bg-muted/50">
                    <div className={`bg-white rounded-lg shadow-xl overflow-hidden ${
                      previewMode === 'mobile' ? 'w-80 h-[600px]' : 'w-full h-full max-w-6xl max-h-[800px]'
                    }`}>
                      <iframe
                        src={project.url}
                        className="w-full h-full border-0"
                        title="App Preview"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="code" className="h-full m-0 p-4 overflow-y-auto">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Project Files</h3>
                      <Button variant="outline" size="sm">
                        <Copy className="h-4 w-4 mr-2" />
                        Copy All
                      </Button>
                    </div>
                    
                    <div className="grid gap-4">
                      {codeFiles.map((file, index) => (
                        <Card key={index}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-sm font-mono">{file.name}</CardTitle>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline">{file.language}</Badge>
                                <span className="text-xs text-muted-foreground">{file.size}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="bg-muted rounded p-3 font-mono text-sm">
                              <div className="text-muted-foreground">
                                // {file.name} content would be displayed here
                                <br />
                                // Click to view full file content
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="database" className="h-full m-0 p-4 overflow-y-auto">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Database Tables</h3>
                      <Button variant="outline" size="sm">
                        <Database className="h-4 w-4 mr-2" />
                        Query Builder
                      </Button>
                    </div>
                    
                    <div className="grid gap-4">
                      {databaseTables.map((table, index) => (
                        <Card key={index}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base">{table.name}</CardTitle>
                              <Badge variant="outline">{table.rows} rows</Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <p className="text-sm text-muted-foreground">Columns:</p>
                              <div className="flex flex-wrap gap-2">
                                {table.columns.map((column, colIndex) => (
                                  <Badge key={colIndex} variant="secondary">
                                    {column}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="settings" className="h-full m-0 p-4 overflow-y-auto">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Project Settings</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Project Name</label>
                          <Input value={project.name} className="mt-1" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Description</label>
                          <Textarea value={project.description} className="mt-1" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Custom Domain</label>
                          <Input placeholder="your-domain.com" className="mt-1" />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Deployment</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Auto Deploy</p>
                            <p className="text-sm text-muted-foreground">
                              Automatically deploy when changes are made
                            </p>
                          </div>
                          <Button variant="outline">Enable</Button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Environment Variables</p>
                            <p className="text-sm text-muted-foreground">
                              Manage your app's environment variables
                            </p>
                          </div>
                          <Button variant="outline">Configure</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  )
}