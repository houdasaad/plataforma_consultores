import FacebookIcon from '@mui/icons-material/Facebook'
import InstagramIcon from '@mui/icons-material/Instagram'
import LanguageIcon from '@mui/icons-material/Language'
import LinkedInIcon from '@mui/icons-material/LinkedIn'
import XIcon from '@mui/icons-material/X'
import YouTubeIcon from '@mui/icons-material/YouTube'
import { Button, Stack } from '@mui/material'

export type SocialLinks = {
  linkedin?: string
  twitter?: string
  instagram?: string
  facebook?: string
  youtube?: string
  website?: string
}

const entries: { key: keyof SocialLinks; label: string; icon: React.ReactNode }[] = [
  { key: 'linkedin', label: 'LinkedIn', icon: <LinkedInIcon fontSize="small" /> },
  { key: 'twitter', label: 'X', icon: <XIcon fontSize="small" /> },
  { key: 'instagram', label: 'Instagram', icon: <InstagramIcon fontSize="small" /> },
  { key: 'facebook', label: 'Facebook', icon: <FacebookIcon fontSize="small" /> },
  { key: 'youtube', label: 'YouTube', icon: <YouTubeIcon fontSize="small" /> },
  { key: 'website', label: 'Web', icon: <LanguageIcon fontSize="small" /> },
]

function hrefFor(url: string) {
  const u = url.trim()
  if (!u) return ''
  return u.startsWith('http') ? u : `https://${u}`
}

type Props = {
  links?: SocialLinks | null
}

export function ConsultantSocialLinks({ links }: Props) {
  if (!links) return null
  const visible = entries.filter((e) => (links[e.key] ?? '').trim())
  if (!visible.length) return null

  return (
    <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
      {visible.map((e) => (
        <Button
          key={e.key}
          size="small"
          variant="outlined"
          startIcon={e.icon}
          component="a"
          href={hrefFor(links[e.key] ?? '')}
          target="_blank"
          rel="noopener noreferrer"
        >
          {e.label}
        </Button>
      ))}
    </Stack>
  )
}
