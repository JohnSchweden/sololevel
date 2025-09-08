# Solo:Level User Flow Diagram

This document contains the comprehensive user flow diagram for the Solo:Level AI Feedback Coach app, based on the wireframe analysis and PRD requirements.

## User Flow Overview

The app follows a mobile-first design with three main user journeys:
1. **Presentation Playback & Recording** - Core video interaction flow
2. **AI Coach Interaction** - Chat-based feedback system  
3. **Insights & Analytics** - Performance analysis and progress tracking
4. **Home & Settings** - Navigation and app management

## Mermaid Diagram

```mermaid
flowchart TD
    %% Entry Points
    Start([User Opens App]) --> Home[Home Screen<br/>List of Presentations]
    
    %% Home Screen Actions
    Home --> |Tap Presentation| PresentationDetail[Presentation Detail<br/>Coach/Insights Tabs]
    Home --> |Tap Filter| SearchFilter[Search/Filter Options]
    Home --> |Tap Settings| Settings[Settings Menu]
    
    %% Search/Filter Flow
    SearchFilter --> |Apply Filters| Home
    SearchFilter --> |Back| Home
    
    %% Settings Flow
    Settings --> |Tap Menu Item| SettingsSub[Settings Sub-screens<br/>Account, Notifications, etc.]
    SettingsSub --> |Back| Settings
    Settings --> |Back| Home
    Settings --> |Log Out| Logout[Log Out]
    
    %% Presentation Detail - Coach Tab Flow
    PresentationDetail --> |Coach Tab| CoachView[Coach View<br/>Record/Review Options]
    
    %% Recording Flow
    CoachView --> |Tap Record| RecordingActive[Recording Active<br/>Stop/Pause Controls]
    RecordingActive --> |Tap Pause| RecordingPaused[Recording Paused<br/>Resume/Stop Options]
    RecordingPaused --> |Tap Resume| RecordingActive
    RecordingPaused --> |Tap Stop| RecordingStopped[Recording Stopped<br/>Review/Save/Discard]
    RecordingActive --> |Tap Stop| RecordingStopped
    
    %% Post-Recording Actions
    RecordingStopped --> |Tap Save| CoachView
    RecordingStopped --> |Tap Discard| CoachView
    RecordingStopped --> |Tap Review| VideoPlayback[Video Playback<br/>Play/Pause/Controls]
    
    %% Video Playback Flow
    VideoPlayback --> |Tap Play| VideoPlaying[Video Playing<br/>Pause/Rewind/Forward]
    VideoPlaying --> |Tap Pause| VideoPlayback
    VideoPlayback --> |Back| CoachView
    VideoPlaying --> |Back| CoachView
    
    %% Coach Chat Flow
    CoachView --> |Tap Chat| CoachChat[Coach Chat<br/>AI Feedback Interface]
    CoachChat --> |Send Message| CoachResponse[Coach Response<br/>AI Feedback]
    CoachResponse --> |Continue Chat| CoachChat
    CoachChat --> |Back| CoachView
    
    %% Presentation Detail - Insights Tab Flow
    PresentationDetail --> |Insights Tab| InsightsOverview[Insights Overview<br/>Score & Radar Chart]
    
    %% Insights Flow
    InsightsOverview --> |Scroll Down| InsightsDetailed[Detailed Feedback<br/>Text Recommendations]
    InsightsDetailed --> |Scroll Down| ActionPlan[Action Plan<br/>Personalized Steps]
    ActionPlan --> |Scroll Up| InsightsDetailed
    InsightsDetailed --> |Scroll Up| InsightsOverview
    InsightsOverview --> |Back| Home
    InsightsDetailed --> |Back| Home
    ActionPlan --> |Back| Home
    
    %% Navigation Between Tabs
    CoachView --> |Switch to Insights| InsightsOverview
    InsightsOverview --> |Switch to Coach| CoachView
    
    %% AI Processing (Background)
    RecordingStopped -.-> |AI Analysis| AIProcessing[AI Processing<br/>Voice, Movement, Content]
    AIProcessing -.-> |Generate Feedback| CoachResponse
    AIProcessing -.-> |Generate Metrics| InsightsOverview
    
    %% Styling
    classDef entryPoint fill:#e1f5fe
    classDef mainFlow fill:#f3e5f5
    classDef recordingFlow fill:#ffebee
    classDef insightsFlow fill:#e8f5e8
    classDef settingsFlow fill:#fff3e0
    classDef aiProcess fill:#f1f8e9,stroke-dasharray: 5 5
    
    class Start entryPoint
    class Home,PresentationDetail mainFlow
    class CoachView,RecordingActive,RecordingPaused,RecordingStopped,VideoPlayback,VideoPlaying,CoachChat,CoachResponse recordingFlow
    class InsightsOverview,InsightsDetailed,ActionPlan insightsFlow
    class Settings,SettingsSub,SearchFilter settingsFlow
    class AIProcessing aiProcess
```

## Key User Journeys

### 1. Presentation Recording & Review
- **Entry**: Home → Select Presentation → Coach Tab
- **Flow**: Record → Pause/Resume → Stop → Review/Save/Discard
- **AI Integration**: Automatic analysis after recording stops

### 2. AI Coach Interaction  
- **Entry**: Coach Tab → Chat Interface
- **Flow**: Send Message → Receive AI Feedback → Continue Conversation
- **Features**: Real-time chat with AI coach for personalized guidance

### 3. Performance Insights
- **Entry**: Insights Tab → Overview → Detailed → Action Plan
- **Flow**: Score Review → Detailed Feedback → Personalized Recommendations
- **Visualization**: Radar charts, bar graphs, progress metrics

### 4. App Management
- **Entry**: Home → Settings → Sub-menus
- **Flow**: Account, Notifications, Privacy, Help, About
- **Features**: User preferences, data management, support

## Technical Integration Points

### AI Processing Pipeline
1. **Video Analysis**: Voice, movement, content analysis
2. **Feedback Generation**: Text, audio, metrics
3. **Response Time**: < 10 seconds (per PRD requirements)

### Cross-Platform Considerations
- **Mobile-First**: Touch interactions, gesture navigation
- **Responsive**: Adapts to different screen sizes
- **Offline**: Basic features available without connection

## Success Metrics Alignment

This user flow supports the PRD success metrics:
- **User Engagement**: Multiple interaction points per session
- **Retention**: Progress tracking and history features
- **Viral Potential**: Share results and challenge friends (P1 features)
- **Performance**: < 10 second AI processing time

## Future Enhancements (P1/P2)

The diagram structure supports future additions:
- **Social Features**: Share results, community feedback
- **Advanced Analytics**: Trend analysis, comparative metrics  
- **Premium Features**: Custom AI models, expert integration
