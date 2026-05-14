import { CircularProgress, Stack } from '@mui/material'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth, type Role } from './auth/AuthContext'
import { MainLayout } from './layouts/MainLayout'
import { CampaignDiagnosticPage } from './pages/CampaignDiagnosticPage'
import { CandidateDashboardPage } from './pages/CandidateDashboardPage'
import { ConsultantDashboardPage } from './pages/ConsultantDashboardPage'
import { ConsultantDetailPage } from './pages/ConsultantDetailPage'
import { ConsultantsPage } from './pages/ConsultantsPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { PasswordResetConfirmPage } from './pages/PasswordResetConfirmPage'
import { PasswordResetRequestPage } from './pages/PasswordResetRequestPage'
import { RecommendationsPage } from './pages/RecommendationsPage'
import { RegisterPage } from './pages/RegisterPage'
import { StaffDashboardPage } from './pages/StaffDashboardPage'
import { VerifyEmailPage } from './pages/VerifyEmailPage'

function RequireRole({ role, children }: { role: Role; children: React.ReactElement }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <Stack sx={{ alignItems: 'center', py: 6 }}>
        <CircularProgress />
      </Stack>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== role) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="consultores" element={<ConsultantsPage />} />
        <Route path="consultores/:id" element={<ConsultantDetailPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="registro" element={<RegisterPage />} />
        <Route path="verificar-email" element={<VerifyEmailPage />} />
        <Route path="recuperar" element={<PasswordResetRequestPage />} />
        <Route path="restablecer" element={<PasswordResetConfirmPage />} />

        <Route path="diagnostico-campaña" element={<Navigate to="/candidato/diagnostico" replace />} />

        <Route
          path="candidato"
          element={
            <RequireRole role="candidate">
              <CandidateDashboardPage />
            </RequireRole>
          }
        />
        <Route
          path="candidato/diagnostico"
          element={
            <RequireRole role="candidate">
              <CampaignDiagnosticPage />
            </RequireRole>
          }
        />
        <Route
          path="candidato/recomendaciones"
          element={
            <RequireRole role="candidate">
              <RecommendationsPage />
            </RequireRole>
          }
        />

        <Route
          path="consultor"
          element={
            <RequireRole role="consultant">
              <ConsultantDashboardPage />
            </RequireRole>
          }
        />

        <Route
          path="staff"
          element={
            <RequireRole role="admin">
              <StaffDashboardPage />
            </RequireRole>
          }
        />
      </Route>
    </Routes>
  )
}
