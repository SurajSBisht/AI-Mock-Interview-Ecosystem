import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { PageWrapper } from './components/layout/PageWrapper'
import { ProtectedRoute } from './components/shared/ProtectedRoute'
import { RoleGuard } from './components/shared/RoleGuard'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Dashboard } from './pages/Dashboard'
import { QuestionBank } from './pages/QuestionBank'
import { InterviewSession } from './pages/InterviewSession'
import { EvaluationResult } from './pages/EvaluationResult'
import { FeedbackReport } from './pages/FeedbackReport'
import { PracticePlan } from './pages/PracticePlan'
import { Notifications } from './pages/Notifications'
import { AdminPanel } from './pages/AdminPanel'

function App() {
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    const theme = localStorage.getItem('theme')

    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
      return
    }

    document.documentElement.classList.remove('dark')
  }, [])

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />}
      />

      <Route element={<ProtectedRoute />}>
        <Route
          path="/dashboard"
          element={
            <PageWrapper>
              <Dashboard />
            </PageWrapper>
          }
        />
        <Route
          path="/notifications"
          element={
            <PageWrapper>
              <Notifications />
            </PageWrapper>
          }
        />
        <Route
          path="/feedback/:id"
          element={
            <PageWrapper>
              <FeedbackReport />
            </PageWrapper>
          }
        />
        <Route
          path="/interview/:id/result"
          element={
            <PageWrapper>
              <EvaluationResult />
            </PageWrapper>
          }
        />
      </Route>

      <Route element={<RoleGuard allowedRoles={['candidate']} />}>
        <Route
          path="/interview"
          element={
            <PageWrapper>
              <InterviewSession />
            </PageWrapper>
          }
        />
        <Route
          path="/practice-plan"
          element={
            <PageWrapper>
              <PracticePlan />
            </PageWrapper>
          }
        />
      </Route>

      <Route element={<RoleGuard allowedRoles={['coach', 'admin']} />}>
        <Route
          path="/questions"
          element={
            <PageWrapper>
              <QuestionBank />
            </PageWrapper>
          }
        />
      </Route>

      <Route element={<RoleGuard allowedRoles={['admin']} />}>
        <Route
          path="/admin"
          element={
            <PageWrapper>
              <AdminPanel />
            </PageWrapper>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
