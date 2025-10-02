import { startUploadAndAnalysis } from '@my/app/services/videoUploadAndAnalysis'
import { log } from '@my/logging'
import { Asset } from 'expo-asset'
import { router } from 'expo-router'
import { useCallback, useRef, useState } from 'react'
import Video from 'react-native-video'
import { Button, ScrollView, Text, YStack } from 'tamagui'

type PipelineStatus =
  | 'idle'
  | 'loading-asset'
  | 'probing-duration'
  | 'uploading'
  | 'processing'
  | 'completed'
  | 'failed'

// Minimal duration probe component using react-native-video
function DurationProbe({ uri, onReady }: { uri: string; onReady: (seconds: number) => void }) {
  if (!uri) return null

  return (
    <Video
      source={{ uri }}
      onLoad={(m) => {
        const raw = typeof m.duration === 'number' ? m.duration : 0
        const clamped = Math.max(1, Math.min(60, raw))
        onReady(clamped)
      }}
      onError={() => {
        onReady(30) // Fallback to safe default
      }}
      style={{ width: 1, height: 1, opacity: 0 }}
    />
  )
}

export default function PipelineTestScreen() {
  const [status, setStatus] = useState<PipelineStatus>('idle')
  const [details, setDetails] = useState<string>('')
  const [recordingId, setRecordingId] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [probeUri, setProbeUri] = useState<string | null>(null)
  const probeResolveRef = useRef<((seconds: number) => void) | null>(null)

  const handleRunPipeline = useCallback(async () => {
    try {
      setStatus('loading-asset')
      setDetails('Loading mini_speech.mp4 asset...')
      setErrorMessage('')

      // Load the mini speech video asset (same as compress-test)
      const asset = Asset.fromModule(require('./mini_speech.mp4'))
      await asset.downloadAsync()

      const fileUri = asset.localUri || asset.uri
      if (!fileUri) {
        throw new Error('Failed to load asset')
      }

      log.info('pipeline-test:start', {
        fileUri,
        source: 'mini_speech.mp4',
      })

      // Probe for real duration before uploading
      setStatus('probing-duration')
      setDetails('Probing video duration...')
      // Set resolver BEFORE rendering probe to avoid race where onLoad fires too early
      const realDuration = await new Promise<number>((resolve) => {
        let settled = false
        probeResolveRef.current = (seconds: number) => {
          if (settled) return
          settled = true
          probeResolveRef.current = null
          resolve(seconds)
        }
        // Fallback timeout (5s)
        setTimeout(() => {
          if (settled) return
          settled = true
          probeResolveRef.current = null
          resolve(30)
        }, 5000)
        // Now render the probe
        setProbeUri(fileUri)
      })

      // Clear probe after getting duration
      setProbeUri(null)

      setStatus('uploading')
      setDetails(`Starting upload for ${fileUri} (duration: ${realDuration.toFixed(1)}s)...`)

      // Navigate immediately to analysis screen so user sees processing state right away
      //router.push(`/video-analysis?videoUri=${encodeURIComponent(fileUri)}&initialStatus=processing`)

      // Start the upload and analysis pipeline in background
      await startUploadAndAnalysis({
        sourceUri: fileUri,
        // DB expects integer seconds; keep decimals only for logs
        durationSeconds: realDuration,
        onProgress: (progress) => {
          setDetails(`Upload progress: ${Math.round(progress * 100)}%`)
          log.info('pipeline-test:progress', { progress })
        },
        onError: (error) => {
          setStatus('failed')
          setErrorMessage(error.message)
          setDetails(`Upload failed: ${error.message}`)
          log.error('pipeline-test:error', { error })
        },
        onUploadInitialized: ({ recordingId: newRecordingId }) => {
          setRecordingId(newRecordingId)
          setStatus('processing')
          setDetails(`Upload initialized, recordingId: ${newRecordingId}. Starting analysis...`)
          log.info('pipeline-test:upload-initialized', { recordingId: newRecordingId })
        },
        onRecordingIdAvailable: (newRecordingId: number) => {
          setRecordingId(newRecordingId)
          log.info('pipeline-test:recording-id-available', { recordingId: newRecordingId })
          // Update route with the recordingId once available
          router.replace(
            `/video-analysis?videoRecordingId=${newRecordingId}&videoUri=${encodeURIComponent(fileUri)}`
          )
        },
      })

      setStatus('completed')
      setDetails('Pipeline completed successfully!')
      log.info('pipeline-test:completed')
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      setStatus('failed')
      setErrorMessage(errorMsg)
      setDetails(`Pipeline failed: ${errorMsg}`)
      log.error('pipeline-test:error', { error })
    }
  }, [])

  const handleReset = useCallback(() => {
    setStatus('idle')
    setDetails('')
    setRecordingId(null)
    setErrorMessage('')
  }, [])

  return (
    <>
      {probeUri && (
        <DurationProbe
          uri={probeUri}
          onReady={(seconds) => {
            log.info('pipeline-test:duration-probed', { seconds, uri: probeUri })
            if (probeResolveRef.current) {
              const resolve = probeResolveRef.current
              probeResolveRef.current = null
              resolve(seconds)
            }
          }}
        />
      )}
      <ScrollView
        flex={1}
        backgroundColor="$background"
      >
        <YStack
          padding="$4"
          gap="$3"
          testID="pipeline-test-screen"
        >
          <Text
            fontSize="$6"
            fontWeight="bold"
            testID="pipeline-test-title"
          >
            Pipeline Test
          </Text>

          <YStack gap="$2">
            <Text
              testID="pipeline-status"
              fontWeight="600"
            >
              Status: {status}
            </Text>

            {recordingId && <Text testID="pipeline-recording-id">Recording ID: {recordingId}</Text>}

            {errorMessage && (
              <Text
                testID="pipeline-error"
                color="$red10"
                fontWeight="600"
              >
                Error: {errorMessage}
              </Text>
            )}
          </YStack>

          <Button
            onPress={handleRunPipeline}
            testID="pipeline-run"
            disabled={
              status === 'loading-asset' ||
              status === 'probing-duration' ||
              status === 'uploading' ||
              status === 'processing'
            }
          >
            {status === 'loading-asset' ||
            status === 'probing-duration' ||
            status === 'uploading' ||
            status === 'processing'
              ? 'Running...'
              : 'Run Pipeline Test'}
          </Button>

          <Button
            onPress={handleReset}
            testID="pipeline-reset"
            variant="outlined"
            disabled={status === 'idle'}
          >
            Reset
          </Button>

          <YStack gap="$2">
            <Text fontWeight="600">Details:</Text>
            <ScrollView
              height={300}
              borderWidth={1}
              borderColor="$borderColor"
              borderRadius="$2"
              padding="$2"
            >
              <Text
                testID="pipeline-details"
                fontFamily="$mono"
                fontSize="$3"
              >
                {details}
              </Text>
            </ScrollView>
          </YStack>
        </YStack>
      </ScrollView>
    </>
  )
}
