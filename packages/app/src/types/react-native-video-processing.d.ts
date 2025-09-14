declare module 'react-native-video-processing' {
  export interface VideoFrameOptions {
    source: string
    startTime: number
    endTime: number
    step: number
    format: 'base64' | 'jpeg' | 'png'
    quality: number
  }

  export interface ProcessingManager {
    getVideoFrames(options: VideoFrameOptions): Promise<string[]>
  }

  export const ProcessingManager: ProcessingManager
}
