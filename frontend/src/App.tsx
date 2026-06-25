import { CircularProgress, Stack } from '@mui/material'
import { Navigate, Route, Routes } from 'react-router-dom'
import { userCanAccess } from './auth/access'
import { useAuth, type Role } from './auth/AuthContext'
import { MainLayout } from './layouts/MainLayout'
import { CampaignDiagnosticPage } from './pages/CampaignDiagnosticPage'
import { CandidateDashboardPage } from './pages/CandidateDashboardPage'
import { CandidateMarketplacePage } from './pages/CandidateMarketplacePage'
import { ConsultantCandidateProfilePage } from './pages/ConsultantCandidateProfilePage'
import { ConsultantPortalPage } from './pages/ConsultantPortalPage'
import { MarketplacePage } from './pages/MarketplacePage'
import { ProviderPortalPage } from './pages/ProviderPortalPage'
import { MercadoPagoMockPage } from './pages/MercadoPagoMockPage'
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
  if (!userCanAccess(user, role)) return <Navigate to="/" replace />
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
          path="candidato/marketplace"
          element={
            <RequireRole role="candidate">
              <CandidateMarketplacePage />
            </RequireRole>
          }
        />

        <Route
          path="proveedor"
          element={
            <RequireRole role="provider">
              <ProviderPortalPage />
            </RequireRole>
          }
        />

        <Route
          path="marketplace"
          element={
            <RequireRole role="provider">
              <MarketplacePage />
            </RequireRole>
          }
        />

        <Route path="pago/mercadopago-mock" element={<MercadoPagoMockPage />} />

        <Route
          path="consultor"
          element={
            <RequireRole role="consultant">
              <ConsultantPortalPage />
            </RequireRole>
          }
        />
        <Route
          path="consultor/candidato/:userId"
          element={
            <RequireRole role="consultant">
              <ConsultantCandidateProfilePage />
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
