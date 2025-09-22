#!/usr/bin/env node

/**
 * Test for all PCM conversion functions: WAV, Low-Quality WAV, and MP3
 */

import { readdirSync, statSync, writeFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = join(__filename, '..')

// Mock PCM data for testing (16-bit, 24kHz, mono)
const sampleRate = 24000
const duration = 1 // 1 second
const numSamples = sampleRate * duration
const pcmData = new Uint8Array(numSamples * 2) // 16-bit = 2 bytes per sample

// Fill with a simple sine wave
for (let i = 0; i < numSamples; i++) {
  const sample = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 32767 // 440Hz sine wave
  pcmData[i * 2] = sample & 0xFF
  pcmData[i * 2 + 1] = (sample >> 8) & 0xFF
}

console.log(`Testing PCM conversions with ${pcmData.length} bytes of PCM data`)

// High-quality WAV conversion (24kHz, 16-bit)
function convertPCMToWAV(pcmData) {
  const timestamp = Date.now()
  const pcmFileName = `pcm_input_${timestamp}.pcm`
  const wavFileName = `wav_output_${timestamp}.wav`

  console.log('🎵 Starting high-quality PCM to WAV conversion', {
    pcmDataLength: pcmData.length,
    timestamp
  })

  // Save input PCM data to test assets
  try {
    const pcmPath = join(__dirname, 'test-assets', 'audio', pcmFileName)
    writeFileSync(pcmPath, pcmData)
    console.log('💾 Saved PCM input data', {
      fileName: pcmFileName,
      bytes: pcmData.length
    })
  } catch (error) {
    console.warn('Failed to save PCM input', { error: error.message })
  }

  const sampleRate = 24000
  const numChannels = 1
  const bitsPerSample = 16
  const byteRate = sampleRate * numChannels * bitsPerSample / 8
  const blockAlign = numChannels * bitsPerSample / 8

  // WAV header (44 bytes)
  const header = new ArrayBuffer(44)
  const view = new DataView(header)

  view.setUint32(0, 0x52494646, false) // "RIFF"
  view.setUint32(4, 36 + pcmData.length, true) // File size - 8
  view.setUint32(8, 0x57415645, false) // "WAVE"
  view.setUint32(12, 0x666d7420, false) // "fmt "
  view.setUint32(16, 16, true) // Format chunk size
  view.setUint16(20, 1, true) // PCM format
  view.setUint16(22, numChannels, true) // Number of channels
  view.setUint32(24, sampleRate, true) // Sample rate
  view.setUint32(28, byteRate, true) // Byte rate
  view.setUint16(32, blockAlign, true) // Block align
  view.setUint16(34, bitsPerSample, true) // Bits per sample
  view.setUint32(36, 0x64617461, false) // "data"
  view.setUint32(40, pcmData.length, true) // Data size

  // Combine header and PCM data
  const wavData = new Uint8Array(header.byteLength + pcmData.length)
  wavData.set(new Uint8Array(header), 0)
  wavData.set(pcmData, header.byteLength)

  // Save output WAV data
  try {
    const wavPath = join(__dirname, 'test-assets', 'audio', wavFileName)
    writeFileSync(wavPath, wavData)
    console.log('💾 Saved high-quality WAV output', {
      fileName: wavFileName,
      bytes: wavData.length
    })
  } catch (error) {
    console.warn('Failed to save WAV output', { error: error.message })
  }

  console.log('✅ High-quality conversion completed', {
    inputBytes: pcmData.length,
    outputBytes: wavData.length
  })

  return wavData
}

// Low-quality WAV conversion (16kHz, 8-bit)
function convertPCMToWAVLowQuality(pcmData) {
  const timestamp = Date.now()
  const pcmFileName = `pcm_input_lq_${timestamp}.pcm`
  const wavFileName = `wav_output_lq_${timestamp}.wav`

  console.log('🎵 Starting low-quality PCM to WAV conversion', {
    pcmDataLength: pcmData.length,
    timestamp
  })

  // Save input PCM data
  try {
    const pcmPath = join(__dirname, 'test-assets', 'audio', pcmFileName)
    writeFileSync(pcmPath, pcmData)
    console.log('💾 Saved PCM input data (low quality)', {
      fileName: pcmFileName,
      bytes: pcmData.length
    })
  } catch (error) {
    console.warn('Failed to save PCM input', { error: error.message })
  }

  // Downsample from 24kHz to 16kHz and reduce bit depth to 8-bit
  const originalSampleRate = 24000
  const targetSampleRate = 16000
  const bitsPerSample = 8
  const numChannels = 1

  const downsampleRatio = originalSampleRate / targetSampleRate
  const downsampledLength = Math.floor(pcmData.length / downsampleRatio / 2) * 2
  const downsampledData = new Uint8Array(downsampledLength)

  for (let i = 0; i < downsampledLength / 2; i++) {
    const sourceIndex = Math.floor(i * downsampleRatio) * 2
    if (sourceIndex + 1 < pcmData.length) {
      const sample16 = (pcmData[sourceIndex + 1] << 8) | pcmData[sourceIndex]
      const sample8 = (sample16 >> 8) & 0xFF
      downsampledData[i] = sample8
    }
  }

  const byteRate = targetSampleRate * numChannels * bitsPerSample / 8
  const blockAlign = numChannels * bitsPerSample / 8

  // WAV header (44 bytes)
  const header = new ArrayBuffer(44)
  const view = new DataView(header)

  view.setUint32(0, 0x52494646, false) // "RIFF"
  view.setUint32(4, 36 + downsampledData.length, true) // File size - 8
  view.setUint32(8, 0x57415645, false) // "WAVE"
  view.setUint32(12, 0x666d7420, false) // "fmt "
  view.setUint32(16, 16, true) // Format chunk size
  view.setUint16(20, 1, true) // PCM format
  view.setUint16(22, numChannels, true) // Number of channels
  view.setUint32(24, targetSampleRate, true) // Sample rate
  view.setUint32(28, byteRate, true) // Byte rate
  view.setUint16(32, blockAlign, true) // Block align
  view.setUint16(34, bitsPerSample, true) // Bits per sample
  view.setUint32(36, 0x64617461, false) // "data"
  view.setUint32(40, downsampledData.length, true) // Data size

  // Combine header and downsampled data
  const wavData = new Uint8Array(header.byteLength + downsampledData.length)
  wavData.set(new Uint8Array(header), 0)
  wavData.set(downsampledData, header.byteLength)

  // Save output WAV data
  try {
    const wavPath = join(__dirname, 'test-assets', 'audio', wavFileName)
    writeFileSync(wavPath, wavData)
    console.log('💾 Saved low-quality WAV output', {
      fileName: wavFileName,
      bytes: wavData.length
    })
  } catch (error) {
    console.warn('Failed to save WAV output', { error: error.message })
  }

  console.log('✅ Low-quality conversion completed', {
    inputBytes: pcmData.length,
    outputBytes: wavData.length,
    compressionRatio: (pcmData.length / wavData.length).toFixed(2)
  })

  return wavData
}

// MP3 placeholder conversion
function convertPCMToMP3(pcmData) {
  const timestamp = Date.now()
  const pcmFileName = `pcm_input_mp3_${timestamp}.pcm`

  console.log('🎵 Starting PCM to MP3 conversion (placeholder)', {
    pcmDataLength: pcmData.length,
    timestamp
  })

  // Save input PCM data
  try {
    const pcmPath = join(__dirname, 'test-assets', 'audio', pcmFileName)
    writeFileSync(pcmPath, pcmData)
    console.log('💾 Saved PCM input data (MP3)', {
      fileName: pcmFileName,
      bytes: pcmData.length
    })
  } catch (error) {
    console.warn('Failed to save PCM input', { error: error.message })
  }

  console.log('⚠️  FFmpeg WASM conversion not yet implemented - returning placeholder')

  // Placeholder MP3 data (not a real MP3 file)
  const mp3Data = new Uint8Array(pcmData.length + 10)
  mp3Data[0] = 0xFF
  mp3Data[1] = 0xFB
  mp3Data.set(pcmData, 10)

  console.log('✅ MP3 placeholder conversion completed', {
    inputBytes: pcmData.length,
    outputBytes: mp3Data.length
  })

  return mp3Data
}

async function runTests() {
  try {
    console.log('\n🚀 Testing High-Quality WAV Conversion (24kHz, 16-bit)')
    const result1 = convertPCMToWAV(pcmData)
    console.log(`✅ High-quality result: ${result1.length} bytes\n`)

    console.log('🚀 Testing Low-Quality WAV Conversion (16kHz, 8-bit)')
    const result2 = convertPCMToWAVLowQuality(pcmData)
    console.log(`✅ Low-quality result: ${result2.length} bytes`)
    console.log(`📊 Compression ratio: ${(pcmData.length / result2.length).toFixed(2)}x smaller\n`)

    console.log('🚀 Testing MP3 Conversion (Placeholder)')
    const result3 = convertPCMToMP3(pcmData)
    console.log(`✅ MP3 placeholder result: ${result3.length} bytes\n`)

    // Show file summary
    const testAssetsDir = join(__dirname, 'test-assets', 'audio')
    const files = readdirSync(testAssetsDir)

    console.log('📁 Generated test files:')
    files
      .filter(file => file.includes('1758569452888')) // Filter to our test files
      .forEach(file => {
        const filePath = join(testAssetsDir, file)
        const stats = statSync(filePath)
        const type = file.includes('pcm_input') ? 'PCM Input' :
                    file.includes('wav_output') ? 'WAV High-Quality' :
                    file.includes('wav_output_lq') ? 'WAV Low-Quality' :
                    file.includes('pcm_input_mp3') ? 'PCM for MP3' : 'Unknown'
        console.log(`  📄 ${file} (${stats.size} bytes) - ${type}`)
      })

    console.log('\n🎉 All conversion tests completed!')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

runTests()
