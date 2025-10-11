# User Stories — History & Progress Tracking (P0)

References: `../PRD.md`, `../TRD.md`, `../wireflow.png`

## US-HI-00: History & Progress Tracking Screen
Status: Not Implemented
Priority: High
Dependencies: None

### User Story
As a user, I want a dedicated History & Progress Tracking screen so I can navigate away from the camera recording to view and manage my past analyses.

### Requirements
- Full-screen navigation destination
- Accessible from camera recording screen via icon/button
- Persistent route in app navigation
- Back navigation returns to camera recording
- Clean layout with AppHeader and scrollable content area

### Acceptance Criteria
- Given I am on the camera recording screen
- When I tap the history/menu icon
- Then I navigate to a new full screen (History & Progress Tracking)
- And I see my analysis history in a clean layout
- And tapping back returns me to camera recording
- And the screen follows standard app navigation patterns

### Technical Notes
- **Screen Location**: `packages/app/features/HistoryProgress/HistoryProgressScreen.tsx` (❌ to create)
- **Route**: 
  - Expo: `apps/expo/app/history-progress.tsx` (❌ to create)
  - Next: `apps/next/app/history-progress.tsx` (❌ to create)
- **Navigation**: Expo Router with `router.push('/history-progress')`
- **Layout**: Standard screen with AppHeader + ScrollView/FlatList

### Current Implementation Status
- ❌ No dedicated history screen exists
- ❌ No route files for `/history-progress`
- ❌ No navigation trigger from camera recording

---

## US-HI-01a: Videos Section - Horizontal Thumbnail Gallery
Status: Not Implemented
Priority: High
Dependencies: US-HI-00 (History Screen), US-HI-03 (Cache analysis data)
Backend Support: ✅ `getUserAnalysisJobs()` API ready

### User Story
As a user, when I navigate to the History & Progress Tracking screen, I want to see a horizontal scrollable gallery of my recent video thumbnails so I can quickly access my latest analyses.

### Requirements
- Horizontal scrollable thumbnail gallery (top 3 recent videos)
- Video thumbnail preview with play icon overlay
- "See all" link button above thumbnails
- Navigation to individual video analysis on tap
- Navigation to full videos list on "See all" tap
- Authentication-based data filtering
- Loading, empty, and error states

### Acceptance Criteria
- Given I am authenticated and on the History screen (US-HI-00)
- When the screen loads
- Then I see a "Videos" section header with "See all" link
- And I see up to 3 video thumbnails in a horizontal scroll
- And each thumbnail displays a play icon overlay
- And the thumbnails show my most recent analyses (ordered by date)
- And only my analyses are visible (filtered by user_id)
- And if no analyses exist, the section shows empty state
- And tapping a thumbnail navigates to Video Analysis Screen (US-HI-02)
- And tapping "See all" navigates to the full Videos screen

### Technical Notes
- **Screen**: Rendered within History Screen (US-HI-00)
- **Components**: 
  - Section: `packages/ui/src/components/HistoryProgress/VideosSection/` (❌ to create)
  - Thumbnail: `packages/ui/src/components/HistoryProgress/VideoThumbnailCard/` (❌ to create)
- **Data Source**: `analysis_jobs` table (joined with `video_recordings`), LIMIT 3, filtered by user_id via RLS
- **API**: `getUserAnalysisJobs()` from `@my/api` (✅ exists)
- **State**: TanStack Query + Zustand cache (US-HI-03)
- **Hook**: `useHistoryQuery()` (❌ to create in `packages/app/features/HistoryProgress/hooks/`)
- **Layout**: Horizontal `ScrollView` (not virtualized, max 3 items)
- **Navigation**: 
  - Tap thumbnail → `router.push('/video-analysis/[analysisId]')`
  - "See all" button → `router.push('/videos')` (Videos screen, P1 feature)

### Current Implementation Status
- ❌ No VideosSection component
- ❌ No VideoThumbnailCard component
- ❌ No database integration
- ❌ No TanStack Query hook
- ❌ No "See all" button
- ❌ No Videos screen (navigation target to be defined in P1)
- ✅ Backend API ready to use

---

## US-HI-01b: Coaching Sessions Section - Vertical List
Status: Not Implemented (Mock Data Phase)
Priority: Medium
Dependencies: US-HI-00 (History Screen)
Backend Support: ❌ Mock data only (P0), real backend in P1

### User Story
As a user, when I navigate to the History & Progress Tracking screen, I want to see a list of my coaching sessions so I can track my progress and review past guidance.

### Requirements
- Vertical scrollable list of coaching sessions
- Display session date and title
- Tap to navigate to session detail (P1)
- Mock data for P0 implementation
- Loading skeleton for future real data integration

### Acceptance Criteria
- Given I am authenticated and on the History screen (US-HI-00)
- When the screen loads
- Then I see a "Coaching sessions" section header
- And I see a vertical list of session items below the Videos section
- And each session item displays a date label and title
- And the sessions are ordered by date (most recent first)
- And tapping a session logs to console (P0), navigates to detail (P1)
- And the section uses mock data for P0

### Technical Notes
- **Screen**: Rendered within History Screen (US-HI-00)
- **Components**: 
  - Section: `packages/ui/src/components/HistoryProgress/CoachingSessionsSection/` (❌ to create)
  - Item: `packages/ui/src/components/HistoryProgress/CoachingSessionItem/` (❌ to create)
- **Data Source**: Mock data hardcoded in component (P0), real API integration in P1
- **Layout**: Vertical `ScrollView` with session items
- **Navigation**: `console.log` placeholder (P0), `router.push('/session/[id]')` in P1
- **Future Integration**: P1 will add `coaching_sessions` table and API endpoint

### Current Implementation Status
- ❌ No CoachingSessionsSection component
- ❌ No CoachingSessionItem component
- ❌ No mock data structure defined
- ❌ No backend support (P1 feature)

### P0 Mock Data Structure
```typescript
const mockCoachingSessions = [
  { id: 1, date: 'Today', title: 'Muscle Soreness and Growth in Weightlifting' },
  { id: 2, date: 'Monday, Jul 28', title: 'Personalised supplement recommendations' },
  // ... more mock sessions
]
```

---

## US-HI-02: Video Analysis Screen - History View Mode
Status: Not Implemented (Route infrastructure exists)
Priority: High
Dependencies: US-VF-09 (Video Analysis Screen Integration)
Backend Support: ✅ `getAnalysisJob(id)` API ready

### User Story
As a user, when I open an analysis from my history, I want to see the complete video playback experience with all previously generated feedback so I can review my past performance without waiting for re-analysis.

### Requirements
- Open Video Analysis Screen from history items
- Load pre-existing analysis data from backend
- Display all previously generated feedback, audio, and metrics
- No new AI analysis triggered for historical views
- Full video playback with overlays from saved analysis
- Seamless navigation between history list and detailed view

### Acceptance Criteria
- Given a history item with completed analysis
- When I tap the history item
- Then the Video Analysis Screen (US-VF-09) opens in "history view" mode
- And the video file loads from cache first and from storage second if necessary
- And all data loads automatically from backend (video, feedback, audio URL, metrics)
- And no new analysis is triggered
- everything should stay and look unchanged just the dataloading is adjusted in the hooks

### Technical Notes
- **Screen**: `packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx` (✅ exists)
- **Route**: `apps/expo/app/video-analysis.tsx` (✅ exists, accepts `analysisJobId`, `videoRecordingId`, `videoUri` params)
- **Mode Detection**: If `analysisId` param exists → history mode (no AI trigger), otherwise → new analysis mode (❌ to implement)
- **Data Source**: `analysis_jobs` table (includes pose_data, results, audio segments), cache-first via US-HI-03
- **API**: `getAnalysisJob(id)` from `@my/api` (✅ exists, lines 263-284 in analysisService.ts)
- **Hook**: `useHistoricalAnalysis(analysisId)` (❌ to create)
- **State**: `videoAnalysisStore` with history mode flag (❌ to add mode field)
- **Performance**: < 100ms load from cache, no real-time AI processing in history mode

### Current Implementation Status
- ✅ VideoAnalysisScreen accepts `analysisJobId` prop
- ✅ Route infrastructure supports history params
- ❌ No mode detection logic (always treats as new analysis)
- ❌ No history-specific data loading
- ❌ No differentiation between new vs historical viewing
- ✅ Backend API ready to use

---

## US-HI-03: Cache analysis data for instant history display
Status: Not Implemented
Priority: High
Dependencies: US-VF-09 (Video Analysis Screen Integration), US-HI-01 (View analysis history list)
Related: `analysisStatus.ts` store exists for job tracking (not persistent caching)

### User Story
As a user, after my video has been analyzed, I want the results to be cached locally so that when I open the history screen, I immediately see the video thumbnail and analysis data without waiting for database fetches.

### Requirements
- Cache analysis results after successful completion
- Cache video thumbnail for history list display
- Instant display of cached data in history screen
- Automatic cache invalidation on data updates
- Cache persistence across app sessions
- Synchronization with backend for data consistency
- Minimal database queries for history list rendering

### Acceptance Criteria
- Given a video analysis has been completed and saved to the database
- When the analysis results are persisted
- Then the analysis data (title, date, metrics, thumbnail) is cached locally
- And when I open the history screen
- Then the history list displays immediately with cached thumbnails and data
- And no database fetch is required for previously cached items
- And the cached data remains available across app restarts
- And if cached data is outdated or missing, it falls back to database fetch
- And cache updates automatically when analysis data is modified

### Technical Notes
- **Store**: `packages/app/stores/videoHistory.ts` (❌ to create) - Zustand with persistence middleware
- **Existing Store**: `packages/app/stores/analysisStatus.ts` (✅ exists for job tracking, NOT for persistent caching)
- **Storage**: Web (localStorage/IndexedDB), Native (AsyncStorage)
- **Cache Strategy**: 
  - Write on analysis completion (status='completed')
  - Read cache-first, DB fallback
  - TTL: 7 days, LRU eviction at 50 entries
  - Clear on logout
- **Data Cached**: Analysis ID, title, date, thumbnail, results, pose data
- **Thumbnail**: Extract first frame via react-native-video (native) or Canvas (web) (❌ to implement)
- **Integration**: Write from `analysisStatusStore.setJobResults()`, read via TanStack Query
- **Performance**: < 50ms cache read, < 100ms history list render

### Current Implementation Status
- ✅ `analysisStatus.ts` store exists for in-memory job tracking
- ❌ No persistent cache store with storage middleware
- ❌ No thumbnail generation logic
- ❌ No cache persistence across sessions
- ❌ No LRU eviction or TTL logic
- ❌ Cache write integration not implemented

---

## US-HI-04: History Screen header integration
Status: Not Implemented (AppHeader exists, not integrated)
Priority: Medium
Dependencies: US-PS-03 (App header navigation component), US-HI-00 (History Screen)
Component Status: ✅ AppHeader exists, ❌ not integrated into History Screen

### User Story
As a user, when I view the History & Progress Tracking screen, I want to see the app header so I can navigate back to the camera or access my profile.

### Requirements
- AppHeader component displayed on History Screen
- Header remains visible when scrolling through history list
- Consistent header behavior with other screens
- Back navigation returns to camera recording
- Profile icon navigates to settings

### Acceptance Criteria
- Given I navigate to the History Screen (US-HI-00)
- When the screen loads
- Then the AppHeader component (US-PS-03) is displayed at the top
- And the back button navigates back to the camera recording screen
- And the profile icon navigates to settings
- And the header remains fixed/sticky when scrolling the history list
- And the header maintains consistent styling with app theme

### Technical Notes
- **Component**: `AppHeader` from `packages/ui/components/AppHeader/` (✅ exists)
- **Integration**: Add to History Screen layout (`packages/app/features/HistoryProgress/HistoryProgressScreen.tsx`)
- **Navigation**: 
  - Back button: `router.back()` or `router.push('/')` (camera recording)
  - Profile button: `router.push('/settings')`
- **Layout**: Header above HistoryList component with sticky positioning

### Current Implementation Status
- ✅ AppHeader component fully implemented
- ❌ No History Screen exists yet (blocked by US-HI-00)
- ❌ AppHeader not integrated into any history view
- ❌ No sticky scroll behavior implemented

---

## US-HI-05: Delete an analysis
- As a user, I can remove an analysis.
- Priority: P1 (moved from P0)
- Acceptance Criteria:
  - Given a history item
  - When I choose Delete and confirm
  - Then the row and associated artifacts become inaccessible
  - And the cached data is removed from local storage

---

## US-HI-06: Compare with previous session
Status: Postponed
Priority: P1 (moved from P0)
Dependencies: US-HI-02 (Video Analysis Screen - History View Mode)

### User Story
As a user, I want to see progress against last session.

### Acceptance Criteria
- Given at least two completed analyses
- When I open the latest detail
- Then I see delta indicators per metric vs. previous

### Technical Notes
- Postponed for later implementation
- Requires metrics comparison algorithm
- Should display visual delta indicators (arrows, percentages, color coding)