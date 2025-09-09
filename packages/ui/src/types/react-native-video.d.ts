/**
 * Type declarations for react-native-video
 * This module is installed in the Expo app and resolved through workspace dependency resolution
 */
declare module 'react-native-video' {
  import { Component } from 'react'
  import { ViewStyle } from 'react-native'

  export interface VideoProperties {
    source: { uri: string } | number
    style?: ViewStyle
    paused?: boolean
    muted?: boolean
    volume?: number
    rate?: number
    seek?: number
    currentTime?: number
    fullscreen?: boolean
    controls?: boolean
    resizeMode?: 'contain' | 'cover' | 'stretch' | 'center'
    repeat?: boolean
    playInBackground?: boolean
    playWhenInactive?: boolean
    ignoreSilentSwitch?: 'ignore' | 'obey'
    mixWithOthers?: 'mix' | 'duck' | 'duckOthers'
    onLoad?: (data: any) => void
    onProgress?: (data: any) => void
    onBuffer?: (data: any) => void
    onError?: (error: any) => void
    onEnd?: () => void
    testID?: string
    accessibilityLabel?: string
    accessibilityRole?: string
  }

  export default class Video extends Component<VideoProperties> {}
}
