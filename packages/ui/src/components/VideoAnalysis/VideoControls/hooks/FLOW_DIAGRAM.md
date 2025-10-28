# useControlsVisibility Hook - Flow Diagram & Architecture

> Visual documentation for the `useControlsVisibility` hook behavior, state transitions, and effect execution order.

---

## 1. State Machine Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CONTROLS VISIBILITY                             │
│                        State Machine Flow                               │
└─────────────────────────────────────────────────────────────────────────┘

                      ┌──────────────────────────┐
                      │    Component Mount       │
                      │  showControls prop       │
                      └───────────┬──────────────┘
                                  │
                      ┌───────────▼──────────┐
                      │ Initialize state:    │
                      │ controlsVisible =    │
                      │ showControls         │
                      └───────────┬──────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
   ┌─────────┐            ┌──────────────┐          ┌──────────┐
   │ VISIBLE │            │   HIDDEN     │          │  FORCED  │
   │ (true)  │            │   (false)    │          │  (true)  │
   │         │            │              │          │          │
   │ • Timer │            │ • No timer   │          │ • Show   │
   │   may   │            │ • Idle       │          │   always │
   │   start │            │              │          │ • Reset  │
   └────┬────┘            └──────┬───────┘          │   timer  │
        │                        │                  │   if     │
        │                        │                  │   play   │
        │                        │                  └────┬─────┘
        │                        │                       │
        │  User TAP             │ User TAP or          │ showControls
        │  (toggle)             │ showControls:true    │ changes
        │                       │ (prop update)        │
        │                       │                      │
        ├──────────┬────────────┴──────────┬───────────┤
        │          │                       │           │
        ▼          ▼                       ▼           ▼
    HIDDEN → VISIBLE → HIDDEN → FORCED → ...cycle continues
    
    Legend:
    ───► = Direct state transition
    ═══► = Conditional transition (depends on props/state)
```

---

## 2. Timer Lifecycle Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                      AUTO-HIDE TIMER LIFECYCLE                         │
└────────────────────────────────────────────────────────────────────────┘

                          Timer NOT Active
                                 │
                ┌────────────────▼───────────────┐
                │   Check All Conditions:        │
                │   • isPlaying = true? ✓        │
                │   • isScrubbing = false? ✓     │
                │   • showControls = false? ✓    │
                │   • controlsVisible = true? ✓  │
                └────────┬────────────┬──────────┘
                         │            │
                    YES  │            │ NO
                         ▼            ▼
                    ┌────────┐   ┌──────────┐
                    │ CREATE │   │ SKIP     │
                    │ TIMER  │   │ START    │
                    └────┬───┘   └──────────┘
                         │
                         ▼
                    ┌────────────────────────┐
                    │ setTimeout(            │
                    │   hideControls,        │
                    │   autoHideDelayMs      │
                    │ )                      │
                    └────┬───────────────────┘
                         │
        ┌────────────────▼────────────────┐
        │  Timer Running: Waiting for     │
        │  {autoHideDelayMs}ms            │
        └────┬───────────────┬────────────┘
             │               │
        COMPLETED       CANCELLED
             │               │
             ▼               ▼
        ┌─────────┐    ┌─────────────┐
        │ HIDE    │    │ CLEAR       │
        │ CONTROLS│    │ & RESTART   │
        │ (if     │    │ (if deps    │
        │ ready)  │    │  change)    │
        └─────────┘    └─────────────┘

CANCELLATION TRIGGERS:
• isPlaying becomes false (paused)
• isScrubbing becomes true (user dragging)
• showControls becomes true (forced visible)
• controlsVisible becomes false (manual hide)
• showControlsAndResetTimer() called
```

---

## 3. Conditional Timer Start Logic

```
┌────────────────────────────────────────────────────────────────────────┐
│         TIMER START - ALL CONDITIONS MUST BE TRUE                      │
│              (AND logic - all conditions required)                     │
└────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────┐
    │ isPlaying       │
    │ (Video active)  │
    └────┬────────────┘
         │ true
         ▼
    ┌─────────────────┐
    │ !isScrubbing    │
    │ (Not dragging)  │
    └────┬────────────┘
         │ true
         ▼
    ┌─────────────────┐
    │ !showControls   │
    │ (Not forced)    │
    └────┬────────────┘
         │ true
         ▼
    ┌─────────────────┐
    │ controlsVisible │
    │ (Currently on)  │
    └────┬────────────┘
         │ true
         ▼
    ┌─────────────────────────┐
    │  START TIMER            │
    │  setTimeout(             │
    │    hideControls,         │
    │    autoHideDelayMs       │
    │  )                       │
    └─────────────────────────┘

    If ANY condition is false:
    • Clear any existing timer
    • Don't start a new timer
```

---

## Complete Sequence: Play → Pause → Play

```
TIME    ACTION                  CONDITION CHECK         RESULT
────────────────────────────────────────────────────────────────────
t=0     Mount component         showControls: true      controlsVisible: true
        with showControls=true  isPlaying: false        No timer (not playing)

t=100ms User taps play button   isPlaying: true         controlsVisible: true
                               Timer check: all ✓      Timer starts (2000ms)

t=1500ms Video playing          Timer: 1500ms elapsed   controlsVisible: true
         User scrubs bar        isScrubbing: true       Timer cleared
                               (Timer cancels)         (Scrubbing active)

t=2000ms User releases          isScrubbing: false      controlsVisible: true
         scrubber               Timer check: all ✓      New timer starts

t=3800ms Timer fires            autoHideDelayMs        controlsVisible: false
                               (2000ms elapsed)        Controls hidden

t=4000ms User taps video        controlsVisible: false  controlsVisible: true
         (tap-to-toggle)        User interaction       Timer starts

t=4100ms User clicks pause      isPlaying: false        controlsVisible: true
                               Timer check: fail       Timer cleared
                               (not playing)
```

