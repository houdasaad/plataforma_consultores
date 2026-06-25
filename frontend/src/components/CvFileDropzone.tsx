import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded'
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded'
import { Alert, Box, Button, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useCallback, useRef, useState } from 'react'

const ACCEPT = '.pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain'
const MAX_MB = 5

type Props = {
  file: File | null
  onFileChange: (file: File | null) => void
  disabled?: boolean
}

export function CvFileDropzone({ file, onFileChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validate = useCallback((f: File) => {
    const ext = f.name.toLowerCase().split('.').pop()
    if (!ext || !['pdf', 'doc', 'docx', 'txt'].includes(ext)) {
      return 'Formato no admitido. Use PDF, Word (.doc, .docx) o TXT.'
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      return `El archivo supera ${MAX_MB} MB.`
    }
    return null
  }, [])

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files?.length || disabled) return
      const f = files[0]
      const err = validate(f)
      if (err) {
        setError(err)
        onFileChange(null)
        return
      }
      setError(null)
      onFileChange(f)
    },
    [disabled, onFileChange, validate],
  )

  return (
    <Stack spacing={1.5}>
      <Box
        onDragEnter={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (!disabled) setDragOver(true)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (!disabled) setDragOver(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setDragOver(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setDragOver(false)
          handleFiles(e.dataTransfer.files)
        }}
        sx={{
          p: 3,
          borderRadius: 3,
          border: (t) =>
            `2px dashed ${dragOver ? t.palette.primary.main : alpha(t.palette.divider, 1)}`,
          bgcolor: (t) =>
            dragOver ? alpha(t.palette.primary.main, 0.06) : alpha(t.palette.action.hover, 0.4),
          textAlign: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: (t) => t.transitions.create(['border-color', 'background-color']),
        }}
        onClick={() => {
          if (!disabled) inputRef.current?.click()
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          hidden
          disabled={disabled}
          onChange={(e) => {
            handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <CloudUploadRoundedIcon color={dragOver ? 'primary' : 'action'} sx={{ fontSize: 48, mb: 1 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Arrastre su CV aquí
        </Typography>
        <Typography variant="body2" color="text.secondary">
          o haga clic para elegir archivo · PDF, Word o TXT · máx. {MAX_MB} MB
        </Typography>
        {file && (
          <Stack
            direction="row"
            spacing={1}
            sx={{ mt: 2, justifyContent: 'center', alignItems: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <DescriptionRoundedIcon color="primary" fontSize="small" />
            <Typography variant="body2">{file.name}</Typography>
            <Button
              size="small"
              color="inherit"
              onClick={(e) => {
                e.stopPropagation()
                onFileChange(null)
                setError(null)
              }}
            >
              Quitar
            </Button>
          </Stack>
        )}
      </Box>
      {error && <Alert severity="error">{error}</Alert>}
    </Stack>
  )
}
