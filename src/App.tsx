import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import ProjectEditor from './pages/ProjectEditor'
import ProjectCreation from './pages/ProjectCreation'
import AuthPage from './pages/AuthPage'
import PricingPage from './pages/PricingPage'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-white">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/project/new" element={<ProjectCreation />} />
          <Route path="/project/:id" element={<ProjectEditor />} />
          <Route path="/pricing" element={<PricingPage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App