# User Stories — History & Progress Tracking (P0)

References: `../PRD.md`, `../TRD.md`, `../wireflow.png`

## US-HI-01: View analysis history list
- As a user, I want to see my past analyses.
- Priority: P0
- Acceptance Criteria:
  - Given I am authenticated
  - When I open Side Sheet
  - Then I see a list with date and title


## US-HI-02: Video Analysis Screen - History View Mode
Status: Pending
Priority: High
Dependencies: US-VF-09 (Video Analysis Screen Integration), US-HI-02 (Open analysis detail)

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
- **Screen Location**: `packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx`
- **Navigation**: Expo Router navigation with `analysisId` parameter
- **State Management**: `videoAnalysisStore` loads from `analysis_results` table by ID
- **Data Loading**: 
  - Fetch analysis record by ID from `analysis_results`
  - Load video URL from `videos` table
  - Load pose data from `pose_data` table or JSON field
  - Load feedback items from analysis result
  - Load audio URL from storage
- **Mode Detection**: Screen detects history mode via route parameter (e.g., `/video-analysis/[analysisId]`)
- **Performance**: Cached data loading, no real-time processing required
- **Cross-platform**: Works identically on web and native platforms

## US-HI-03: Cache analysis data for instant history display
Status: Pending
Priority: High
Dependencies: US-VF-09 (Video Analysis Screen Integration), US-HI-01 (View analysis history list)

### User Story
As a user, after my video has been analyzed, I want the results to be cached locally so that when I open the side sheet, I immediately see the video thumbnail and analysis data without waiting for database fetches.

### Requirements
- Cache analysis results after successful completion
- Cache video thumbnail for history list display
- Instant display of cached data in side sheet
- Automatic cache invalidation on data updates
- Cache persistence across app sessions
- Synchronization with backend for data consistency
- Minimal database queries for history list rendering

### Acceptance Criteria
- Given a video analysis has been completed and saved to the database
- When the analysis results are persisted
- Then the analysis data (title, date, metrics, thumbnail) is cached locally
- And when I open the side sheet
- Then the history list displays immediately with cached thumbnails and data
- And no database fetch is required for previously cached items
- And the cached data remains available across app restarts
- And if cached data is outdated or missing, it falls back to database fetch
- And cache updates automatically when analysis data is modified

### Technical Notes
- **State Management**: Zustand store with persistence middleware (`videoHistoryStore`)
- **Cache Strategy**: 
  - Cache on write: Save to cache immediately after database save
  - Cache on read: Store fetched data for subsequent access
  - TTL (Time To Live): Optional expiration for cache entries
- **Storage**: 
  - Web: `localStorage` or `IndexedDB` for larger datasets
  - Native: `AsyncStorage` or `MMKV` for better performance
- **Thumbnail Generation**: Generate thumbnail on video upload/analysis completion
- **Cache Keys**: Use `analysisId` as primary key
- **Cache Size Management**: LRU (Least Recently Used) eviction for memory optimization
- **Sync Strategy**: Background sync to ensure cache consistency with backend
- **Component Integration**: History list component reads from cache-first store
- **Performance**: Sub-100ms cache read latency for instant UI updates

## US-HI-04: History screen header integration
Status: Pending
Priority: High
Dependencies: US-PS-03 (App header navigation component), US-HI-01 (View analysis history list)

### User Story
As a user, when I view the history and progress tracking screen, I want to see the app header so I can navigate back to the camera or access my profile.

### Requirements
- AppHeader component displayed on history/side sheet screen
- Header remains visible when scrolling through history list
- Consistent header behavior with other screens

### Acceptance Criteria
- Given I open the side sheet / history screen
- When the screen loads
- Then the AppHeader component (US-PS-03) is displayed at the top
- And the back button navigates to the camera recording screen
- And the profile icon navigates to settings
- And the header remains fixed/sticky when scrolling the history list
- And the header maintains consistent styling with app theme

### Technical Notes
- **Component Usage**: Import and use `AppHeader` from `packages/ui/components/AppHeader/`
- **Screen Integration**: Place AppHeader at top of history screen layout
- **Sticky Behavior**: Header should remain visible during list scroll (position: fixed or sticky)
- **Screen Location**: History screen in `packages/app/features/History/` or side sheet component

## US-HI-05: Delete an analysis
- As a user, I can remove an analysis.
- Priority: P1 (moved from P0)
- Acceptance Criteria:
  - Given a history item
  - When I choose Delete and confirm
  - Then the row and associated artifacts become inaccessible
  - And the cached data is removed from local storage

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