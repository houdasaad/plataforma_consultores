import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import CalendarViewWeekRoundedIcon from '@mui/icons-material/CalendarViewWeekRounded'
import {
  Box,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useState } from 'react'
import {
  MVP_CLIENT_FEATURE_BLOCKS,
  MVP_CRONOGRAMA_8_WEEKS,
} from '../data/mvpProjectCronograma8Weeks'

const FEATURES_TAB_INDEX = 8

function statusColor(status?: string): 'default' | 'primary' | 'success' | 'warning' {
  if (!status) return 'default'
  if (status.toLowerCase().includes('iniciado')) return 'success'
  if (status.toLowerCase().includes('planificado')) return 'default'
  return 'warning'
}

export function MvpCronogramaPanel() {
  const [tab, setTab] = useState(0)
  const isFeatures = tab === FEATURES_TAB_INDEX
  const w = !isFeatures ? MVP_CRONOGRAMA_8_WEEKS[tab] : null

  return (
    <Stack spacing={2.5}>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: '72ch' }}>
        Plan de <strong>8 semanas</strong> según la hoja «Cronograma MVP 8 semanas». Usa las pestañas de la semana para
        tareas y entregables; <strong>Características</strong> resume lo que la aplicación ofrece a consultores,
        candidatos y al equipo del programa, en lenguaje de valor (sin detalle de implementación).
      </Typography>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTab-root': { minHeight: 48, textTransform: 'none', fontWeight: 600 },
        }}
      >
        {MVP_CRONOGRAMA_8_WEEKS.map((wk) => (
          <Tab key={wk.week} label={`Semana ${wk.week}`} />
        ))}
        <Tab icon={<AutoAwesomeRoundedIcon />} iconPosition="start" label="Características" />
      </Tabs>

      {!isFeatures && w ? (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: 3,
            border: (t) => `1px solid ${alpha(t.palette.divider, 1)}`,
          }}
        >
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
              <CalendarViewWeekRoundedIcon color="primary" />
              <Typography variant="h6" component="h2">
                {w.phase}
              </Typography>
              {w.status ? <Chip size="small" label={w.status} color={statusColor(w.status)} variant="outlined" /> : null}
            </Stack>

            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Tareas de la semana
              </Typography>
              <List dense disablePadding>
                {w.tasks.map((task) => (
                  <ListItem key={task} disableGutters sx={{ py: 0.35, alignItems: 'flex-start' }}>
                    <ListItemIcon sx={{ minWidth: 28, mt: 0.35 }}>
                      <Box
                        component="span"
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: 'primary.main',
                          display: 'inline-block',
                        }}
                      />
                    </ListItemIcon>
                    <ListItemText primary={task} slotProps={{ primary: { variant: 'body2' } }} />
                  </ListItem>
                ))}
              </List>
            </Box>

            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Entregables esperados
              </Typography>
              <List dense disablePadding>
                {w.deliverables.map((d) => (
                  <ListItem key={d} disableGutters sx={{ py: 0.35, alignItems: 'flex-start' }}>
                    <ListItemIcon sx={{ minWidth: 28, mt: 0.35 }}>
                      <Box
                        component="span"
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: 1,
                          bgcolor: 'secondary.main',
                          display: 'inline-block',
                        }}
                      />
                    </ListItemIcon>
                    <ListItemText primary={d} slotProps={{ primary: { variant: 'body2' } }} />
                  </ListItem>
                ))}
              </List>
            </Box>
          </Stack>
        </Paper>
      ) : (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: 3,
            border: (t) => `1px solid ${alpha(t.palette.divider, 1)}`,
          }}
        >
          <Stack spacing={0}>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 2 }}>
              <AutoAwesomeRoundedIcon color="primary" />
              <Typography variant="h6" component="h2">
                Características para usuarios del servicio
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: '72ch' }}>
              Basado en el alcance funcional del presupuesto referencial del MVP: lo que experimentan consultores,
              personas que buscan asesoría y el equipo que administra el programa.
            </Typography>
            {MVP_CLIENT_FEATURE_BLOCKS.map((block, i) => (
              <Box key={block.title}>
                {i > 0 ? <Divider sx={{ my: 2 }} /> : null}
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {block.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                  {block.description}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Paper>
      )}
    </Stack>
  )
}
