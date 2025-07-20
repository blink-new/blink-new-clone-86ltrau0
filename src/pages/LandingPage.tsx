import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Sparkles, 
  Code, 
  Database, 
  Zap, 
  Globe, 
  Download,
  ArrowRight,
  Star,
  Users,
  Rocket,
  Shield,
  Moon,
  Sun
} from 'lucide-react'
import { useTheme } from 'next-themes'

export default function LandingPage() {
  const [prompt, setPrompt] = useState('')
  const { theme, setTheme } = useTheme()

  const features = [
    {
      icon: <Sparkles className="h-6 w-6" />,
      title: "AI-Powered Generation",
      description: "Describe your app in plain English and watch AI build it instantly"
    },
    {
      icon: <Code className="h-6 w-6" />,
      title: "Multiple Tech Stacks",
      description: "Support for React, Vue, Next.js, and more modern frameworks"
    },
    {
      icon: <Database className="h-6 w-6" />,
      title: "Database Setup",
      description: "Automatic database schema creation and API endpoints"
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Instant Preview",
      description: "See your app come to life in real-time as it's being built"
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: "One-Click Deploy",
      description: "Deploy to production with a single click, no DevOps required"
    },
    {
      icon: <Download className="h-6 w-6" />,
      title: "Export Code",
      description: "Download complete source code to customize and host anywhere"
    }
  ]

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Startup Founder",
      content: "Built my MVP in 5 minutes. This is revolutionary for non-technical founders.",
      rating: 5
    },
    {
      name: "Marcus Rodriguez",
      role: "Full-Stack Developer",
      content: "Incredible productivity boost. I use it for rapid prototyping and client demos.",
      rating: 5
    },
    {
      name: "Emily Watson",
      role: "Product Manager",
      content: "Finally, I can turn ideas into working prototypes without waiting for dev resources.",
      rating: 5
    }
  ]

  const handleStartBuilding = () => {
    if (prompt.trim()) {
      // In a real app, this would create a new project with the prompt
      window.location.href = `/project/new?prompt=${encodeURIComponent(prompt)}`
    }
  }

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-primary to-accent rounded-lg flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold gradient-text">Blink</span>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <Link to="/pricing" className="text-sm font-medium hover:text-primary transition-colors">
                Pricing
              </Link>
              <Link to="/docs" className="text-sm font-medium hover:text-primary transition-colors">
                Docs
              </Link>
              <Link to="/examples" className="text-sm font-medium hover:text-primary transition-colors">
                Examples
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Link to="/auth">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link to="/auth">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge variant="secondary" className="mb-6">
              <Rocket className="h-3 w-3 mr-1" />
              AI-Powered Development Platform
            </Badge>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              Build apps with{' '}
              <span className="gradient-text">AI</span>
              <br />
              in seconds
            </h1>
            
            <p className="text-xl text-muted-foreground mb-12 max-w-3xl mx-auto">
              Describe what you want to build in plain English. Our AI writes the code, 
              sets up databases, and deploys your app automatically. No coding required.
            </p>

            {/* AI Chat Input */}
            <div className="max-w-2xl mx-auto mb-12">
              <div className="relative">
                <Input
                  placeholder="Describe your app idea... (e.g., 'Build a todo app with user authentication')"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="h-14 text-lg pr-32 border-2 border-primary/20 focus:border-primary"
                  onKeyPress={(e) => e.key === 'Enter' && handleStartBuilding()}
                />
                <Button 
                  onClick={handleStartBuilding}
                  className="absolute right-2 top-2 h-10"
                  disabled={!prompt.trim()}
                >
                  Build Now
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                ✨ Try: "Build a social media dashboard" or "Create an e-commerce store"
              </p>
            </div>

            {/* Social Proof */}
            <div className="flex items-center justify-center space-x-8 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>10,000+ developers</span>
              </div>
              <div className="flex items-center space-x-2">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span>4.9/5 rating</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4" />
                <span>SOC 2 compliant</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need to build modern apps
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              From idea to production in minutes, not months. Our AI handles the complexity 
              so you can focus on what matters.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <div className="text-primary">{feature.icon}</div>
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Loved by developers worldwide
            </h2>
            <p className="text-xl text-muted-foreground">
              See what our community is saying about Blink
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-0 shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4">"{testimonial.content}"</p>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to build your next app?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of developers who are building faster with AI
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                Start Building Free
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link to="/pricing">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-white text-white hover:bg-white hover:text-primary">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-primary to-accent rounded-lg flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold gradient-text">Blink</span>
              </div>
              <p className="text-muted-foreground">
                The AI-powered platform for building modern applications in seconds.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link to="/features" className="hover:text-foreground">Features</Link></li>
                <li><Link to="/pricing" className="hover:text-foreground">Pricing</Link></li>
                <li><Link to="/examples" className="hover:text-foreground">Examples</Link></li>
                <li><Link to="/changelog" className="hover:text-foreground">Changelog</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link to="/docs" className="hover:text-foreground">Documentation</Link></li>
                <li><Link to="/guides" className="hover:text-foreground">Guides</Link></li>
                <li><Link to="/api" className="hover:text-foreground">API Reference</Link></li>
                <li><Link to="/support" className="hover:text-foreground">Support</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link to="/about" className="hover:text-foreground">About</Link></li>
                <li><Link to="/blog" className="hover:text-foreground">Blog</Link></li>
                <li><Link to="/careers" className="hover:text-foreground">Careers</Link></li>
                <li><Link to="/contact" className="hover:text-foreground">Contact</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-muted-foreground">
              © 2024 Blink. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link to="/privacy" className="text-muted-foreground hover:text-foreground">Privacy</Link>
              <Link to="/terms" className="text-muted-foreground hover:text-foreground">Terms</Link>
              <Link to="/security" className="text-muted-foreground hover:text-foreground">Security</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}