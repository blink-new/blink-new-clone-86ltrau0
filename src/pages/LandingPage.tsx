import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { 
  Send,
  Sparkles
} from 'lucide-react'

export default function LandingPage() {
  const [prompt, setPrompt] = useState('')

  const handleSubmit = () => {
    if (prompt.trim()) {
      // In a real app, this would start the AI generation process
      window.location.href = `/project/new?prompt=${encodeURIComponent(prompt)}`
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-semibold">Blink</span>
        </div>
        
        <div className="flex items-center space-x-4">
          <Link to="/auth" className="text-sm text-gray-600 hover:text-gray-900">
            Sign in
          </Link>
          <Link to="/auth">
            <Button size="sm" className="bg-black text-white hover:bg-gray-800">
              Get started
            </Button>
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4">
        <div className="w-full max-w-2xl">
          {/* Header Text */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              What is Blink?
            </h1>
            <p className="text-lg text-gray-600 max-w-xl mx-auto">
              Blink is an AI coding agent that helps you build websites, web apps, and mobile applications without needing to code. Just describe what you want to build in plain English, and Blink writes the code, sets up databases, and deploys your app automatically. It's designed for entrepreneurs and businesses who want to bring their ideas to life quickly.
            </p>
          </div>

          {/* Chat Input */}
          <div className="relative">
            <Textarea
              placeholder="Describe what you want to build..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full min-h-[120px] p-4 pr-12 text-base border-2 border-gray-200 rounded-lg resize-none focus:border-black focus:ring-0 focus:outline-none"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
            />
            <Button
              onClick={handleSubmit}
              disabled={!prompt.trim()}
              size="icon"
              className="absolute bottom-3 right-3 bg-black text-white hover:bg-gray-800 disabled:bg-gray-300"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {/* Keyboard Shortcut Hint */}
          <p className="text-sm text-gray-500 mt-2 text-center">
            Press ⌘ + Enter to submit
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 p-4">
        <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
          <a href="https://x.com/blinkdotnew" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700">
            X
          </a>
          <a href="https://www.linkedin.com/company/blinkdotnew" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700">
            LinkedIn
          </a>
          <a href="https://discord.gg/2RjY7wP4a8" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700">
            Discord
          </a>
          <a href="https://www.reddit.com/r/blinkdotnew/" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700">
            Reddit
          </a>
          <Link to="/pricing" className="hover:text-gray-700">
            Pricing
          </Link>
          <Link to="/terms" className="hover:text-gray-700">
            Terms
          </Link>
          <Link to="/privacy" className="hover:text-gray-700">
            Privacy Policy
          </Link>
        </div>
      </footer>
    </div>
  )
}