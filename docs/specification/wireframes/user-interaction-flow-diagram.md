# User Interaction Flow Diagram

## Overview
This document outlines the complete user interaction flow for the SoloLevel mobile application based on the actual wireframe screens. The flow covers camera recording, AI analysis, feedback review, video history management, and AI coaching features.

## Flow Diagram

```mermaid
graph TD
    %% Entry Points
    A[App Launch] --> B[Home Screen - Presentation List]
    
    %% Home Screen Actions
    B --> C[Search/Filter Presentations]
    B --> D[Settings Menu]
    B --> E[Select Presentation]
    
    %% Search/Filter Flow
    C --> C1[Apply Filters]
    C1 --> B
    
    %% Settings Flow
    D --> D1[My Schedule]
    D --> D2[Account]
    D --> D3[Notifications]
    D --> D4[Privacy Policy]
    D --> D5[Terms of Service]
    D --> D6[Help & Support]
    D --> D7[About]
    D --> D8[Log Out]
    D1 --> D
    D2 --> D
    D3 --> D
    D4 --> D
    D5 --> D
    D6 --> D
    D7 --> D
    
    %% Presentation Detail Flow
    E --> F[Presentation Detail View]
    F --> G[Coach Tab]
    F --> H[Insights Tab]
    F --> I[Video Playback]
    
    %% Video Playback Flow
    I --> I1[Play Video]
    I1 --> I2[Pause Video]
    I2 --> I1
    I1 --> I3[Rewind/Forward]
    I3 --> I1
    I --> F
    
    %% Coach Tab Flow
    G --> G1[Chat with Coach]
    G --> G2[Record Presentation]
    
    %% Coach Chat Flow
    G1 --> G1A[Type Message]
    G1A --> G1B[Send Message]
    G1B --> G1C[Receive Coach Response]
    G1C --> G1A
    G1 --> G
    
    %% Recording Flow
    G2 --> G2A[Start Recording]
    G2A --> G2B[Recording Active]
    G2B --> G2C[Pause Recording]
    G2B --> G2D[Stop Recording]
    G2C --> G2E[Resume Recording]
    G2C --> G2D
    G2E --> G2B
    G2D --> G2F[Review Recording]
    G2F --> G2G[Save Recording]
    G2F --> G2H[Discard Recording]
    G2G --> G
    G2H --> G
    
    %% Insights Tab Flow
    H --> H1[View Performance Score]
    H --> H2[View Radar Chart]
    H --> H3[View Category Breakdown]
    H --> H4[View Detailed Feedback]
    H --> H5[View Action Plan]
    H1 --> H
    H2 --> H
    H3 --> H
    H4 --> H
    H5 --> H
    
    %% Navigation Back
    F --> B
    G --> F
    H --> F
    I --> F
    
    %% Styling
    classDef entryPoint fill:#e1f5fe
    classDef mainScreen fill:#f3e5f5
    classDef action fill:#e8f5e8
    classDef decision fill:#fff3e0
    classDef endState fill:#ffebee
    
    class A entryPoint
    class B,F mainScreen
    class G,H,I action
    class G2F decision
    class G2G,G2H,D8 endState
```

## Detailed User Flows

### 1. Main Screen - Camera View Flow
```
App Launch → Main Screen (Camera View)
├── Side Sheet Menu
│   ├── Videos List Screen
│   ├── Coaching Sessions List
│   └── Settings Screen
├── Start Recording
├── Upload Video
├── Coach Tab
└── Insights Tab
```

### 2. Recording Flow
```
Main Screen → Start Recording
├── Recording Active State
│   ├── Pause Recording
│   └── Stop Recording
├── Paused State
│   ├── Resume Recording
│   └── Stop Recording
└── Analysis Processing
    └── AI Processing with Spinner
        └── Feedback Review Screen
```

### 3. Side Sheet Menu Flow
```
Side Sheet Menu → Navigation Options
├── Videos List Screen
│   ├── Filter Screen
│   ├── Select Video from List
│   ├── Video Detail View
│   ├── Playback with Feedback
│   └── View AI Insights
├── Coaching Sessions List
└── Settings Screen
    ├── Account Settings
    ├── Personalisation
    ├── Give Feedback
    ├── Data Controls
    ├── Security
    ├── About
    └── Log Out
```

### 4. Feedback Review Flow
```
Analysis Complete → Feedback Review Screen
├── Video Playback with Overlay
├── View AI Feedback Timeline
├── View Performance Insights
├── Play/Pause Controls
└── Seek Timeline
```

### 5. Coach Interaction Flow
```
Coach Tab → Chat Interface
├── Chat Mode
│   ├── Type Message
│   ├── Send Message
│   └── Receive Avatar Response
└── Mirror Mode (Future)
```

### 6. Insights Tab Flow
```
Insights Tab → Performance Analysis
├── View Performance Score
├── View Radar Chart
├── View Category Breakdown
├── View Detailed Feedback
└── View Action Plan
```

### 7. Settings Management Flow
```
Side Sheet Menu → Settings Screen
├── Account Settings
├── Personalisation
├── Give Feedback
├── Data Controls
├── Security
├── About
└── Log Out
```

## Key Interaction Patterns

### Navigation Patterns
- **Side Sheet Navigation**: Single slide-out menu with Videos, Coaching Sessions, and Settings
- **Tab Navigation**: Coach tab with Chat/Mirror mode toggle and Insights tab
- **Back Navigation**: Consistent back arrow for hierarchical navigation
- **Modal Navigation**: Settings sub-screens and Filter overlay

### State Management
- **Recording States**: Idle → Active → Paused → Stopped → Analysis → Feedback
- **Playback States**: Stopped → Playing → Paused (with overlay controls)
- **Chat States**: Empty → Message Sent → Avatar Response
- **Analysis States**: Processing → Complete → Feedback Available

### User Actions
- **Primary Actions**: Record, Upload, Play, Send Message
- **Secondary Actions**: Pause, Stop, Seek, Filter
- **Navigation Actions**: Back, Side Sheet, Tab Switch

## Screen Transitions

### Immediate Transitions
- Start/Stop recording
- Play/Pause video controls
- Chat message sending

### Side Sheet Transitions
- Single side sheet menu slide-out
- Videos List Screen navigation
- Coaching Sessions List navigation
- Settings Screen navigation
- Filter overlay from Videos List

### Analysis Flow Transitions
- Recording → Analysis Processing → Feedback Review
- Upload → Analysis Processing → Feedback Review

## Error Handling Points
- Recording permission denied
- Video upload failures
- AI analysis processing errors
- Network connectivity issues
- Coach response failures

## Accessibility Considerations
- Voice-over support for all interactive elements
- High contrast mode compatibility
- Large touch targets for recording controls
- Screen reader friendly feedback messages
- Motion capture visualization accessibility
