import { ToastViewport as ToastViewportOg } from '@my/ui'
import { useEffect, useState } from 'react'

// Render toast viewport only on client to avoid SSR/CSR attribute diffs
export const ToastViewport = () => {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <ToastViewportOg
      left={0}
      right={0}
      top={10}
    />
  )
}
