# Camera Recording System - Design Layout Diagram

```mermaid
graph TB
    %% Main Screen Wrapper
    CRSW[CameraRecordingScreenWrapper]
    
    %% Platform-specific Screen Implementations
    CRSE[CameraRecordingScreen.expo.tsx]
    CRSV[CameraRecordingScreen.vision.tsx]
    CRS[CameraRecordingScreen.tsx]
    
    %% Main Container
    CC[CameraContainer]
    
    %% Header Section
    CH[CameraHeader]
    RT[RecordingTimer]
    
    %% Camera Preview System
    CP[CameraPreview]
    CPN[CameraPreview.native.tsx]
    CPNE[CameraPreview.native.expo.tsx]
    CPNV[CameraPreview.native.vision.tsx]
    CPW[CameraPreview.tsx - Web]
    
    %% Camera Preview Areas
    CPA[CameraPreviewArea]
    CCO[CameraControlsOverlay]
    
    %% Pose Detection System
    PO[PoseOverlay]
    PON[PoseOverlay.native.tsx]
    POW[PoseOverlay.web.tsx]
    PDT[PoseDetectionToggle]
    PDTC[PoseDetectionToggleCompact]
    
    %% Control Systems
    IC[IdleControls]
    RC[RecordingControls]
    RB[RecordButton]
    CB[ControlButton]
    ZC[ZoomControls]
    
    %% Navigation & Dialogs
    BN[BottomNavigation]
    ND[NavigationDialog]
    CD[ConfirmationDialog]
    SS[SideSheet]
    
    %% File Handling
    VFP[VideoFilePicker]
    VFPN[VideoFilePicker.native.tsx]
    VFPW[VideoFilePicker.tsx - Web]
    
    %% Post-Recording
    VP[VideoPlayer]
    
    %% Component Hierarchy
    CRSW --> CRSE
    CRSW --> CRSV
    CRSW --> CRS
    
    CRSE --> CC
    CRSV --> CC
    CRS --> CC
    
    CC --> CH
    CC --> CPA
    CC --> BN
    
    CH --> RT
    
    CPA --> CP
    CPA --> CCO
    CPA --> PO
    
    CP --> CPN
    CPN --> CPNE
    CPN --> CPNV
    CP --> CPW
    
    PO --> PON
    PO --> POW
    
    CCO --> IC
    CCO --> RC
    CCO --> PDT
    
    IC --> RB
    IC --> CB
    IC --> VFP
    
    RC --> ZC
    RC --> CB
    
    VFP --> VFPN
    VFP --> VFPW
    
    %% State Management & Interactions
    IC -.->|"onStartRecording"| RC
    RC -.->|"onStop"| VP
    BN -.->|"tab change"| ND
    CH -.->|"menu press"| SS
    
    %% Platform Detection
    CPN -.->|"Feature Flag"| CPNE
    CPN -.->|"Feature Flag"| CPNV
    
    %% Dark Mode Styling
    classDef screen fill:#1a237e,stroke:#3f51b5,stroke-width:2px,color:#ffffff
    classDef container fill:#4a148c,stroke:#7b1fa2,stroke-width:2px,color:#ffffff
    classDef camera fill:#1b5e20,stroke:#388e3c,stroke-width:2px,color:#ffffff
    classDef controls fill:#e65100,stroke:#ff9800,stroke-width:2px,color:#ffffff
    classDef navigation fill:#880e4f,stroke:#c2185b,stroke-width:2px,color:#ffffff
    classDef platform fill:#33691e,stroke:#689f38,stroke-width:2px,color:#ffffff
    
    class CRSW,CRSE,CRSV,CRS screen
    class CC,CPA,CCO container
    class CP,CPN,CPNE,CPNV,CPW,PO,PON,POW camera
    class IC,RC,RB,CB,ZC,PDT,PDTC controls
    class BN,ND,CD,SS navigation
    class VFP,VFPN,VFPW,VP platform
```

## Component Architecture Overview

### 1. Screen Layer
- **CameraRecordingScreenWrapper**: Main entry point with platform detection
- **Platform-specific implementations**: Expo, VisionCamera, and base implementations

### 2. Container Layer
- **CameraContainer**: Main layout container with safe area handling
- **CameraPreviewArea**: Camera preview container
- **CameraControlsOverlay**: Overlay for camera controls

### 3. Camera System
- **CameraPreview**: Cross-platform camera component
- **Platform implementations**: Native (Expo/VisionCamera) and Web
- **PoseOverlay**: AI pose detection visualization

### 4. Control Systems
- **IdleControls**: Pre-recording controls (record, upload, camera swap)
- **RecordingControls**: During-recording controls (pause, stop, zoom)
- **PoseDetectionToggle**: AI feature toggle

### 5. Navigation & Dialogs
- **BottomNavigation**: Tab navigation (Coach/Record/Insights)
- **NavigationDialog**: Confirmation dialogs
- **SideSheet**: History and settings drawer

### 6. File Handling
- **VideoFilePicker**: Cross-platform file selection
- **Platform implementations**: Native (ActionSheet) and Web (File API)

### 7. Post-Recording
- **VideoPlayer**: Video playback and processing UI

## Key Design Patterns

1. **Platform Abstraction**: Components automatically delegate to platform-specific implementations
2. **Feature Flags**: VisionCamera vs Expo Camera selection via feature flags
3. **State Management**: Recording states flow through the component hierarchy
4. **Responsive Design**: Mobile-first with 44px touch targets
5. **Accessibility**: Comprehensive ARIA labels and screen reader support
