import {
  Alert,
  Button,
  Card,
  CardContent,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

type Bid = {
  id: number
  provider_name: string
  provider_id: number
  service_name: string
  description: string
  max_days: number
  max_price_usd: string
  status: string
  created_at: string
}

type Requirement = {
  id: number
  title: string
  description: string
  max_budget_usd: string
  bids: Bid[]
}

type Props = {
  requirementId: number
}

export function CandidateBidComparison({ requirementId }: Props) {
  const qc = useQueryClient()

  const reqQuery = useQuery({
    queryKey: ['requirement', requirementId],
    queryFn: async () => {
      const { data } = await api.get<Requirement>(`/candidates/marketplace/requirements/${requirementId}/`)
      return data
    },
  })

  const acceptBid = useMutation({
    mutationFn: async (bidId: number) =>
      api.post(`/candidates/marketplace/bids/${bidId}/accept/`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['requirement', requirementId] })
      void qc.invalidateQueries({ queryKey: ['my-requirements'] })
      void qc.invalidateQueries({ queryKey: ['bookings'] })
    },
  })

  const bids = reqQuery.data?.bids ?? []

  return (
    <Stack spacing={2}>
      {reqQuery.data && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {reqQuery.data.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {reqQuery.data.description}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Presupuesto máximo: {reqQuery.data.max_budget_usd} USD
            </Typography>
          </CardContent>
        </Card>
      )}

      {bids.length === 0 && !reqQuery.isLoading && (
        <Alert severity="info">
          Aún no hay cotizaciones para este requerimiento. Los proveedores podrán enviarlas cuando el
          requerimiento esté publicado.
        </Alert>
      )}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Proveedor</TableCell>
              <TableCell>Propuesta</TableCell>
              <TableCell>Precio (USD)</TableCell>
              <TableCell>Plazo (días)</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Acción</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {bids.map((b) => (
              <TableRow key={b.id}>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {b.provider_name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{b.service_name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {b.description}
                  </Typography>
                </TableCell>
                <TableCell>{b.max_price_usd}</TableCell>
                <TableCell>{b.max_days}</TableCell>
                <TableCell>
                  <Alert
                    severity={
                      b.status === 'accepted'
                        ? 'success'
                        : b.status === 'rejected'
                          ? 'error'
                          : 'info'
                    }
                    sx={{ py: 0 }}
                    icon={false}
                  >
                    {b.status}
                  </Alert>
                </TableCell>
                <TableCell>
                  {b.status === 'pending' && (
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      onClick={() => acceptBid.mutate(b.id)}
                      disabled={acceptBid.isPending}
                    >
                      Aceptar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {acceptBid.isSuccess && acceptBid.data?.data && (
        <Alert severity="success">
          Cotización aceptada. Reserva #{(acceptBid.data.data as { booking_id: number }).booking_id} creada.
          Diríjase a su panel para pagar.
        </Alert>
      )}
    </Stack>
  )
}
