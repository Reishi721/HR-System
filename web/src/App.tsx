import { type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { Toaster } from '@/components/ui/toaster'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import type { UserRole } from '@/types/database'

import { Login } from './pages/Login'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorBoundary } from '@/components/ErrorBoundary'

// Employee
import { EmployeeDashboard } from './pages/employee/Dashboard'
import { EmployeeAttendance } from './pages/employee/Attendance'
import { LeaveRequestEmployee } from './pages/employee/LeaveRequest'
import { OvertimeEmployee } from './pages/employee/Overtime'
import { ReimbursementEmployee } from './pages/employee/Reimbursement'
import { PayslipsEmployee } from './pages/employee/Payslips'
import { LoansEmployee } from './pages/employee/Loans'
import { ProfileEmployee } from './pages/employee/Profile'

// Manager
import { ManagerDashboard } from './pages/manager/Dashboard'
import { TeamAttendance } from './pages/manager/TeamAttendance'
import { Approvals } from './pages/manager/Approvals'

// HR
import { HRDashboard } from './pages/hr/Dashboard'
import { Companies } from './pages/hr/Companies'
import { Employees } from './pages/hr/Employees'
import { Departments } from './pages/hr/Departments'
import { AttendancePage } from './pages/hr/Attendance'
import { LeaveRequests } from './pages/hr/LeaveRequests'
import { OvertimeAdmin } from './pages/hr/Overtime'
import { ReimbursementAdmin } from './pages/hr/Reimbursement'
import { Contracts } from './pages/hr/Contracts'
import { PayrollAdmin } from './pages/hr/Payroll'
import { Loans as LoansAdmin } from './pages/hr/Loans'
import { AuditLogAdmin } from './pages/hr/AuditLog'
import { AnnouncementsAdmin } from './pages/hr/Announcements'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function PrivateRoute({ children, allowedRoles }: { children: ReactNode, allowedRoles?: UserRole[] }) {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return <LoadingState message="Memverifikasi Autentikasi..." />
  }

  if (!session || !profile) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to={`/${profile.role}`} replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            
            {/* EMPLOYEE PORTAL */}
            <Route path="/employee" element={<PrivateRoute allowedRoles={['employee', 'manager', 'hr']}><EmployeeDashboard /></PrivateRoute>} />
            <Route path="/employee/attendance" element={<PrivateRoute allowedRoles={['employee', 'manager', 'hr']}><EmployeeAttendance /></PrivateRoute>} />
            <Route path="/employee/leave" element={<PrivateRoute allowedRoles={['employee', 'manager', 'hr']}><LeaveRequestEmployee /></PrivateRoute>} />
            <Route path="/employee/overtime" element={<PrivateRoute allowedRoles={['employee', 'manager', 'hr']}><OvertimeEmployee /></PrivateRoute>} />
            <Route path="/employee/reimbursement" element={<PrivateRoute allowedRoles={['employee', 'manager', 'hr']}><ReimbursementEmployee /></PrivateRoute>} />
            <Route path="/employee/payslips" element={<PrivateRoute allowedRoles={['employee', 'manager', 'hr']}><PayslipsEmployee /></PrivateRoute>} />
            <Route path="/employee/loans" element={<PrivateRoute allowedRoles={['employee', 'manager', 'hr']}><LoansEmployee /></PrivateRoute>} />
            <Route path="/employee/profile" element={<PrivateRoute allowedRoles={['employee', 'manager', 'hr']}><ProfileEmployee /></PrivateRoute>} />

            {/* MANAGER PORTAL */}
            <Route path="/manager" element={<PrivateRoute allowedRoles={['manager']}><ManagerDashboard /></PrivateRoute>} />
            <Route path="/manager/team-attendance" element={<PrivateRoute allowedRoles={['manager']}><TeamAttendance /></PrivateRoute>} />
            <Route path="/manager/approvals" element={<PrivateRoute allowedRoles={['manager']}><Approvals /></PrivateRoute>} />
            
            {/* HR PORTAL */}
            <Route path="/hr" element={<PrivateRoute allowedRoles={['hr']}><HRDashboard /></PrivateRoute>} />
            <Route path="/hr/companies" element={<PrivateRoute allowedRoles={['hr']}><Companies /></PrivateRoute>} />
            <Route path="/hr/employees" element={<PrivateRoute allowedRoles={['hr']}><Employees /></PrivateRoute>} />
            <Route path="/hr/departments" element={<PrivateRoute allowedRoles={['hr']}><Departments /></PrivateRoute>} />
            <Route path="/hr/attendance" element={<PrivateRoute allowedRoles={['hr']}><AttendancePage /></PrivateRoute>} />
            <Route path="/hr/leaves" element={<PrivateRoute allowedRoles={['hr']}><LeaveRequests /></PrivateRoute>} />
            <Route path="/hr/overtime" element={<PrivateRoute allowedRoles={['hr']}><OvertimeAdmin /></PrivateRoute>} />
            <Route path="/hr/reimbursement" element={<PrivateRoute allowedRoles={['hr']}><ReimbursementAdmin /></PrivateRoute>} />
            <Route path="/hr/contracts" element={<PrivateRoute allowedRoles={['hr']}><Contracts /></PrivateRoute>} />
            <Route path="/hr/payroll" element={<PrivateRoute allowedRoles={['hr']}><PayrollAdmin /></PrivateRoute>} />
            <Route path="/hr/loans" element={<PrivateRoute allowedRoles={['hr']}><LoansAdmin /></PrivateRoute>} />
            <Route path="/hr/audit-log" element={<PrivateRoute allowedRoles={['hr']}><AuditLogAdmin /></PrivateRoute>} />
            <Route path="/hr/announcements" element={<PrivateRoute allowedRoles={['hr']}><AnnouncementsAdmin /></PrivateRoute>} />

          </Routes>
          <Toaster />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
