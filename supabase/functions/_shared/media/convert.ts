/**
 * Audio Format Conversion Utilities
 * Provides PCM to WAV/MP3 conversion functions with different quality/size tradeoffs
 */

// Import Deno environment access
declare const Deno: {
  env: {
    get(key: string): string | undefined
  }
  writeFileSync(path: string | URL, data: Uint8Array): void
}

/**
 * Convert PCM data to WAV format (low quality - reduced overhead)
 * Reduces sample rate to 16kHz and bit depth to 8-bit for smaller files
 * Compression ratio: ~1.5x smaller than high-quality WAV
 */
export function convertPCMToWAVLowQuality(pcmData: Uint8Array): Uint8Array {
  // Downsample from 24kHz to 16kHz and reduce bit depth to 8-bit
  const originalSampleRate = 24000
  const targetSampleRate = 16000
  const bitsPerSample = 8
  const numChannels = 1 // Mono

  // Simple downsampling (every 1.5th sample ≈ 24kHz to 16kHz)
  const downsampleRatio = originalSampleRate / targetSampleRate
  const downsampledLength = Math.floor(pcmData.length / downsampleRatio / 2) * 2 // Keep even for 16-bit pairs
  const downsampledData = new Uint8Array(downsampledLength)

  for (let i = 0; i < downsampledLength / 2; i++) {
    const sourceIndex = Math.floor(i * downsampleRatio) * 2
    if (sourceIndex + 1 < pcmData.length) {
      // Convert 16-bit to 8-bit by taking MSB
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

  // RIFF header
  view.setUint32(0, 0x52494646, false) // "RIFF"
  view.setUint32(4, 36 + downsampledData.length, true) // File size - 8
  view.setUint32(8, 0x57415645, false) // "WAVE"

  // Format chunk
  view.setUint32(12, 0x666d7420, false) // "fmt "
  view.setUint32(16, 16, true) // Format chunk size
  view.setUint16(20, 1, true) // PCM format
  view.setUint16(22, numChannels, true) // Number of channels
  view.setUint32(24, targetSampleRate, true) // Sample rate
  view.setUint32(28, byteRate, true) // Byte rate
  view.setUint16(32, blockAlign, true) // Block align
  view.setUint16(34, bitsPerSample, true) // Bits per sample

  // Data chunk
  view.setUint32(36, 0x64617461, false) // "data"
  view.setUint32(40, downsampledData.length, true) // Data size

  // Combine header and downsampled data
  const wavData = new Uint8Array(header.byteLength + downsampledData.length)
  wavData.set(new Uint8Array(header), 0)
  wavData.set(downsampledData, header.byteLength)

  return wavData
}

/**
 * Convert PCM data to MP3 format using FFmpeg WASM (experimental)
 * Note: FFmpeg WASM in Deno Edge Functions requires additional setup
 * This is a placeholder implementation
 */
export function convertPCMToMP3(pcmData: Uint8Array): Uint8Array {
  // TODO: Implement FFmpeg WASM conversion
  // This would require:
  // 1. Adding @ffmpeg/ffmpeg to dependencies
  // 2. Loading FFmpeg WASM in Edge Function
  // 3. Converting PCM to MP3 format
  // 4. Returning MP3 data

  // For now, return the original PCM data with MP3 header (placeholder)
  // This is not a real MP3 file, just for testing the pipeline
  const mp3Data = new Uint8Array(pcmData.length + 10)
  // Simple MP3 header placeholder
  mp3Data[0] = 0xFF
  mp3Data[1] = 0xFB
  mp3Data.set(pcmData, 10)

  return mp3Data
}

/**
 * Convert PCM data to WAV format (high quality)
 * Gemini TTS returns 16-bit PCM at 24kHz sample rate
 */
export function convertPCMToWAV(pcmData: Uint8Array): Uint8Array {
  const sampleRate = 24000 // Gemini TTS default sample rate
  const numChannels = 1 // Mono
  const bitsPerSample = 16
  const byteRate = sampleRate * numChannels * bitsPerSample / 8
  const blockAlign = numChannels * bitsPerSample / 8

  // WAV header (44 bytes)
  const header = new ArrayBuffer(44)
  const view = new DataView(header)

  // RIFF header
  view.setUint32(0, 0x52494646, false) // "RIFF"
  view.setUint32(4, 36 + pcmData.length, true) // File size - 8
  view.setUint32(8, 0x57415645, false) // "WAVE"

  // Format chunk
  view.setUint32(12, 0x666d7420, false) // "fmt "
  view.setUint32(16, 16, true) // Format chunk size
  view.setUint16(20, 1, true) // PCM format
  view.setUint16(22, numChannels, true) // Number of channels
  view.setUint32(24, sampleRate, true) // Sample rate
  view.setUint32(28, byteRate, true) // Byte rate
  view.setUint16(32, blockAlign, true) // Block align
  view.setUint16(34, bitsPerSample, true) // Bits per sample

  // Data chunk
  view.setUint32(36, 0x64617461, false) // "data"
  view.setUint32(40, pcmData.length, true) // Data size

  // Combine header and PCM data
  const wavData = new Uint8Array(header.byteLength + pcmData.length)
  wavData.set(new Uint8Array(header), 0)
  wavData.set(pcmData, header.byteLength)

  return wavData
}
