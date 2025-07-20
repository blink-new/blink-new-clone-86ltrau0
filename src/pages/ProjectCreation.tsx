import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { 
  Sparkles,
  Code,
  Database,
  Globe,
  CheckCircle,
  ArrowRight
} from 'lucide-react'

export default function ProjectCreation() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const prompt = searchParams.get('prompt') || ''
  
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  const steps = [
    { icon: <Sparkles className="h-5 w-5" />, title: "Analyzing your request", description: "Understanding what you want to build" },
    { icon: <Code className="h-5 w-5" />, title: "Generating code", description: "Writing React components and logic" },
    { icon: <Database className="h-5 w-5" />, title: "Setting up database", description: "Creating tables and API endpoints" },
    { icon: <Globe className="h-5 w-5" />, title: "Deploying app", description: "Publishing to production" }
  ]

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          setIsComplete(true)
          clearInterval(timer)
          return 100
        }
        return prev + 2
      })
    }, 100)

    const stepTimer = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= 3) { // steps.length - 1 = 3
          clearInterval(stepTimer)
          return prev
        }
        return prev + 1
      })
    }, 2500)

    return () => {
      clearInterval(timer)
      clearInterval(stepTimer)
    }
  }, [])

  const handleContinue = () => {
    navigate('/project/demo-project')
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Building your app
          </h1>
          <p className="text-gray-600">
            "{prompt}"
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <Progress value={progress} className="h-2 mb-4" />
          <p className="text-sm text-gray-500 text-center">
            {progress}% complete
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-4 mb-8">
          {steps.map((step, index) => (
            <Card key={index} className={`border-2 transition-all ${
              index < currentStep ? 'border-green-200 bg-green-50' :
              index === currentStep ? 'border-blue-200 bg-blue-50' :
              'border-gray-100'
            }`}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    index < currentStep ? 'bg-green-500 text-white' :
                    index === currentStep ? 'bg-blue-500 text-white' :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {index < currentStep ? <CheckCircle className="h-5 w-5" /> : step.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-medium ${
                      index <= currentStep ? 'text-gray-900' : 'text-gray-400'
                    }`}>
                      {step.title}
                    </h3>
                    <p className={`text-sm ${
                      index <= currentStep ? 'text-gray-600' : 'text-gray-400'
                    }`}>
                      {step.description}
                    </p>
                  </div>
                  {index === currentStep && !isComplete && (
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Complete State */}
        {isComplete && (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Your app is ready!
            </h2>
            <p className="text-gray-600 mb-6">
              Your application has been successfully created and deployed.
            </p>
            <Button onClick={handleContinue} className="bg-black text-white hover:bg-gray-800">
              Open Project
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}