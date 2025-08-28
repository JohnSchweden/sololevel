import { YStack, Text } from 'tamagui'
import { Platform } from 'react-native'
import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { CameraView, useCameraPermissions } from 'expo-camera'

export interface CameraPreviewContainerProps {
  isRecording: boolean
  cameraType: 'front' | 'back'
  onCameraReady?: () => void
  onError?: (error: string) => void
  children?: React.ReactNode
}

export interface CameraPreviewRef {
  startRecording: () => Promise<void>
  stopRecording: () => Promise<string | null>
  takePicture: () => Promise<string | null>
  switchCamera: () => void
}

/**
 * Camera Preview Container
 * Platform-specific camera component integration with safe area handling
 * Supports both native (expo-camera) and web (getUserMedia) implementations
 */
export const CameraPreview = forwardRef<CameraPreviewRef, CameraPreviewContainerProps>(
  ({ isRecording, cameraType, onCameraReady, onError, children }, ref) => {
    const [isCameraReady, setIsCameraReady] = useState(false)
    const [cameraPermission, setCameraPermission] = useState<string>('undetermined')
    const cameraRef = useRef<any>(null)
    const webStreamRef = useRef<MediaStream | null>(null)
    // Move the hook to component level
    const [permission, requestPermission] = useCameraPermissions()

    // Request camera permission on mount
    useEffect(() => {
      const requestCameraPermission = async () => {
        try {
          if (!permission?.granted) {
            const permissionResult = await requestPermission()
            setCameraPermission(permissionResult.granted ? 'granted' : 'denied')
            if (permissionResult.granted) {
              setIsCameraReady(true)
              onCameraReady?.()
            } else {
              onError?.('Camera permission denied')
            }
          } else {
            setCameraPermission('granted')
            // For native, set camera ready immediately when permission is granted
            if (Platform.OS !== 'web') {
              setIsCameraReady(true)
              onCameraReady?.()
            }
          }
        } catch (error) {
          console.error('Permission request error:', error)
          onError?.('Failed to request camera permission')
        }
      }

      if (permission !== null) {
        requestCameraPermission()
      }
    }, [permission, requestPermission])

    useImperativeHandle(ref, () => ({
      async startRecording() {
        if (Platform.OS === 'web') {
        } else {
          if (cameraRef.current && isCameraReady) {
            await cameraRef.current.recordAsync()
          }
        }
      },
      async stopRecording() {
        if (Platform.OS === 'web') {
          return null
        }
        if (cameraRef.current) {
          const video = await cameraRef.current.stopRecording()
          return video?.uri || null
        }
        return null
      },
      async takePicture() {
        if (Platform.OS === 'web') {
          // Web picture implementation
          if (webStreamRef.current) {
            const video = document.createElement('video')
            video.srcObject = webStreamRef.current
            await new Promise((resolve) => {
              video.onloadedmetadata = () => resolve(void 0)
            })

            const canvas = document.createElement('canvas')
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            const ctx = canvas.getContext('2d')
            ctx?.drawImage(video, 0, 0)

            return canvas.toDataURL('image/jpeg', 0.8)
          }
          return null
        }
        if (cameraRef.current && isCameraReady) {
          const photo = await cameraRef.current.takePictureAsync()
          return photo?.uri || null
        }
        return null
      },
      switchCamera() {},
    }))

    // Initialize web camera when needed
    useEffect(() => {
      if (Platform.OS === 'web' && cameraPermission === 'granted') {
        initializeWebCamera()
      }
      return () => {
        cleanup()
      }
    }, [cameraType, cameraPermission])

    const initializeWebCamera = async () => {
      try {
        const constraints = {
          video: {
            facingMode: cameraType === 'front' ? 'user' : 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: true,
        }

        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        webStreamRef.current = stream
        setIsCameraReady(true)
        onCameraReady?.()
      } catch (error) {
        console.error('Web camera error:', error)
        setCameraPermission('denied')
        onError?.('Failed to access camera. Please check permissions.')
      }
    }

    const cleanup = () => {
      if (Platform.OS === 'web' && webStreamRef.current) {
        webStreamRef.current.getTracks().forEach((track) => track.stop())
        webStreamRef.current = null
      }
    }

    const handleCameraReady = () => {
      setIsCameraReady(true)
      onCameraReady?.()
    }

    // Render permission denied state
    if (cameraPermission === 'denied') {
      return (
        <YStack
          flex={1}
          backgroundColor="$color2"
          alignItems="center"
          justifyContent="center"
          padding="$4"
        >
          <Text
            fontSize="$5"
            color="$color11"
            textAlign="center"
            marginBottom="$4"
          >
            Camera Permission Required
          </Text>
          <Text
            fontSize="$3"
            color="$color10"
            textAlign="center"
          >
            Please enable camera access in settings to record videos
          </Text>
        </YStack>
      )
    }

    // Render loading state
    if (!isCameraReady) {
      return (
        <YStack
          flex={1}
          backgroundColor="$color2"
          alignItems="center"
          justifyContent="center"
          padding="$4"
        >
          <Text
            fontSize="$4"
            color="$color11"
            textAlign="center"
          >
            Initializing camera...
          </Text>
        </YStack>
      )
    }

    // Platform-specific camera rendering
    if (Platform.OS === 'web') {
      return (
        <WebCameraView
          stream={webStreamRef.current}
          isRecording={isRecording}
        >
          {children}
        </WebCameraView>
      )
    }

    return (
      <NativeCameraView
        ref={cameraRef}
        cameraType={cameraType}
        isRecording={isRecording}
        onCameraReady={handleCameraReady}
      >
        {children}
      </NativeCameraView>
    )
  }
)

// Web Camera Implementation
interface WebCameraViewProps {
  stream: MediaStream | null
  isRecording: boolean
  children?: React.ReactNode
}

function WebCameraView({ stream, isRecording, children }: WebCameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  return (
    <YStack
      flex={1}
      position="relative"
      backgroundColor="$color1"
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          borderRadius: 0,
        }}
      />

      {/* Recording indicator for web */}
      {isRecording && (
        <YStack
          position="absolute"
          top="$3"
          right="$3"
          backgroundColor="$red9"
          paddingHorizontal="$3"
          paddingVertical="$2"
          borderRadius="$4"
        >
          <Text
            fontSize="$2"
            color="white"
            fontWeight="600"
          >
            REC
          </Text>
        </YStack>
      )}

      {children}
    </YStack>
  )
}

// Native Camera Implementation
interface NativeCameraViewProps {
  cameraType: 'front' | 'back'
  isRecording: boolean
  onCameraReady: () => void
  children?: React.ReactNode
}

const NativeCameraView = forwardRef<any, NativeCameraViewProps>(
  ({ cameraType, isRecording, onCameraReady, children }, ref) => {
    // No need for permission check here, it's handled in the parent component
    return (
      <YStack
        flex={1}
        position="relative"
      >
        <CameraView
          ref={ref}
          style={{ flex: 1 }}
          facing={cameraType === 'front' ? 'front' : 'back'}
          onCameraReady={onCameraReady}
        />

        {/* Content overlay with absolute positioning */}
        <YStack
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          pointerEvents="box-none"
        >
          {/* Recording indicator for native */}
          {isRecording && (
            <YStack
              position="absolute"
              top="$3"
              right="$3"
              backgroundColor="$red9"
              paddingHorizontal="$3"
              paddingVertical="$2"
              borderRadius="$4"
            >
              <Text
                fontSize="$2"
                color="white"
                fontWeight="600"
              >
                REC
              </Text>
            </YStack>
          )}

          <YStack // This is the YStack containing the children (your controls)
            position="absolute"
            bottom={40} // Adjusted to move controls a bit lower
            left={0}
            right={0}
            alignItems="center"
            pointerEvents="box-none" // Allows interaction with elements inside
          >
            {children}
          </YStack>
        </YStack>
      </YStack>
    )
  }
)
