import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import HubRoundedIcon from '@mui/icons-material/HubRounded'
import {
  Alert,
  Box,
  Button,
  Chip,
  Link,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { MvpCronogramaPanel } from '../components/MvpCronogramaPanel'

export function HomePage() {
  const [mainTab, setMainTab] = useState(0)

  return (
    <Stack spacing={{ xs: 4, md: 5 }}>
      <Tabs
        value={mainTab}
        onChange={(_, v) => setMainTab(v)}
        variant="fullWidth"
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, py: 1.5 },
        }}
      >
        <Tab label="Inicio" />
        <Tab label="Cronograma" />
      </Tabs>

      {mainTab === 1 && <MvpCronogramaPanel />}

      {mainTab === 0 && (
        <>
      <Paper
        elevation={0}
        sx={{
          position: 'relative',
          overflow: 'hidden',
          p: { xs: 3, sm: 4, md: 5 },
          borderRadius: 4,
          border: (t) => `1px solid ${alpha(t.palette.primary.main, 0.12)}`,
          background: (t) =>
            `linear-gradient(135deg, ${alpha(t.palette.primary.main, 0.08)} 0%, ${alpha(t.palette.background.paper, 1)} 38%, ${alpha(t.palette.secondary.main, 0.06)} 100%)`,
        }}
      >
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: -1,
            background: (t) =>
              `radial-gradient(520px 220px at 18% 10%, ${alpha(t.palette.primary.light, 0.35)} 0%, transparent 60%)`,
            pointerEvents: 'none',
          }}
        />
        <Stack spacing={2.5} sx={{ position: 'relative' }}>
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ flexWrap: 'wrap', alignItems: 'center', columnGap: 1, rowGap: 1 }}
          >
            <Chip icon={<HubRoundedIcon />} label="MVP · LATAM" color="primary" variant="outlined" />
            <Chip label="Django + DRF" variant="outlined" />
            <Chip label="React + MUI" variant="outlined" />
          </Stack>
          <Typography variant="h3" component="h1" sx={{ maxWidth: { xs: '100%', md: 820 } }}>
            Conecta candidatos y consultores con una experiencia clara y profesional
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" sx={{ maxWidth: { md: '62ch' } }}>
            Perfiles verificados, diagnóstico inicial, recomendación por criterios, reservas con agenda y flujo de pago
            simulado listo para integrar una pasarela real cuando lo decidas.
          </Typography>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}
          >
            <Button
              component={RouterLink}
              to="/consultores"
              variant="contained"
              size="large"
              endIcon={<ArrowForwardRoundedIcon />}
            >
              Explorar consultores
            </Button>
            <Button component={RouterLink} to="/registro" variant="outlined" size="large">
              Crear cuenta
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Box
        sx={{
          display: 'grid',
          gap: { xs: 2, md: 3 },
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
        }}
      >
        {[
          {
            title: 'Confianza operativa',
            body: 'Roles, aprobación de consultores y panel staff para gobernar el catálogo público.',
          },
          {
            title: 'Experiencia guiada',
            body: 'Diagnóstico y recomendaciones para acercar al candidato al perfil adecuado.',
          },
          {
            title: 'Listo para crecer',
            body: 'Reservas, pagos mock y enlaces de reunión; arquitectura desacoplada para escalar.',
          },
        ].map((card) => (
          <Paper
            key={card.title}
            sx={{
              height: '100%',
              p: 2.5,
              borderRadius: 3,
              border: (t) => `1px solid ${alpha(t.palette.divider, 1)}`,
              transition: (t) => t.transitions.create(['transform', 'box-shadow']),
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: (t) => t.shadows[4],
              },
            }}
          >
            <Typography variant="h6" gutterBottom>
              {card.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {card.body}
            </Typography>
          </Paper>
        ))}
      </Box>

      <Alert severity="info" icon={false} sx={{ borderRadius: 3 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }} gutterBottom>
          Enlaces útiles
        </Typography>
        <Typography variant="body2" color="text.secondary">
          API:{' '}
          <Link href="/api/docs/" underline="hover">
            documentación OpenAPI
          </Link>{' '}
          · Admin Django:{' '}
          <Link href="http://127.0.0.1:8000/admin/" target="_blank" rel="noreferrer" underline="hover">
            panel administrador
          </Link>
        </Typography>
      </Alert>
        </>
      )}
    </Stack>
  )
}
