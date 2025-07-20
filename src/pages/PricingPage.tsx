import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Check, 
  Sparkles, 
  ArrowLeft,
  Zap,
  Crown,
  Rocket
} from 'lucide-react'

export default function PricingPage() {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for trying out Blink',
      icon: <Sparkles className="h-5 w-5" />,
      features: [
        '5 projects per month',
        'Basic AI models',
        'Community support',
        'Public projects only',
        'Standard templates'
      ],
      limitations: [
        'No custom domains',
        'Blink branding included',
        'Limited deployment options'
      ],
      cta: 'Get Started Free',
      popular: false
    },
    {
      name: 'Pro',
      price: '$20',
      period: 'per month',
      description: 'For serious builders and teams',
      icon: <Zap className="h-5 w-5" />,
      features: [
        'Unlimited projects',
        'Advanced AI models (GPT-4, Claude)',
        'Priority support',
        'Private projects',
        'Custom domains',
        'Remove Blink branding',
        'Advanced templates',
        'Team collaboration',
        'API access'
      ],
      limitations: [],
      cta: 'Start Pro Trial',
      popular: true
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: 'contact us',
      description: 'For large teams and organizations',
      icon: <Crown className="h-5 w-5" />,
      features: [
        'Everything in Pro',
        'Dedicated AI models',
        'Custom integrations',
        'SSO authentication',
        'Advanced security',
        'SLA guarantees',
        'Dedicated support',
        'Custom training',
        'On-premise deployment'
      ],
      limitations: [],
      cta: 'Contact Sales',
      popular: false
    }
  ]

  const faqs = [
    {
      question: 'How does the AI code generation work?',
      answer: 'Our AI analyzes your natural language description and generates complete, production-ready code using the latest frameworks and best practices. It handles everything from UI components to database schemas and API endpoints.'
    },
    {
      question: 'Can I export and host my code elsewhere?',
      answer: 'Yes! With Pro and Enterprise plans, you can download the complete source code and host it anywhere you like - Vercel, Netlify, AWS, or your own servers.'
    },
    {
      question: 'What frameworks and technologies are supported?',
      answer: 'We support React, Vue, Next.js, Nuxt.js, Svelte, and more. For backends, we integrate with Supabase, Firebase, PostgreSQL, and other popular services.'
    },
    {
      question: 'Is there a limit on AI generations?',
      answer: 'Free plans have a monthly limit. Pro plans include unlimited AI generations, and Enterprise plans can be customized based on your needs.'
    },
    {
      question: 'Do you offer refunds?',
      answer: 'Yes, we offer a 30-day money-back guarantee for all paid plans. If you\'re not satisfied, we\'ll refund your payment in full.'
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-primary to-accent rounded-lg flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold gradient-text">Blink</span>
            </Link>
            
            <div className="flex items-center space-x-4">
              <Link to="/">
                <Button variant="ghost">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
              <Link to="/auth">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">
            <Rocket className="h-3 w-3 mr-1" />
            Simple, Transparent Pricing
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Choose the perfect plan for{' '}
            <span className="gradient-text">your needs</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Start building for free, upgrade when you need more power. 
            All plans include our core AI code generation features.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {plans.map((plan, index) => (
            <Card 
              key={index} 
              className={`relative ${plan.popular ? 'border-primary shadow-lg scale-105' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-8">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <div className="text-primary">{plan.icon}</div>
                </div>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription className="text-base">{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period !== 'contact us' && (
                    <span className="text-muted-foreground">/{plan.period}</span>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-3">What's included:</h4>
                  <ul className="space-y-2">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start">
                        <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {plan.limitations.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 text-muted-foreground">Limitations:</h4>
                    <ul className="space-y-2">
                      {plan.limitations.map((limitation, limitIndex) => (
                        <li key={limitIndex} className="flex items-start">
                          <span className="text-muted-foreground text-sm">• {limitation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button 
                  className="w-full" 
                  variant={plan.popular ? 'default' : 'outline'}
                  size="lg"
                >
                  {plan.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-muted-foreground">
              Everything you need to know about Blink and our pricing
            </p>
          </div>

          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">{faq.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-20 py-16 bg-muted/50 rounded-2xl">
          <h2 className="text-3xl font-bold mb-4">
            Ready to start building?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of developers who are building faster with AI. 
            Start your free project today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth">
              <Button size="lg" className="w-full sm:w-auto">
                Start Building Free
              </Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Contact Sales
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}