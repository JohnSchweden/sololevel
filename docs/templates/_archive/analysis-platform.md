# [FeatureName] Cross-Platform Analysis Template

> **Instructions**: Copy this template to `docs/features/[feature-name]/analysis-platform.md` and complete all sections systematically before implementation. This template focuses on platform-specific implementations, native vs web differences, and deployment considerations. Cross-reference with other analysis templates for complete feature coverage.

## Test-Driven Platform Analysis Phase
- [ ] **Platform Parity Tests**: Ensure identical behavior across platforms
  - [ ] Write feature parity tests (native vs web functionality)
  - [ ] Define platform-specific behavior tests where differences are expected
  - [ ] Test cross-platform data synchronization and state consistency
  - [ ] Document performance parity requirements and benchmarks
- [ ] **Platform-Specific API Tests**: Validate native platform integrations
  - [ ] Test native camera and media APIs (iOS/Android)
  - [ ] Validate web browser APIs and permissions
  - [ ] Test file system access and storage patterns
  - [ ] Document platform capability differences and fallbacks
- [ ] **Deployment and Distribution Tests**: Validate release processes
  - [ ] Test app store submission requirements (iOS App Store, Google Play)
  - [ ] Validate web deployment and SEO requirements
  - [ ] Test update mechanisms and version compatibility
  - [ ] Document platform-specific configuration and build processes

## Platform Architecture Analysis Phase
- [ ] **Shared Code Strategy**: Maximize code reuse across platforms
```typescript
// Example Platform Abstraction Structure
packages/
├── @my/ui/              // Shared Tamagui components
│   ├── components/      // Cross-platform UI components
│   ├── tokens/          // Design system tokens
│   └── themes/          // Platform-adaptive themes
├── @my/app/             // Shared business logic
│   ├── features/        // Feature implementations
│   ├── stores/          // Zustand state management
│   ├── hooks/           // Shared React hooks
│   └── utils/           // Platform-agnostic utilities
├── @my/api/             // Backend integration
│   ├── clients/         // Supabase client configuration
│   ├── types/           // API type definitions
│   └── queries/         // TanStack Query definitions
└── @my/config/          // Configuration and constants
    ├── env/             // Environment configuration
    ├── constants/       // App constants
    └── types/           // Shared type definitions
```

- [ ] **Platform-Specific Implementations**: When to diverge from shared code
  - [ ] **Native-Only Features**: Camera, push notifications, biometrics
  - [ ] **Web-Only Features**: SEO meta tags, browser APIs, URL routing
  - [ ] **Platform Optimizations**: Performance-specific implementations
  - [ ] **UI Adaptations**: Platform-specific design patterns

## Native Platform Implementation Phase (iOS/Android)
- [ ] **Expo Configuration**: Native app setup and configuration
```json
// Example app.json configuration
{
  "expo": {
    "name": "Solo:Level",
    "slug": "sololevel",
    "platforms": ["ios", "android"],
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.sololevel.app",
      "infoPlist": {
        "NSCameraUsageDescription": "This app needs camera access to record videos for analysis",
        "NSMicrophoneUsageDescription": "This app needs microphone access to record audio for analysis"
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FFFFFF"
      },
      "package": "com.sololevel.app",
      "permissions": [
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
        "android.permission.WRITE_EXTERNAL_STORAGE"
      ]
    }
  }
}
```

- [ ] **Native API Integration**: Platform-specific functionality
  - [ ] **Camera Integration**: expo-camera configuration and usage
  - [ ] **File System**: expo-file-system for local storage
  - [ ] **Media Library**: expo-media-library for gallery access
  - [ ] **Permissions**: expo-permissions for runtime permission handling

- [ ] **Navigation Configuration**: Expo Router setup for native
  - [ ] **Stack Navigation**: Screen hierarchy and transitions
  - [ ] **Tab Navigation**: Bottom tab configuration and icons
  - [ ] **Modal Navigation**: Sheet presentations and overlays
  - [ ] **Deep Linking**: Universal links and URL scheme handling

- [ ] **Performance Optimization**: Native-specific optimizations
  - [ ] **Bundle Splitting**: Code splitting for faster startup
  - [ ] **Image Optimization**: Native image caching and compression
  - [ ] **Memory Management**: Efficient resource cleanup
  - [ ] **Battery Optimization**: Background processing limits

## Web Platform Implementation Phase (Expo Router)
- [ ] **Expo Router Configuration**: Web app setup and optimization
```typescript
// Example metro.config.js
/** @type {import('next').NextConfig} */
const metroConfig = {
  transpilePackages: [
    '@my/ui',
    '@my/app',
    '@my/api',
    '@my/config',
    '@tamagui/core',
    '@tamagui/animations-react-native'
  ],
  experimental: {
    optimizePackageImports: ['@tamagui/core'],
    scrollRestoration: true
  },
  images: {
    domains: ['your-supabase-project.supabase.co'],
    formats: ['image/webp', 'image/avif']
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'X-Frame-Options',
          value: 'DENY'
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff'
        }
      ]
    }
  ]
};
```

- [ ] **Web API Integration**: Browser-specific functionality
  - [ ] **MediaDevices API**: Camera and microphone access
  - [ ] **File API**: File upload and processing
  - [ ] **Web Storage**: localStorage and sessionStorage usage
  - [ ] **Service Workers**: Offline support and caching

- [ ] **SEO and Meta Tags**: Search engine optimization
  - [ ] **Dynamic Meta Tags**: Page-specific SEO optimization
  - [ ] **Open Graph**: Social media sharing optimization
  - [ ] **Structured Data**: Schema.org markup for rich snippets
  - [ ] **Sitemap Generation**: Automated sitemap creation

- [ ] **Web Performance Optimization**: Browser-specific optimizations
  - [ ] **Code Splitting**: Route-based and component-based splitting
  - [ ] **Image Optimization**: Expo Image component usage
  - [ ] **Caching Strategy**: Static generation and ISR configuration
  - [ ] **Bundle Analysis**: Webpack bundle optimization

## Cross-Platform Component Strategy Phase
- [ ] **Component Abstraction**: Shared component interfaces
```typescript
// Example Platform-Adaptive Component
interface CameraComponentProps {
  onRecordingStart: () => void;
  onRecordingStop: (videoUri: string) => void;
  onError: (error: Error) => void;
}

// Native Implementation (CameraComponent.native.tsx)
export const CameraComponent: React.FC<CameraComponentProps> = ({
  onRecordingStart,
  onRecordingStop,
  onError
}) => {
  // expo-camera implementation
};

// Web Implementation (CameraComponent.web.tsx)
export const CameraComponent: React.FC<CameraComponentProps> = ({
  onRecordingStart,
  onRecordingStop,
  onError
}) => {
  // MediaDevices API implementation
};
```

- [ ] **Platform Detection**: Runtime platform adaptation
  - [ ] **Platform-Specific Imports**: Conditional module loading
  - [ ] **Feature Detection**: Capability-based feature enabling
  - [ ] **Graceful Degradation**: Fallback implementations
  - [ ] **Progressive Enhancement**: Enhanced features for capable platforms

- [ ] **Styling Consistency**: Cross-platform design system
  - [ ] **Tamagui Configuration**: Platform-adaptive styling
  - [ ] **Theme Tokens**: Consistent design tokens across platforms
  - [ ] **Responsive Design**: Adaptive layouts for different screen sizes
  - [ ] **Platform-Specific Adjustments**: Native feel on each platform

## Build and Deployment Strategy Phase
- [ ] **Native Build Configuration**: EAS Build setup
```json
// Example eas.json
{
  "cli": {
    "version": ">= 3.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "resourceClass": "m1-medium"
      }
    },
    "production": {
      "ios": {
        "resourceClass": "m1-medium"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

- [ ] **Web Deployment Configuration**: Vercel deployment
  - [ ] **Environment Variables**: Secure configuration management
  - [ ] **Build Optimization**: Production build configuration
  - [ ] **CDN Configuration**: Static asset optimization
  - [ ] **Analytics Integration**: Performance and usage monitoring

- [ ] **CI/CD Pipeline**: Automated build and deployment
  - [ ] **GitHub Actions**: Automated testing and building
  - [ ] **Quality Gates**: Automated testing and linting
  - [ ] **Deployment Automation**: Automated releases to app stores and web
  - [ ] **Rollback Strategy**: Quick rollback procedures for issues

## TDD Platform Implementation Roadmap

### Phase 1: TDD Platform Foundation [Native/Web]
- [ ] **Platform Detection Tests**: Runtime platform identification
- [ ] **Configuration Tests**: Platform-specific setup validation
- [ ] **Build Process Tests**: Compilation and bundling validation
- [ ] **Environment Tests**: Configuration and secrets management

### Phase 2: TDD Platform-Specific Features [Native/Web]
- [ ] **Native API Tests**: Camera, file system, permissions
- [ ] **Web API Tests**: Browser APIs and feature detection
- [ ] **Platform Parity Tests**: Consistent behavior validation
- [ ] **Fallback Tests**: Graceful degradation scenarios

### Phase 3: TDD Navigation and Routing [Native/Web]
- [ ] **Navigation Tests**: Screen transitions and routing
- [ ] **Deep Linking Tests**: URL handling and parameter parsing
- [ ] **State Persistence Tests**: Navigation state management
- [ ] **Performance Tests**: Navigation timing and memory usage

### Phase 4: TDD Performance Optimization [Native/Web]
- [ ] **Bundle Size Tests**: Code splitting effectiveness
- [ ] **Load Time Tests**: App startup and screen rendering
- [ ] **Memory Usage Tests**: Resource cleanup and optimization
- [ ] **Battery Usage Tests**: Background processing efficiency

### Phase 5: TDD Deployment and Distribution [Native/Web]
- [ ] **Build Tests**: Successful compilation for all platforms
- [ ] **Distribution Tests**: App store and web deployment
- [ ] **Update Tests**: Version compatibility and migration
- [ ] **Rollback Tests**: Quick recovery from deployment issues

## Quality Gates
- [ ] **Feature Parity**: Identical functionality across platforms
- [ ] **Performance Parity**: Consistent performance characteristics
- [ ] **UI Consistency**: Identical visual appearance and behavior
- [ ] **Deployment Success**: Successful distribution to all platforms

## Documentation Requirements
- [ ] **Platform Setup**: Development environment configuration
- [ ] **Build Documentation**: Compilation and deployment processes
- [ ] **Platform Differences**: Documented behavioral differences
- [ ] **Troubleshooting**: Common platform-specific issues and solutions

## Cross-References
- **UI Components**: See `analysis-ui.md` for component implementation details
- **Feature Logic**: See `analysis-feature.md` for shared business logic
- **Backend Integration**: See `analysis-backend.md` for API integration patterns
