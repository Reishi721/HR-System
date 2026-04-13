import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Login } from './pages/Login'
import { EmployeeDashboard } from './pages/employee/Dashboard'
import { ManagerDashboard } from './pages/manager/Dashboard'
import { Toaster } from '@/components/ui/toaster'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  // We'll properly implement auth checking later
  return <>{children}</>
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        
        <Route 
          path="/employee/*" 
          element={
            <PrivateRoute>
              <EmployeeDashboard />
            </PrivateRoute>
          } 
        />
        
        <Route 
          path="/manager/*" 
          element={
            <PrivateRoute>
              <ManagerDashboard />
            </PrivateRoute>
          } 
        />
      </Routes>
      <Toaster />
    </BrowserRouter>
  )
}

export default App
