import { Box, Stack, Typography } from '@mui/material'
import { ApprovedConsultantsList } from '../components/ApprovedConsultantsList'

export function ConsultantsPage() {
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.14em' }}>
          Directorio
        </Typography>
        <Typography variant="h4" component="h1" sx={{ mt: 0.5 }}>
          Consultores aprobados
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: '70ch' }}>
          Catálogo público para candidatos: consultores aprobados que ofrecen consultoría por hora. Filtre por área de especialidad y reserve un horario.
        </Typography>
      </Box>

      <ApprovedConsultantsList showFilters title="" description="" />
    </Stack>
  )
}
