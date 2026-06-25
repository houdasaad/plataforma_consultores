import {
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

type Payment = {
  id: number
  booking_id: number
  consultant_name: string | null
  provider_name: string | null
  candidate_name: string | null
  amount: string
  commission_amount: string
  net_amount: string
  currency: string
  status: string
  provider: string
  paid_at: string | null
  service_verified_at: string | null
  released_at: string | null
  created_at: string
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  succeeded: 'Cobrado',
  failed: 'Fallido',
  held: 'Retenido',
  released: 'Liberado',
  refunded: 'Reembolsado',
}

const STATUS_COLORS: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'> = {
  pending: 'warning',
  succeeded: 'success',
  failed: 'error',
  held: 'info',
  released: 'primary',
  refunded: 'default',
}

function formatDate(s: string | null): string {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('es-CL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatAmount(n: string): string {
  return Number(n).toLocaleString('es-CL', { minimumFractionDigits: 2 })
}

interface PaymentHistoryPanelProps {
  /** API endpoint to fetch payments from (e.g. '/candidates/me/payments/') */
  endpoint: string
  /** Which role is viewing — affects column visibility */
  role: 'candidate' | 'consultant' | 'provider' | 'staff'
  /** Title for the table section */
  title?: string
}

export function PaymentHistoryPanel({ endpoint, role, title = 'Historial de pagos' }: PaymentHistoryPanelProps) {
  const paymentsQuery = useQuery({
    queryKey: ['payments', endpoint],
    queryFn: async () => {
      const { data } = await api.get<Payment[] | { results: Payment[] }>(endpoint)
      return Array.isArray(data) ? data : (data as { results: Payment[] }).results ?? []
    },
  })

  const payments = paymentsQuery.data ?? []

  if (payments.length === 0 && !paymentsQuery.isLoading) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
        No hay pagos registrados aún.
      </Typography>
    )
  }

  return (
    <TableContainer>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
        {title}
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Booking</TableCell>
            {(role === 'candidate' || role === 'staff') && <TableCell>Destinatario</TableCell>}
            {(role === 'consultant' || role === 'staff') && <TableCell>Candidato</TableCell>}
            {(role === 'provider' || role === 'staff') && <TableCell>Candidato</TableCell>}
            <TableCell align="right">Monto</TableCell>
            <TableCell align="right">Comisión</TableCell>
            {(role === 'consultant' || role === 'provider' || role === 'staff') && (
              <TableCell align="right">Neto</TableCell>
            )}
            <TableCell>Estado</TableCell>
            <TableCell>Fecha</TableCell>
            {role === 'staff' && <TableCell>Pagado</TableCell>}
            {role === 'staff' && <TableCell>Serv. Verif.</TableCell>}
            {role === 'staff' && <TableCell>Liberado</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {payments.map((p) => (
            <TableRow key={p.id} hover>
              <TableCell>{p.id}</TableCell>
              <TableCell>#{p.booking_id}</TableCell>
              {(role === 'candidate' || role === 'staff') && (
                <TableCell>
                  {p.consultant_name || p.provider_name || '—'}
                </TableCell>
              )}
              {(role === 'consultant' || role === 'staff') && (
                <TableCell>{p.candidate_name || '—'}</TableCell>
              )}
              {(role === 'provider' || role === 'staff') && (
                <TableCell>{p.candidate_name || '—'}</TableCell>
              )}
              <TableCell align="right">
                {formatAmount(p.amount)} {p.currency}
              </TableCell>
              <TableCell align="right">
                {formatAmount(p.commission_amount)}
              </TableCell>
              {(role === 'consultant' || role === 'provider' || role === 'staff') && (
                <TableCell align="right">
                  {formatAmount(p.net_amount)}
                </TableCell>
              )}
              <TableCell>
                <Chip
                  label={STATUS_LABELS[p.status] ?? p.status}
                  size="small"
                  color={STATUS_COLORS[p.status] ?? 'default'}
                  variant="outlined"
                />
              </TableCell>
              <TableCell>{formatDate(p.created_at)}</TableCell>
              {role === 'staff' && <TableCell>{formatDate(p.paid_at)}</TableCell>}
              {role === 'staff' && <TableCell>{formatDate(p.service_verified_at)}</TableCell>}
              {role === 'staff' && <TableCell>{formatDate(p.released_at)}</TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
