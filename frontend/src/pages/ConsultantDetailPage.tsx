import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { CandidateBookingCalendar } from '../components/CandidateBookingCalendar'
import { ConsultantSocialLinks, type SocialLinks } from '../components/ConsultantSocialLinks'
import { ReviewForm } from '../components/ReviewForm'
import { StarRating } from '../components/StarRating'
import { VerificationBadge } from '../components/VerificationBadge'
// FROZEN — ServiceEngagementActions excluded from MVP (CORFO model v1)
// import { ServiceEngagementActions } from '../components/ServiceEngagementActions'
import { userCanAccess } from '../auth/access'
import { useAuth } from '../auth/AuthContext'

type PublishedCv = {
  education: { type: string; university: string; year_start: string; year_end: string }[]
  campaign_experience: {
    campaign: string
    service: string
    year: string
    contact_name: string
    contact_email: string
    contact_phone: string
  }[]
}

type RecentReview = {
  id: number
  work_quality_score: number
  comment: string
  created_at: string
  reviewer_name: string
}

type Consultant = {
  id: number
  display_name: string
  headline: string
  bio: string
  hourly_rate: string | null
  professional_title: string
  country: string
  city: string
  categories: string[]
  community_score_avg: number | null
  published_cv: PublishedCv | null
  social_links?: SocialLinks
  is_verified?: boolean
  avg_rating?: number | null
  total_ratings?: number
  recent_reviews?: RecentReview[]
}

type BookingItem = {
  id: number
  status: string
  consultant: number
  slot_start_at: string | null
  slot_end_at: string | null
  service_verified: boolean
}

export function ConsultantDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [lastBookingId, setLastBookingId] = useState<number | null>(null)

  const consultantQuery = useQuery({
    queryKey: ['consultant', id],
    queryFn: async () => {
      const { data } = await api.get<Consultant>(`/consultants/${id}/`)
      return data
    },
    enabled: Boolean(id),
  })

  const userBookingsQuery = useQuery({
    queryKey: ['my-bookings'],
    queryFn: async () => {
      const { data } = await api.get<BookingItem[]>('/bookings/')
      return data
    },
    enabled: Boolean(user && userCanAccess(user, 'candidate')),
  })

  const canReview = Boolean(
    user &&
    userCanAccess(user, 'candidate') &&
    (userBookingsQuery.data ?? []).find(
      (b) =>
        b.consultant === Number(id) &&
        b.status === 'confirmed' &&
        b.slot_end_at != null &&
        new Date(b.slot_end_at) < new Date() &&
        b.service_verified === true,
    ),
  )

  const reviewBookingId =
    canReview && userBookingsQuery.data
      ? (userBookingsQuery.data.find(
          (b) =>
            b.consultant === Number(id) &&
            b.status === 'confirmed' &&
            b.slot_end_at != null &&
            new Date(b.slot_end_at) < new Date() &&
            b.service_verified === true,
        )?.id ?? undefined)
      : undefined

  const bookMutation = useMutation({
    mutationFn: async ({ slotId }: { slotId: number }) => {
      const { data } = await api.post('/bookings/create/', { slot_id: slotId })
      return data as { id: number }
    },
    onSuccess: (data) => {
      setLastBookingId(data.id)
      void qc.invalidateQueries({ queryKey: ['slots', id] })
    },
  })

  const mpCheckout = useMutation({
    mutationFn: async (bookingId: number) => {
      const { data } = await api.post<{ init_point: string; id: string }>(
        '/payments/mercadopago/preference/',
        { booking_id: bookingId },
      )
      return data
    },
    onSuccess: (pref) => {
      const url = pref.init_point
      if (url.startsWith('http')) {
        window.location.href = url
      } else {
        navigate(url)
      }
    },
  })

  if (!id) return null

  const canBook = userCanAccess(user, 'candidate')

  return (
    <Stack spacing={2}>
      {consultantQuery.isError && <Alert severity="error">Consultor no encontrado.</Alert>}
      {consultantQuery.data && (
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
              <Typography variant="h5">{consultantQuery.data.display_name}</Typography>
              <VerificationBadge visible={consultantQuery.data.is_verified === true} />
            </Stack>
            <Typography color="text.secondary">{consultantQuery.data.headline}</Typography>
            {consultantQuery.data.professional_title && (
              <Typography variant="body2" sx={{ mt: 1 }}>{consultantQuery.data.professional_title}</Typography>
            )}
            <Typography sx={{ mt: 2 }}>{consultantQuery.data.bio}</Typography>
            <Typography variant="caption" sx={{ mt: 2, display: 'block' }}>
              {consultantQuery.data.city} {consultantQuery.data.country}
              {consultantQuery.data.hourly_rate ? (
                <> · Tarifa: {consultantQuery.data.hourly_rate} USD/hora</>
              ) : null}
            </Typography>
            {consultantQuery.data.avg_rating != null && consultantQuery.data.avg_rating > 0 && (
              <Box sx={{ mt: 0.5 }}>
                <StarRating value={consultantQuery.data.avg_rating} count={consultantQuery.data.total_ratings} size="medium" />
              </Box>
            )}
            {consultantQuery.data.community_score_avg != null && (
              <Typography variant="caption" sx={{ display: 'block' }}>
                Verificación comunidad: {consultantQuery.data.community_score_avg}/5
              </Typography>
            )}
            <ConsultantSocialLinks links={consultantQuery.data.social_links} />
          </CardContent>
        </Card>
      )}

      {consultantQuery.data?.published_cv && (
        <>
          <Typography variant="h6">Formación y experiencia</Typography>
          {consultantQuery.data.published_cv.education.length > 0 && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>Educación</Typography>
                {consultantQuery.data.published_cv.education.map((edu, i) => (
                  <Typography key={i} variant="body2" sx={{ mb: 1 }}>
                    <strong>{edu.type}</strong>
                    {edu.university ? ` — ${edu.university}` : ''}
                    {(edu.year_start || edu.year_end) &&
                      ` (${edu.year_start}${edu.year_end ? `–${edu.year_end}` : ''})`}
                  </Typography>
                ))}
              </CardContent>
            </Card>
          )}
          {consultantQuery.data.published_cv.campaign_experience.length > 0 && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Experiencia en campañas
                </Typography>
                {consultantQuery.data.published_cv.campaign_experience.map((exp, i) => (
                  <Box key={i} sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <strong>{exp.campaign}</strong>
                      {exp.year ? ` (${exp.year})` : ''}
                    </Typography>
                    {exp.service && (
                      <Typography variant="body2" color="text.secondary">
                        {exp.service}
                      </Typography>
                    )}
                    {(exp.contact_name || exp.contact_email || exp.contact_phone) && (
                      <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
                        Contacto: {exp.contact_name}
                        {exp.contact_email ? ` · ${exp.contact_email}` : ''}
                        {exp.contact_phone ? ` · ${exp.contact_phone}` : ''}
                      </Typography>
                    )}
                  </Box>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* FROZEN — Services excluded from MVP (CORFO model v1)
      {(consultantQuery.data?.services ?? []).length > 0 && (
        <>
          <Typography variant="h6">Servicios (USD)</Typography>
          ...
        </>
      )}
      */}

      {consultantQuery.data && consultantQuery.data.categories.length > 0 && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              Áreas de consultoría por hora
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              {consultantQuery.data.categories.map((cat) => (
                <Chip key={cat} label={cat} variant="outlined" size="small" />
              ))}
            </Stack>
            {consultantQuery.data.hourly_rate && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Tarifa: <strong>{consultantQuery.data.hourly_rate} USD/hora</strong>
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reviews section */}
      {consultantQuery.data?.recent_reviews && consultantQuery.data.recent_reviews.length > 0 && (
        <>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="h6">Reseñas</Typography>
            {consultantQuery.data.avg_rating != null && (
              <StarRating value={consultantQuery.data.avg_rating} count={consultantQuery.data.total_ratings} size="medium" />
            )}
          </Stack>
          <Stack spacing={1.5}>
            {consultantQuery.data.recent_reviews.map((rev) => (
              <Paper key={rev.id} variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                  <Avatar sx={{ width: 28, height: 28, fontSize: 14 }}>
                    {rev.reviewer_name.charAt(0).toUpperCase()}
                  </Avatar>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {rev.reviewer_name}
                  </Typography>
                  <StarRating value={rev.work_quality_score} size="small" />
                </Stack>
                {rev.comment && (
                  <Typography variant="body2" color="text.secondary">
                    {rev.comment}
                  </Typography>
                )}
                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
                  {new Date(rev.created_at).toLocaleDateString('es-CL', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Typography>
              </Paper>
            ))}
          </Stack>
        </>
      )}

      {/* Review form for candidates with a completed consultation */}
      {user && userCanAccess(user, 'candidate') && !canReview && (
        <Alert severity="info" sx={{ mt: 1 }}>
          Solo los candidatos que han completado una consultoría verificada pueden evaluar a este consultor.
        </Alert>
      )}
      <ReviewForm
        consultantId={Number(id)}
        canReview={canReview}
        bookingId={reviewBookingId}
        onReviewSubmitted={() => {
          void qc.invalidateQueries({ queryKey: ['consultant', id] })
          void qc.invalidateQueries({ queryKey: ['my-bookings'] })
        }}
      />

      <Typography variant="h6">Reservar consulta</Typography>
      {!user && (
        <Alert severity="info">
          Puede ver la disponibilidad sin cuenta. Para reservar debe registrarse como candidato.
        </Alert>
      )}
      {user && !userCanAccess(user, 'candidate') && (
        <Alert severity="warning">Solo candidatos pueden reservar.</Alert>
      )}

      <CandidateBookingCalendar
        consultantId={id}
        canBook={Boolean(canBook)}
        bookingPending={bookMutation.isPending}
        onBook={(slotId) => {
          if (!canBook) return
          bookMutation.mutate({ slotId })
        }}
      />

      {bookMutation.isError && (
        <Alert severity="error">
          No se pudo crear la reserva. El horario puede haber sido tomado por otro candidato.
        </Alert>
      )}

      {lastBookingId && userCanAccess(user, 'candidate') && (
        <Alert severity="success">
          Reserva #{lastBookingId} creada. Pague con Mercado Pago (mock) o simulación directa.
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Button size="small" variant="contained" onClick={() => mpCheckout.mutate(lastBookingId)}>
              Pagar con Mercado Pago (mock)
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={async () => {
                await api.post('/payments/mock-checkout/', { booking_id: lastBookingId })
                navigate('/candidato')
              }}
            >
              Pago rápido (mock)
            </Button>
          </Stack>
        </Alert>
      )}
    </Stack>
  )
}
