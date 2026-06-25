import { Star, StarBorder } from '@mui/icons-material'
import { Box, Rating, Typography } from '@mui/material'

type Props = {
  /** Average rating (1-5), may be a float like 4.2 */
  value: number
  /** Total number of ratings received */
  count?: number
  /** Font size variant for the text label */
  size?: 'small' | 'medium'
}

export function StarRating({ value, count, size = 'small' }: Props) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Rating
        value={value}
        readOnly
        precision={0.5}
        size={size}
        icon={<Star fontSize="inherit" sx={{ color: '#faaf00' }} />}
        emptyIcon={<StarBorder fontSize="inherit" sx={{ color: '#faaf00', opacity: 0.4 }} />}
      />
      {count != null && count > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ ml: 0.25 }}>
          ({count})
        </Typography>
      )}
    </Box>
  )
}
