# Performance Architecture Diagrams

## Data Flow: Complete System

```mermaid
graph TB
    subgraph "User Interaction"
        U[User Action]
    end
    
    subgraph "VideoAnalysisScreen"
        VS[VideoAnalysisScreen Component]
        VO[useVideoAnalysisOrchestrator]
    end
    
    subgraph "Orchestrator Layer"
        H1[useHistoricalAnalysis]
        H2[useAnalysisState]
        H3[useVideoPlayback]
        H4[useVideoControls]
        H5[useFeedbackCoordinator]
        H6[useAudioController]
        H7[useGestureController]
        H8[useAnimationController]
    end
    
    subgraph "Memoization Layer"
        M1[stableAudioOverlay]
        M2[stableBubbleState]
        M3[stableHandlers]
        M4[stableControls]
    end
    
    subgraph "Integration Layer"
        I1[feedback composition]
        I2[handlers composition]
        I3[error composition]
        I4[persistentProgressBarProps]
    end
    
    subgraph "Render Layer"
        VL[VideoAnalysisLayout]
        VPS[VideoPlayerSection]
        VC[VideoControls]
        FS[FeedbackSection]
    end
    
    U --> VS
    VS --> VO
    VO --> H1
    VO --> H2
    VO --> H3
    VO --> H4
    VO --> H5
    VO --> H6
    VO --> H7
    VO --> H8
    
    H5 --> M1
    H5 --> M2
    H4 --> M3
    H4 --> M4
    
    M1 --> VS
    M2 --> VS
    M3 --> VS
    M4 --> VS
    
    VS --> I1
    VS --> I2
    VS --> I3
    
    VC --> I4
    I4 --> VS
    
    VS --> VL
    VL --> VPS
    VL --> VC
    VL --> FS
    
    style VO fill:#e1f5ff
    style M1 fill:#fff4e1
    style M2 fill:#fff4e1
    style M3 fill:#fff4e1
    style M4 fill:#fff4e1
    style VL fill:#e8f5e9
```

## Memoization Flow: Three-Layer Strategy

```mermaid
graph LR
    subgraph "Layer 1: Source (Orchestrator)"
        O1[Hook Returns]
        O2[Primitive Values]
        O3[useMemo with Primitives]
        O4[Stable Object Created]
        
        O1 --> O2
        O2 --> O3
        O3 --> O4
    end
    
    subgraph "Layer 2: Integration (Screen)"
        I1[Receives Stable Objects]
        I2[Minimal Composition]
        I3[useMemo with Primitives]
        I4[Composed Props]
        
        I1 --> I2
        I2 --> I3
        I3 --> I4
    end
    
    subgraph "Layer 3: Render (Layout)"
        R1[Receives Props]
        R2[arePropsEqual Check]
        R3{Reference Equal?}
        R4[Skip Render]
        R5[Render Component]
        
        R1 --> R2
        R2 --> R3
        R3 -->|Yes| R4
        R3 -->|No| R5
    end
    
    O4 --> I1
    I4 --> R1
    
    style O3 fill:#e1f5ff
    style I3 fill:#fff4e1
    style R2 fill:#e8f5e9
```

## Reference Stability Flow: Persistent Progress Bar

```mermaid
sequenceDiagram
    participant VC as VideoControls
    participant Ref as stablePropsObjectRef
    participant SC as VideoAnalysisScreen
    participant VL as VideoAnalysisLayout
    
    Note over VC,VL: Initial Render
    VC->>Ref: Create props object
    Ref->>SC: onPersistentProgressBarPropsChange(newObject)
    SC->>VL: Pass as prop
    
    Note over VC,VL: Subsequent Render (Values Unchanged)
    VC->>VC: Compare primitives
    VC->>VC: Values unchanged
    VC->>VC: Skip callback (don't call)
    Note over SC,VL: Parent keeps existing reference
    SC->>VL: Pass same prop reference
    VL->>VL: arePropsEqual returns true
    VL->>VL: Skip render ✅
    
    Note over VC,VL: Values Changed
    VC->>VC: Compare primitives
    VC->>VC: Values changed
    VC->>Ref: Create new props object
    Ref->>SC: onPersistentProgressBarPropsChange(newObject)
    SC->>VL: Pass new prop reference
    VL->>VL: arePropsEqual returns false
    VL->>VL: Render component ✅
```

## Race Condition: Before vs After Fix

### Before Fix (Race Condition)

```mermaid
sequenceDiagram
    participant React as React Reconciliation
    participant arePropsEqual as arePropsEqual
    participant setState as setState
    participant useMemo as useMemo
    participant Render as Component Render
    
    Note over React,Render: Race Condition Timeline
    
    React->>arePropsEqual: Compare props (old props)
    arePropsEqual->>React: Returns true (props equal)
    
    React->>setState: Update state (new object)
    setState->>useMemo: Creates new object
    
    React->>Render: Render with new object
    Note over Render: ❌ MEMO BYPASSED - renders even though arePropsEqual returned true
```

### After Fix (No Race Condition)

```mermaid
sequenceDiagram
    participant React as React Reconciliation
    participant arePropsEqual as arePropsEqual
    participant Callback as handleChange
    participant Ref as stableRef
    participant setState as setState
    participant Render as Component Render
    
    Note over React,Render: Fixed Timeline
    
    React->>arePropsEqual: Compare props (same reference)
    arePropsEqual->>React: Returns true (props equal)
    
    Note over Callback: Values unchanged
    Callback->>Callback: Compare primitives
    Callback->>Callback: Content unchanged
    Callback->>Callback: Return early (don't setState)
    
    React->>Render: Skip render (props reference unchanged)
    Note over Render: ✅ No render - memo working correctly
```

## Dependency Chain Visualization

```mermaid
graph TD
    subgraph "Orchestrator Dependencies"
        O1[coordinatorOverlayVisible: boolean]
        O2[coordinatorActiveAudioId: string]
        O3[coordinatorActiveAudioUrl: string]
        O4[stableAudioController.duration: number]
    end
    
    subgraph "Memoization"
        M[stableAudioOverlay useMemo]
    end
    
    subgraph "Integration"
        I1[orchestrated.audioOverlay]
        I2[Direct prop pass]
    end
    
    subgraph "Render"
        R1[VideoAnalysisLayout]
        R2[arePropsEqual]
        R3{Reference Equal?}
    end
    
    O1 --> M
    O2 --> M
    O3 --> M
    O4 --> M
    
    M --> I1
    I1 --> I2
    I2 --> R1
    R1 --> R2
    R2 --> R3
    
    style M fill:#fff4e1
    style R2 fill:#e8f5e9
```

## Issue Detection Flow

```mermaid
graph TD
    Start[Performance Issue Detected]
    
    Start --> Check{Check Logs}
    
    Check -->|MEMO BYPASSED| MemoIssue[arePropsEqual returned true but rendered]
    Check -->|Excessive Renders| RenderIssue[Component renders too frequently]
    Check -->|Frame Drops| FrameIssue[Animation stutters]
    
    MemoIssue --> FindProp[Find which prop changed]
    RenderIssue --> CheckMemo{React.memo applied?}
    FrameIssue --> Profile[Use React Profiler]
    
    FindProp --> TraceSource[Trace to source component]
    TraceSource --> CheckRef{Reference stability?}
    
    CheckRef -->|No| AddStability[Add stableRef pattern]
    CheckRef -->|Yes| CheckRace{Race condition?}
    
    CheckRace -->|Yes| FixCallback[Fix callback to not create objects]
    CheckRace -->|No| CheckDeps{Check dependencies}
    
    CheckDeps -->|Objects in deps| UsePrimitives[Use primitives only]
    CheckDeps -->|OK| OtherIssue[Check other causes]
    
    CheckMemo -->|No| ApplyMemo[Apply React.memo]
    CheckMemo -->|Yes| CheckPropsEqual{arePropsEqual?}
    
    CheckPropsEqual -->|No| AddPropsEqual[Add arePropsEqual]
    CheckPropsEqual -->|Yes| CheckPropsStability[Check props stability]
    
    CheckPropsStability -->|Unstable| FixSource[Fix at source]
    CheckPropsStability -->|Stable| CheckParent[Check parent re-renders]
    
    AddStability --> Verify[Verify fix in logs]
    FixCallback --> Verify
    UsePrimitives --> Verify
    ApplyMemo --> Verify
    AddPropsEqual --> Verify
    FixSource --> Verify
    
    Verify --> Done[✅ Issue Resolved]
    
    style MemoIssue fill:#ffebee
    style AddStability fill:#e8f5e9
    style FixCallback fill:#e8f5e9
    style Verify fill:#e8f5e9
```

## Component Interaction Map

```mermaid
graph TB
    subgraph "External"
        User[User Interactions]
        API[API Calls]
        Store[Zustand Store]
    end
    
    subgraph "Orchestrator Hooks"
        H1[useHistoricalAnalysis]
        H2[useAnalysisState]
        H3[useVideoPlayback]
        H4[useVideoControls]
        H5[useFeedbackCoordinator]
    end
    
    subgraph "Memoization"
        M1[stableAudioOverlay]
        M2[stableBubbleState]
        M3[stableHandlers]
    end
    
    subgraph "Components"
        VS[VideoAnalysisScreen]
        VL[VideoAnalysisLayout]
        VC[VideoControls]
        VPS[VideoPlayerSection]
        FS[FeedbackSection]
    end
    
    User --> VC
    User --> VPS
    User --> FS
    
    API --> H1
    Store --> H2
    
    H1 --> M1
    H2 --> M2
    H3 --> M3
    H4 --> M3
    H5 --> M1
    
    M1 --> VS
    M2 --> VS
    M3 --> VS
    
    VS --> VL
    VL --> VC
    VL --> VPS
    VL --> FS
    
    VC -->|onPersistentProgressBarPropsChange| VS
    
    style M1 fill:#fff4e1
    style M2 fill:#fff4e1
    style M3 fill:#fff4e1
    style VS fill:#e1f5ff
    style VL fill:#e8f5e9
```

---

**Note**: These diagrams can be rendered in any Markdown viewer that supports Mermaid (GitHub, GitLab, VS Code with Mermaid extension, etc.)

**Related Documentation**:
- `docs/performance/react-memoization-architecture.md` - Full architecture documentation
- `docs/performance/debugging-quick-reference.md` - Quick debugging guide

