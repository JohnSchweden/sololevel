declare module 'react-native-compressor' {
  export interface VideoCompressOptions {
    compressionMethod?: 'auto' | 'manual'
    maxSize?: number
    quality?: 'low' | 'medium' | 'high'
    bitrate?: number
  }

  export interface Video {
    compress(fileUri: string, options?: VideoCompressOptions): Promise<string>
  }

  export const Video: Video
}
