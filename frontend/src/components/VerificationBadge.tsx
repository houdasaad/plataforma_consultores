import { Verified as VerifiedIcon } from '@mui/icons-material'
import { Chip } from '@mui/material'

type Props = {
  visible: boolean
  size?: 'small' | 'medium'
}

export function VerificationBadge({ visible, size = 'small' }: Props) {
  if (!visible) return null
  return (
    <Chip
      icon={<VerifiedIcon fontSize="small" />}
      label="Verificado"
      size={size}
      color="success"
      variant="outlined"
      sx={{
        fontWeight: 600,
        borderColor: 'success.main',
        color: 'success.dark',
      }}
    />
  )
}
