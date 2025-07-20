import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from 'next-themes'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import ProjectEditor from './pages/ProjectEditor'
import AuthPage from './pages/AuthPage'
import PricingPage from './pages/PricingPage'

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <Router>
        <div className="min-h-screen bg-background">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/project/:id" element={<ProjectEditor />} />
            <Route path="/pricing" element={<PricingPage />} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  )
}

export default App