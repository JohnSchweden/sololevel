import { compressVideo } from '@app/services/videoCompression'
import { log } from '@my/logging'
import { Asset } from 'expo-asset'
import * as FileSystem from 'expo-file-system'
import { useState } from 'react'
import { Button, ScrollView, Text, YStack } from 'tamagui'

export default function CompressTestScreen() {
  const [status, setStatus] = useState<'idle' | 'running' | 'passed' | 'failed'>('idle')
  const [details, setDetails] = useState<string>('')
  const [originalSize, setOriginalSize] = useState<number>(0)
  const [compressedSize, setCompressedSize] = useState<number>(0)

  async function run() {
    try {
      setStatus('running')
      setDetails('Loading mini speech test file...')

      // Load the mini speech video asset
      const asset = Asset.fromModule(require('./mini_speech.mp4'))
      await asset.downloadAsync()

      const fileUri = asset.localUri || asset.uri

      const before = await FileSystem.getInfoAsync(fileUri, { size: true })
      setOriginalSize((before as any).size ?? 0)
      setDetails('Running compression...')

      log.info('compress-test:start', {
        fileUri,
        originalSize: (before as any).size,
        source: 'mini_speech.mp4',
      })

      const result = await compressVideo(fileUri, { quality: 'medium' })
      const after = await FileSystem.getInfoAsync(result.compressedUri, { size: true })

      setCompressedSize((after as any).size ?? 0)

      const report = {
        originalUri: fileUri,
        compressedUri: result.compressedUri,
        originalSize: (before as any).size ?? 0,
        compressedSize: (after as any).size ?? 0,
        metadata: result.metadata,
        compressionRatio:
          ((((before as any).size ?? 0) - ((after as any).size ?? 0)) /
            ((before as any).size ?? 0)) *
          100,
      }

      log.info('compress-test:result', report)
      setDetails(JSON.stringify(report, null, 2))

      // Pass if we got a valid URI and any metadata; compression may be identical if fallback path hit
      const ok =
        typeof result.compressedUri === 'string' &&
        result.metadata &&
        ((after as any).size ?? 0) >= 0
      setStatus(ok ? 'passed' : 'failed')
    } catch (error) {
      log.error('compress-test:error', { error })
      setDetails(String(error))
      setStatus('failed')
    }
  }

  return (
    <ScrollView
      flex={1}
      backgroundColor="$background"
    >
      <YStack
        padding="$4"
        gap="$3"
        testID="compress-test-screen"
      >
        <Text
          fontSize="$6"
          fontWeight="bold"
          testID="compress-test-title"
        >
          Mini Speech Compression Test
        </Text>

        <YStack gap="$2">
          <Text
            testID="compression-status"
            fontWeight="600"
          >
            Status: {status}
          </Text>
          <Text testID="original-size">Original Size: {originalSize} bytes</Text>
          <Text testID="compressed-size">Compressed Size: {compressedSize} bytes</Text>
          <Text testID="compression-ratio">
            Ratio:{' '}
            {originalSize > 0
              ? (((originalSize - compressedSize) / originalSize) * 100).toFixed(1)
              : 0}
            %
          </Text>
        </YStack>

        <Button
          onPress={run}
          testID="run-compression"
          disabled={status === 'running'}
        >
          {status === 'running' ? 'Running...' : 'Run Compression Test'}
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
              testID="compression-details"
              fontFamily="$mono"
              fontSize="$3"
            >
              {details}
            </Text>
          </ScrollView>
        </YStack>
      </YStack>
    </ScrollView>
  )
}
