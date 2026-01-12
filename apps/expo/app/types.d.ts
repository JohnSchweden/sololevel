import type { config } from '@my/config'

export type Conf = typeof config

declare module '@my/ui' {
  interface TamaguiCustomConfig extends Conf {}
}

// Expo Router route type declarations
declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes:
        | '/'
        | '/onboarding/voice-selection'
        | '/(tabs)'
        | '/(tabs)/record'
        | '/(tabs)/coach'
        | '/(tabs)/insights'
        | '/auth/sign-in'
        | '/settings'
        | '/settings/account'
        | '/settings/personalisation'
        | '/settings/security'
        | '/settings/about'
        | '/settings/give-feedback'
        | '/settings/data-controls'
        | '/history-progress'
        | '/video-analysis'
        | '/coaching-session'
      DynamicRoutes: never
      DynamicRouteTemplate: never
    }
  }
}

export default {}
