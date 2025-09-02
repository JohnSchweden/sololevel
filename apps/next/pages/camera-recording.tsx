import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import { useCallback } from 'react'

// Dynamically import the camera component to avoid SSR issues with Expo modules
const CameraRecordingScreen = dynamic(
  () =>
    import('app/features/CameraRecording/CameraRecordingScreen').then((mod) => ({
      default: mod.CameraRecordingScreen,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: 'black',
          color: 'white',
          fontSize: '18px',
        }}
      >
        Loading Camera...
      </div>
    ),
  }
)

/**
 * Camera Recording Page - Next.js
 * Dedicated camera recording interface
 * Uses Next.js router for navigation
 * Camera components are loaded client-side only to avoid SSR issues
 */
export default function RecordPage() {
  const router = useRouter()

  // Navigation handlers following Next.js router patterns
  const handleNavigateBack = useCallback(() => {
    router.back()
  }, [router])

  // Side sheet is now handled internally by CameraRecordingScreen

  const handleTabChange = useCallback(
    (tab: 'coach' | 'record' | 'insights') => {
      // Navigate to different tabs using Next.js router
      switch (tab) {
        case 'coach':
          router.push('/') // Navigate to home page
          break
        case 'record':
          // Already on record page
          break
        case 'insights':
          router.push('/') // Navigate to home page for now - placeholder
          break
      }
    },
    [router]
  )

  return (
    <CameraRecordingScreen
      onNavigateBack={handleNavigateBack}
      onTabChange={handleTabChange}
    />
  )
}
