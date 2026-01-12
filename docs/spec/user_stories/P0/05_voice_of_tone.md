# User Stories — Voice of Tone (P0)

References: `../PRD.md`, `../TRD.md`, `../voice_of_tone.md`

## US-VT-00: Voice Preferences Data Model
Status: ✅ Implemented
Priority: Critical (Blocks all other stories)
Dependencies: US-VT-09 (Voice Config Lookup Table)

### User Story
As a system, I need to persist user voice and mode preferences so they can be applied to feedback generation and displayed consistently across the app.

### Requirements
- Extend `profiles` table with voice preference columns
- Store resolved snapshot on `analysis_jobs` for historical accuracy
- RLS policies for secure access (read own, update own)
- Type definitions for preferences

### Acceptance Criteria
- Given the database schema
- When voice preferences feature is enabled
- Then the `profiles` table has `coach_gender` and `coach_mode` columns with CHECK constraints
- And the `analysis_jobs` table has snapshot columns: `coach_gender`, `coach_mode`, `voice_name_used`, `avatar_asset_key_used`
- And RLS policies allow users to read/update only their own preferences
- And TypeScript types reflect the new schema

### Technical Notes
- **Migration**: `supabase/migrations/20260107213000_add_voice_preferences.sql` (✅ created and applied)
- **Profiles Extension**:
  ```sql
  ALTER TABLE profiles
    ADD COLUMN coach_gender TEXT DEFAULT 'female' 
      CHECK (coach_gender IN ('male', 'female')),
    ADD COLUMN coach_mode TEXT DEFAULT 'roast' 
      CHECK (coach_mode IN ('roast', 'zen', 'lovebomb'));
  
  -- RLS: Users can update their own voice preferences
  CREATE POLICY "Users can update own voice preferences" ON profiles
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  ```
- **Analysis Jobs Extension** (for historical accuracy):
  ```sql
  ALTER TABLE analysis_jobs
    ADD COLUMN coach_gender TEXT,
    ADD COLUMN coach_mode TEXT,
    ADD COLUMN voice_name_used TEXT,        -- Actual Gemini voice used
    ADD COLUMN avatar_asset_key_used TEXT;  -- Actual avatar shown
  ```
- **Types**: Add to `packages/config/src/types/` or `packages/types/`
  ```typescript
  export type CoachGender = 'male' | 'female'
  export type CoachMode = 'roast' | 'zen' | 'lovebomb'
  
  export interface VoicePreferences {
    coachGender: CoachGender
    coachMode: CoachMode
  }
  
  export interface ResolvedVoiceConfig {
    gender: CoachGender
    mode: CoachMode
    voiceName: string        // e.g., 'Aoede', 'Gacrux'
    avatarAssetKey: string   // e.g., 'female_roast'
  }
  ```
- **API**: `getUserVoicePreferences()`, `updateVoicePreferences()` in `@my/api`
- **Resolution Flow**: 
  1. Read user's gender + mode from profiles
  2. Lookup full config from `coach_voice_configs` (US-VT-09)
  3. Store snapshot values in analysis_jobs

### Current Implementation Status
- ✅ `profiles` table exists (basic fields only)
- ✅ Voice preference columns added to `profiles` (`coach_gender`, `coach_mode` with defaults and CHECK constraints)
- ✅ Snapshot columns added to `analysis_jobs` (`coach_gender`, `coach_mode`, `voice_name_used`, `avatar_asset_key_used`)
- ✅ TypeScript types implemented in `packages/api/src/services/voicePreferencesService.ts`
- ✅ API functions implemented: `getUserVoicePreferences()`, `updateVoicePreferences()`, `updateAnalysisJobVoiceSnapshot()`
- ✅ pgTAP tests: `supabase/tests/database/09_voice_preferences.test.sql` (11 tests passing)
- ✅ Vitest tests: `packages/api/src/services/voicePreferencesService.test.ts` (11 tests passing)

---

## US-VT-01: First Login Voice Selection Screen
Status: ✅ Implemented
Priority: High
Dependencies: US-VT-00 (Data Model)
Implemented: 2025-01-08

### User Story
As a new user on first login, I want to select my preferred coach gender and feedback mode before accessing the camera screen, so I receive personalized feedback from the start.

### Requirements
- ✅ Full-screen modal/route shown only on first login
- ✅ Gender selection: Male/Female (Female preselected)
- ✅ Mode selection: "Roast:Me", "Zen:Me", "Lovebomb:Me" (Roast:Me preselected)
- ✅ "Roast:Me" marked with star/badge as "humoristic"
- ✅ Save preferences to database on continue
- ✅ Navigate to camera screen after selection
- ✅ Skip logic: Only show when `coach_mode` is NULL in profile

### Acceptance Criteria
- ✅ Given I am a new user completing authentication for the first time
- ✅ When I finish sign-in/sign-up
- ✅ Then I see the Voice Selection screen (not the camera screen)
- ✅ And I see gender options with Female preselected
- ✅ And I see mode options with "Roast:Me" preselected and marked as humoristic
- ✅ And when I tap "Continue"
- ✅ Then my preferences are saved to the database
- ✅ And I navigate to the camera recording screen
- ✅ And on subsequent logins, I skip directly to camera (preferences already set)

### Technical Notes
- **Screen**: `packages/app/features/Onboarding/VoiceSelectionScreen.tsx` (✅ created)
- **Route**: 
  - Expo: `apps/expo/app/onboarding/voice-selection.tsx` (✅ created)
  - Web: `apps/web/app/onboarding/voice-selection.tsx` (✅ created)
- **Components**:
  - `packages/ui/src/components/VoiceSelection/GenderSelector.tsx` (✅ created)
  - `packages/ui/src/components/VoiceSelection/ModeSelector.tsx` (✅ created)
  - `packages/ui/src/components/VoiceSelection/ModeCard.tsx` (✅ created)
- **Navigation Logic** (in route or auth flow):
  ```typescript
  // After successful auth
  const hasPrefs = await hasUserSetVoicePreferences(user.id)
  if (!hasPrefs) {
    router.replace('/onboarding/voice-selection')
  } else {
    router.replace('/')
  }
  ```
  ✅ Implemented in `apps/expo/app/auth/sign-in.tsx` and `apps/web/app/auth/sign-in.tsx`
- **Store**: `packages/app/stores/voicePreferences.ts` (✅ exists) - Zustand store for preferences
- **First-Login Detection**: `hasUserSetVoicePreferences()` in `packages/api/src/services/voicePreferencesService.ts` (✅ created)
- **UI Pattern**: Similar to settings radio groups but larger, card-based selection
- **Mode Descriptions** (constants in code):
  ```typescript
  // packages/app/features/Onboarding/constants.ts
  export const MODE_OPTIONS = [
    { value: 'roast', label: 'Roast:Me ⭐', description: 'Brutal honesty with a side of humor', isHumoristic: true },
    { value: 'zen', label: 'Zen:Me', description: 'Calm, encouraging guidance' },
    { value: 'lovebomb', label: 'Lovebomb:Me', description: 'Lovable positivity' },
  ] as const
  
  export const DEFAULT_PREFERENCES = { gender: 'female', mode: 'roast' } as const
  ```
  ✅ Created in `packages/app/features/Onboarding/constants.ts`
- **Preselection**: Hardcoded defaults (female + roast) — no DB lookup needed
- **Storybook Stories**: 
  - `GenderSelector.stories.tsx` (✅ created)
  - `ModeCard.stories.tsx` (✅ created)
  - `ModeSelector.stories.tsx` (✅ created)
  - `VoiceSelectionScreen.stories.tsx` (✅ created)
- **Tests**: 
  - `voicePreferencesService.test.ts` - hasUserSetVoicePreferences tests (✅ added)
  - `VoiceSelectionScreen.test.tsx` (✅ created)

### Current Implementation Status
- ✅ VoiceSelectionScreen created with full functionality
- ✅ Onboarding routes created (Expo + Web)
- ✅ GenderSelector component created
- ✅ ModeSelector component created
- ✅ ModeCard component created
- ✅ First-login detection logic implemented (hasUserSetVoicePreferences)
- ✅ Navigation interception in sign-in routes (Expo + Web)
- ✅ Storybook stories for all components
- ✅ Unit tests for service and screen
- ✅ Auth flow extended with preference checking

---

## US-VT-02: LLM Feedback Mode Injection
Status: ✅ Implemented
Priority: High
Dependencies: US-VT-00 (Data Model), US-VT-09 (Voice Config Table)
Implemented: 2026-01-07

### User Story
As a user, when my video is analyzed, I want the AI feedback to match my selected mode and gender preferences so the coaching style and personality reflect my choices.

### Requirements
- ✅ Load user's `coach_gender` and `coach_mode` before video analysis
- ✅ Fetch `prompt_voice` and `prompt_personality` from config table
- ✅ Build complete prompt by injecting config values into base template
- ✅ Store resolved config snapshot on `analysis_jobs` record

### Acceptance Criteria
- ✅ Given I have selected Female + Zen preferences
- ✅ When I record and submit a video for analysis
- ✅ Then the AI feedback is generated using:
  - prompt_voice = 'Zen me. Calm, mindful coaching...'
  - prompt_personality = 'Peaceful/Supportive Guide with gentle british composure'
- ✅ And the feedback messages are calm and encouraging (not roasts)
- ✅ And the `analysis_jobs` record stores the resolved config values

### Technical Notes
- **Config Lookup** (from US-VT-09):
  ```typescript
  const config = await getVoiceConfig(userPrefs.gender, userPrefs.mode)
  // config.promptVoice = 'Zen me. Calm, mindful coaching...'
  // config.promptPersonality = 'Peaceful/Supportive Guide...'
  ```
- **Prompt Building**: `supabase/functions/ai-analyze-video/prompts-local.ts`
  ```typescript
  export function buildPromptFromConfig(
    config: CoachVoiceConfig,
    duration: number
  ): string {
    return `
  **Role:** World-class Performance Coach (${config.promptPersonality}).
  **Voice:** ${config.promptVoice}
  **Context:** Video Duration: **${duration}s**
  
  **Task**
  Analyze the segment and provide **2 to 4** high-impact feedback points.
  ... rest of structured template ...
  `
  }
  ```
- **Pipeline Integration**: `supabase/functions/_shared/pipeline/aiPipeline.ts`
  ```typescript
  // 1. Fetch user preferences
  const prefs = await getUserVoicePreferences(userId)
  
  // 2. Lookup full config from database
  const config = await getVoiceConfig(prefs.coachGender, prefs.coachMode)
  
  // 3. Build prompt with injected values
  const prompt = buildPromptFromConfig(config, videoDuration)
  
  // 4. Pass to video analysis service
  const analysis = await videoAnalysisService.analyze({
    ...context,
    prompt,  // Full prompt with injected config
  })
  
  // 5. Store snapshot on analysis_jobs
  await updateAnalysisJob(analysisId, {
    coach_gender: config.gender,
    coach_mode: config.mode,
    voice_name_used: config.voiceName,
    avatar_asset_key_used: config.avatarAssetKey,
  })
  ```
- **Analysis Service**: Accept pre-built prompt instead of mode parameter

### Implementation Summary
**Files Created:**
- `supabase/functions/_shared/db/voiceConfig.ts`: Voice config utilities for Edge Functions
  - `getUserVoicePreferences()`: Fetches user preferences with defaults
  - `getVoiceConfig()`: Looks up voice config from database
  - `updateAnalysisJobVoiceSnapshot()`: Stores resolved config snapshot

**Files Modified:**
- `supabase/functions/ai-analyze-video/prompts-local.ts`: Added `buildPromptFromConfig()`
- `supabase/functions/_shared/pipeline/aiPipeline.ts`: Integrated voice config lookup and prompt injection
- `supabase/functions/ai-analyze-video/routes/handleStartAnalysis.ts`: Pass userId to pipeline
- `supabase/functions/ai-analyze-video/routes/handleWebhookStart.ts`: Extract userId and pass to pipeline
- `supabase/functions/_shared/services/video/VideoAnalysisService.ts`: Added customPrompt support
- `supabase/functions/ai-analyze-video/gemini-llm-analysis.ts`: Accept and use customPrompt parameter

**Default Behavior:**
- Users with no preferences set default to: `coach_gender: 'female'`, `coach_mode: 'roast'`
- Maintains backward compatibility with existing users

### Current Implementation Status
- ✅ `BASE_PROMPT_TEMPLATE` with placeholders for voice/personality
- ✅ `buildPromptFromConfig()` function implemented
- ✅ Config table lookup in pipeline
- ✅ User preference fetching in pipeline with error handling
- ✅ Snapshot storage on analysis_jobs after analysis completion

---

## US-VT-03: TTS Voice Gender Injection
Status: ✅ Implemented
Priority: High
Dependencies: US-VT-00 (Data Model), US-VT-09 (Voice Config Table)

### User Story
As a user, when audio feedback is generated, I want the TTS voice to match my selected gender and mode preferences so the coaching feels personalized.

### Requirements
- Load user's `coach_gender` and `coach_mode` before TTS generation
- Lookup voice_name from `coach_voice_configs` table
- Inject resolved voice_name into TTS service
- Store resolved `voice_name_used` snapshot on `analysis_jobs` record

### Acceptance Criteria
- Given I have selected Female + Zen preferences
- When audio feedback is generated for my analysis
- Then the TTS uses voice_name = 'Gacrux' (from config table)
- And the `analysis_jobs` record stores `voice_name_used = 'Gacrux'`

### Technical Notes
- **TTS Service**: `supabase/functions/_shared/services/speech/TTSService.ts` (✅ exists)
  - Accept resolved `voiceName` directly (not gender)
  ```typescript
  interface TTSContext {
    // ... existing fields
    voiceName?: string  // Resolved from config table
  }
  ```
- **Voice Resolution Flow** (in pipeline):
  ```typescript
  // 1. Fetch user preferences
  const prefs = await getUserVoicePreferences(userId)
  
  // 2. Lookup voice config from database
  const config = await getVoiceConfig(prefs.coachGender, prefs.coachMode)
  
  // 3. Pass resolved voice_name to TTS
  await ttsService.synthesize({
    ...context,
    voiceName: config.voiceName,  // e.g., 'Gacrux'
  })
  
  // 4. Store snapshot on analysis_jobs
  await updateAnalysisJob(analysisId, {
    voice_name_used: config.voiceName,
    avatar_asset_key_used: config.avatarAssetKey,
  })
  ```
- **Config Table**: Uses `coach_voice_configs` from US-VT-09
- **Gemini TTS**: Already supports `voiceName` parameter

### Current Implementation Status
- ✅ `GeminiTTSService` exists with `voiceName` support
- ✅ `voiceName` already configurable in request
- ✅ `ttsSystemInstruction` parameter added to TTS pipeline (replaces env var)
- ✅ Config table lookup in TTS flow (audioWorker.ts, handleTTS.ts)
- ✅ User preference fetching in TTS flow (getUserVoicePreferences)
- ✅ Snapshot storage on analysis_jobs (updateAnalysisJobVoiceSnapshot)
- ✅ Both per-feedback and full-analysis TTS paths use `voiceConfig.ttsSystemInstruction`

**Implementation Files:**
- `supabase/functions/_shared/gemini/tts.ts`: Added `ttsSystemInstruction` parameter to `GenerateTTSRequest`
- `supabase/functions/ai-analyze-video/gemini-tts-audio.ts`: Added `ttsSystemInstruction` to `TTSOptions`
- `supabase/functions/_shared/services/speech/TTSService.ts`: Added `ttsSystemInstruction` to `TTSContext.customParams`
- `supabase/functions/ai-analyze-video/routes/handleTTS.ts`: Pass `voiceConfig.ttsSystemInstruction` for both per-feedback and full-analysis TTS
- `supabase/functions/ai-analyze-video/workers/audioWorker.ts`: Voice resolution in audio pipeline
- `supabase/functions/ai-analyze-video/workers/audioWorker.test.ts`: Tests for voice injection
- `supabase/functions/ai-analyze-video/routes/handleTTS.test.ts`: Tests for voice resolution

**Breaking Change:**
- ⚠️ `TTS_SYSTEM_INSTRUCTION` environment variable is now **deprecated** and unused
- All TTS system instructions now come from `coach_voice_configs.tts_system_instruction` column
- The hardcoded default ('Use a funny north european accent.') is only used if config table lookup returns null/undefined

---

## US-VT-04: Coach Avatar Mode Display
Status: ✅ Implemented
Priority: Medium
Dependencies: US-VT-00 (Data Model), US-VT-09 (Voice Config Table)

### User Story
As a user viewing my video analysis in fullscreen mode, I want to see a coach avatar that matches my selected gender and mode, so the visual experience feels consistent with the audio feedback.

### Requirements
- Avatar assets for each gender × mode combination (6 total, bundled in app)
- Lookup `avatar_asset_key` from config table or use snapshot from analysis_jobs
- Avatar display in VideoPlayerSection during analysis
- Fallback to default avatar if preferences not loaded

### Acceptance Criteria
- Given I have selected Female + Roast:Me preferences
- When I view my video analysis in fullscreen mode
- Then I see the female roast coach avatar (asset key: 'female_roast')
- And if I change to Male + Zen:Me in settings
- Then subsequent analyses show the male zen coach avatar

### Technical Notes
- **Avatar Assets** (❌ to create, bundled in app):
  - `apps/expo/assets/avatars/coach_female_roast.webp`
  - `apps/expo/assets/avatars/coach_female_zen.webp`
  - `apps/expo/assets/avatars/coach_female_lovebomb.webp`
  - `apps/expo/assets/avatars/coach_male_roast.webp`
  - `apps/expo/assets/avatars/coach_male_zen.webp`
  - `apps/expo/assets/avatars/coach_male_lovebomb.webp`
- **Asset Mapping** (from US-VT-09):
  ```typescript
  // packages/ui/src/assets/avatars/index.ts
  export const AVATAR_ASSETS = {
    female_roast: require('./coach_female_roast.webp'),
    male_roast: require('./coach_male_roast.webp'),
    female_zen: require('./coach_female_zen.webp'),
    male_zen: require('./coach_male_zen.webp'),
    female_lovebomb: require('./coach_female_lovebomb.webp'),
    male_lovebomb: require('./coach_male_lovebomb.webp'),
  } as const
  
  export type AvatarAssetKey = keyof typeof AVATAR_ASSETS
  ```
- **Component**: `packages/ui/src/components/VideoAnalysis/CoachAvatar/CoachAvatar.tsx` (✅ exists, ✅ props added)
  ```typescript
  interface CoachAvatarProps {
    // ... existing props
    avatarAssetKey?: AvatarAssetKey  // Uses config table key
  }
  
  // Usage
  const source = avatarAssetKey 
    ? AVATAR_ASSETS[avatarAssetKey] 
    : AVATAR_ASSETS.female_roast  // default
  ```
- **Integration Flow**:
  1. New analysis: Lookup config by user preferences, pass `avatarAssetKey`
  2. History view: Use `avatar_asset_key_used` from analysis_jobs snapshot
  3. Legacy analyses: Fallback to current user preferences if snapshot missing

### Current Implementation Status
- ✅ `CoachAvatar` component exists
- ✅ `avatarAssetKey` prop added to avatar component
- ✅ Asset mapping file created (`packages/ui/src/assets/avatars/index.ts`)
- ✅ Avatar selection from `analysis_jobs.avatar_asset_key_used` snapshot
- ✅ Props threaded through: Screen → Layout → Section → Avatar
- ✅ Fallback to default avatar when key missing
- ✅ Legacy analysis fallback to current user preferences
- ⚠️ Avatar assets: 1 real asset (`coach_female_roast.webp`), 5 using placeholder (ready to swap when assets provided)

**Implementation Files:**
- `packages/ui/src/assets/avatars/index.ts`: Avatar asset mapping with 6 keys
- `packages/ui/src/components/VideoAnalysis/CoachAvatar/CoachAvatar.tsx`: Added `avatarAssetKey` prop
- `packages/ui/src/components/VideoAnalysis/CoachAvatar/CoachAvatar.test.tsx`: Added 5 new tests for avatar selection
- `packages/app/features/HistoryProgress/stores/videoHistory.ts`: Added `avatarAssetKeyUsed` to `CachedAnalysis`
- `packages/app/features/VideoAnalysis/hooks/useHistoricalAnalysis.ts`: Fetch `avatar_asset_key_used` from DB
- `packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx`: Extract and pass `avatarAssetKey` in `videoState` with legacy fallback
- `packages/app/features/VideoAnalysis/components/VideoAnalysisLayout.native.tsx`: Thread prop to VideoPlayerSection
- `packages/app/features/VideoAnalysis/components/VideoAnalysisLayout.web.tsx`: Thread prop to VideoPlayerSection
- `packages/app/features/VideoAnalysis/components/VideoPlayerSection.tsx`: Accept and pass prop to CoachAvatar

---

## US-VT-05: Settings Personalization - Voice Preferences
Status: ✅ Implemented
Priority: High
Dependencies: US-VT-00 (Data Model), US-VT-01 (Initial Selection)

### User Story
As a user, I want to change my coach gender and feedback mode in Settings > Personalization, so I can adjust my preferences without starting over.

### Requirements
- Add Voice Preferences section at top of PersonalisationScreen
- Gender radio group (Male/Female)
- Mode selector (Roast:Me, Zen:Me, Lovebomb:Me)
- Real-time save to database on change
- Visual feedback on save (loading state)

### Acceptance Criteria
- Given I navigate to Settings > Personalization
- When the screen loads
- Then I see "Coach Voice" section at the top
- And I see my current gender and mode selections
- When I change the gender or mode
- Then the preference is saved to the database
- And subsequent analyses use the new preference

### Technical Notes
- **Screen**: `packages/app/features/Personalisation/PersonalisationScreen.tsx` (✅ exists, ❌ needs extension)
- **Components to Add**:
  ```tsx
  {/* Coach Voice Section - TOP OF SCREEN */}
  <YStack marginBottom="$4">
    <SettingsSectionHeader
      title="Coach Voice"
      icon={Mic}
    />
    <SettingsRadioGroup
      icon={User}
      iconColor="$blue10"
      title="Voice Gender"
      description="Male or female coach voice"
      value={gender}
      onValueChange={handleGenderChange}
      options={[
        { value: 'female', label: 'Female' },
        { value: 'male', label: 'Male' },
      ]}
    />
    <SettingsRadioGroup
      icon={Sparkles}
      iconColor="$orange10"
      title="Coaching Style"
      description="How your coach delivers feedback"
      value={mode}
      onValueChange={handleModeChange}
      options={[
        { value: 'roast', label: 'Roast:Me ⭐' },
        { value: 'zen', label: 'Zen:Me' },
        { value: 'lovebomb', label: 'Lovebomb:Me' },
      ]}
    />
  </YStack>
  ```
- **State Management**: 
  - Load from `voicePreferencesStore` on mount
  - Optimistic update + API sync
  - TanStack Query mutation for persistence
- **API**: `updateVoicePreferences(preferences)` mutation

### Current Implementation Status
- ✅ `PersonalisationScreen` exists with theme/language settings
- ✅ `SettingsRadioGroup` component extended with generic `options` prop support
- ✅ Coach Voice section added at top of PersonalisationScreen
- ✅ Voice Gender radio group (Female/Male) with User icon
- ✅ Coaching Style radio group (Roast:Me ⭐/Zen:Me/Lovebomb:Me) with Sparkles icon
- ✅ `voicePreferencesStore` integrated (exists, was already implemented)
- ✅ `updateVoicePreferences` API service (exists, was already implemented)
- ✅ Optimistic updates with database sync on change
- ✅ Preferences load from database on screen mount
- ✅ Comprehensive test coverage (30 tests: 12 UI + 18 App)
- ✅ Storybook stories created for both SettingsRadioGroup and PersonalisationScreen
- ✅ All acceptance criteria met

**Implementation Files:**
- `packages/ui/src/components/Settings/SettingsRadioGroup/SettingsRadioGroup.tsx`: Extended with generic options prop
- `packages/ui/src/components/Settings/SettingsRadioGroup/SettingsRadioGroup.test.tsx`: Added 4 new tests for custom options
- `packages/ui/src/components/Settings/SettingsRadioGroup/SettingsRadioGroup.stories.tsx`: 7 Storybook stories demonstrating usage
- `packages/ui/src/components/Settings/SettingsRadioGroup/index.ts`: Exported `RadioOption` type
- `packages/ui/src/index.ts`: Added `RadioOption` to public API
- `packages/app/features/Personalisation/PersonalisationScreen.tsx`: Added Coach Voice section with voice preferences integration
- `packages/app/features/Personalisation/PersonalisationScreen.test.tsx`: Added 4 new tests for voice preferences
- `packages/app/features/Personalisation/PersonalisationScreen.stories.tsx`: Storybook documentation

---

## US-VT-06: History Mode - Historical Avatar Display
Status: ✅ Implemented
Priority: Medium
Dependencies: US-VT-00 (Data Model), US-VT-04 (Avatar Display)

### User Story
As a user viewing a past analysis from history, I want to see the coach avatar that was used at the time of analysis, even if I've since changed my preferences.

### Requirements
- Read `avatar_asset_key_used` directly from `analysis_jobs` record
- Pass historical asset key to avatar component (not current preferences)
- Fallback to current config lookup if snapshot missing (legacy data)

### Acceptance Criteria
- Given I analyzed a video with Female + Roast:Me preferences
- And the analysis stored `avatar_asset_key_used = 'female_roast'`
- And I later changed my preferences to Male + Zen:Me
- When I open that analysis from history
- Then I see the female roast coach avatar (from snapshot)
- And new analyses show male zen avatar

### Technical Notes
- **Data Flow**:
  ```typescript
  // In VideoAnalysisScreen / useHistoricalAnalysis hook
  const analysisJob = await getAnalysisJob(analysisId)
  
  // Use snapshot directly - no config lookup needed for history
  const avatarAssetKey = analysisJob.avatar_asset_key_used
  
  // Fallback for legacy data (before voice preferences existed)
  if (!avatarAssetKey) {
    const currentPrefs = await getUserVoicePreferences()
    const config = await getVoiceConfig(currentPrefs.gender, currentPrefs.mode)
    avatarAssetKey = config.avatarAssetKey
  }
  
  // Pass to avatar
  <CoachAvatar avatarAssetKey={avatarAssetKey} />
  ```
- **Integration Points**:
  - `packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx`
  - History mode detection (US-HI-02)
  - Pass avatar config to `VideoPlayerSection`
- **API Response**: `getAnalysisJob()` already returns full job data
- **Snapshot Fields Used**:
  - `avatar_asset_key_used` (primary - for avatar display)
  - `voice_name_used` (for debugging/analytics)
  - `coach_gender`, `coach_mode` (for reference)

### Current Implementation Status
- ✅ Snapshot columns added to `analysis_jobs` (migration already exists)
- ✅ Database types updated with voice snapshot fields
- ✅ Historical avatar prop passing through component tree
- ✅ Avatar asset mapping created (6 keys, placeholder assets)
- ✅ Legacy data fallback using current preferences
- ✅ Test coverage updated (27 tests passing)
- ✅ `getAnalysisJob()` API returns snapshot columns

### Implementation Details
**Files Created:**
- `packages/ui/src/assets/avatars.ts` - Avatar asset mapping with type-safe keys

**Files Modified:**
- `packages/api/types/database.ts` - Added voice snapshot columns to AnalysisJob type
- `packages/app/features/HistoryProgress/stores/videoHistory.ts` - Added avatarAssetKeyUsed to cache
- `packages/app/features/VideoAnalysis/hooks/useHistoricalAnalysis.ts` - Extract avatar_asset_key_used
- `packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx` - Added legacy fallback with useEffect
- `packages/app/features/VideoAnalysis/components/VideoPlayerSection.tsx` - Pass to CoachAvatar (already existed)
- Test files updated with new mock fields

**Quality Metrics:**
- TypeScript: 0 errors
- Lint: 0 errors
- Tests: 27/27 passing (useHistoricalAnalysis + useHistoryQuery)

---

## US-VT-07: Base Prompt Template with Config Injection
Status: ✅ Implemented
Priority: High
Dependencies: US-VT-09 (Voice Config Table)

### User Story
As a system, I need a base prompt template that accepts injected values from the config table, ensuring consistent structure while allowing personality customization without code deployments.

### Requirements
- Single base template with placeholder injection points
- `buildPromptFromConfig()` function to assemble final prompt
- Consistent output format (JSON + text) regardless of mode
- Config table stores variable parts (voice, personality)
- Code stores structural parts (task, timing, format)

### Acceptance Criteria
- Given the base template and a config from database
- When I call `buildPromptFromConfig(config, duration)`
- Then the returned prompt has the config's voice and personality injected
- And the structural elements (task, timing, format) remain consistent
- And the JSON output schema is identical across all modes

### Technical Notes
- **File**: `supabase/functions/ai-analyze-video/prompts-local.ts` (✅ refactored)
- **Types**: `supabase/functions/_shared/types/voice-config.ts` (Edge-compatible `VoiceConfigPromptParams`)
- **Tests**: `supabase/functions/ai-analyze-video/prompts-local.test.ts` (7 tests, all passing)
- **Base Template** (structural parts in code):
  ```typescript
  const BASE_PROMPT_TEMPLATE = `
  **Role:** World-class Performance Coach ({PERSONALITY}).
  **Voice:** {VOICE}
  **Context:** Video Duration: **{DURATION}s**
  
  **Task**
  Analyze the segment and provide **2 to 4** high-impact feedback points.
  
  **Timing Constraints**
  1. **Lead-in:** First timestamp must be **> 5.0s**.
  2. **Reactionary:** Place timestamps **0.5s–1.5s AFTER** the specific error occurs.
  3. **Spacing:** Maintain a **> 5.0s gap** between feedback points.
  4. **Priority:** If spacing prevents the next item, provide only one superior point.
  
  **Output Format**
  Return two blocks: **TEXT FEEDBACK** and **JSON DATA**.
  
  === TEXT FEEDBACK START ===
  **Title Start**
  [Title matching the voice/personality - max 60 chars]
  **Title End**
  
  **Big Picture**
  [Brief overarching summary in the configured voice]
  
  **Analysis**
  [Detailed analysis in the configured personality]
  
  **Format: Table**
  * Timestamp: [s.t]
  * Category: [Movement, Posture, Speech, Vocal Variety]
  * Feedback: [Concise feedback in configured voice]
  * Confidence: [0.7-1.0]
  * Impact: [0.30]
  *(Repeat for next item if applicable)*
  
  **Bonus**
  [One specific 5-min drill for the #1 issue]
  === TEXT FEEDBACK END ===
  
  === JSON DATA START ===
  \`\`\`json
  {
    "feedback": [
      {
        "timestamp": 0.0,
        "category": "String",
        "message": "String",
        "confidence": 0.0,
        "impact": 0.0
      }
    ]
  }
  \`\`\`
  === JSON DATA END ===
  `
  ```

- **Injection Function** (Implemented):
  ```typescript
  import type { VoiceConfigPromptParams } from '../_shared/types/voice-config.ts'
  
  export function buildPromptFromConfig(
    config: VoiceConfigPromptParams,
    duration: number
  ): string {
    return BASE_PROMPT_TEMPLATE
      .replace('{PERSONALITY}', config.promptPersonality)
      .replace('{VOICE}', config.promptVoice)
      .replace('{DURATION}', String(duration))
  }
  ```
  
  **Note**: Uses `VoiceConfigPromptParams` (Edge-compatible) instead of `CoachVoiceConfig` since Edge Functions can't import from `@my/api`.

- **Config Values** (from database, see US-VT-09):
  | Mode | prompt_voice | prompt_personality |
  |------|--------------|-------------------|
  | Roast | "Roast me!!!" Use playful insults and biting humour... | Ruthless/Sharp Insight with [accent] |
  | Zen | Zen me. Calm, mindful coaching... | Peaceful/Supportive Guide with british composure |
  | Lovebomb | Lovebomb me. Use warm and lovable positivity... | Admirable Parent with warm and lovable positivity |

### Current Implementation Status
- ✅ `BASE_PROMPT_TEMPLATE` exists with `{PERSONALITY}`, `{VOICE}`, `{DURATION}` placeholders
- ✅ `buildPromptFromConfig()` function implemented in `prompts-local.ts`
- ✅ `DEFAULT_ROAST_CONFIG` for backward compatibility
- ✅ `getGeminiAnalysisPrompt()` refactored to delegate to `buildPromptFromConfig()`
- ✅ `gemini-llm-analysis.ts` accepts optional `voiceConfig` parameter
- ✅ `VoiceConfigPromptParams` type created in `_shared/types/voice-config.ts`
- ✅ `VideoAnalysisParams` updated with optional `voiceConfig` field
- ✅ Unit tests: 7 tests passing (all 3 modes + structural elements + JSON schema)
- ✅ Prompt values stored in database (US-VT-09)
- ✅ Config table schema includes prompt fields (US-VT-09)

---

## US-VT-08: Voice Preferences Store
Status: ✅ Implemented
Priority: High
Dependencies: US-VT-00 (Data Model)

### User Story
As a system, I need a client-side store for voice preferences to enable quick access without repeated database queries.

### Requirements
- Zustand store with persistence
- Sync with database on auth state change
- Optimistic updates for settings changes
- Type-safe selectors

### Acceptance Criteria
- Given the preferences store is implemented
- When a user signs in
- Then preferences are loaded from database
- And cached locally for quick access
- When preferences are updated in settings
- Then local state updates immediately
- And database sync happens in background

### Technical Notes
- **Store**: `packages/app/stores/voicePreferences.ts` (✅ created)
  - Uses MMKV storage (30x faster than AsyncStorage) via `@my/config`
  - Persists only `gender` and `mode` (transient state like `isLoaded`/`isSyncing` not persisted)
  - Provides optimistic updates via `setGender()` and `setMode()`
  - Includes `loadFromDatabase(userId)` and `syncToDatabase(userId)` for API sync
  - Exports `initializeVoicePreferencesAuthSync()` for auth subscription setup
- **Integration**: 
  - Auth subscription: Auto-loads preferences on sign-in, resets on sign-out
  - Logout cleanup: Integrated into `clearAllUserData()` in `auth.ts`
  - Convenience selectors: `useVoicePreferences()` and `useVoicePreferencesActions()` exported from `stores/index.ts`
- **Tests**: `packages/app/stores/voicePreferences.test.ts` (6 tests passing)

### Current Implementation Status
- ✅ `voicePreferences.ts` store created with MMKV persistence
- ✅ Persistence middleware configured with partialize for gender/mode only
- ✅ Auth subscription setup via `initializeVoicePreferencesAuthSync()`
- ✅ Store cleanup integrated into `clearAllUserData()` in auth.ts
- ✅ Store exports and selectors added to `stores/index.ts`
- ✅ Tests passing (6 tests) with type-check and lint passing

---

## US-VT-09: Coach Voice Configuration Table
Status: ✅ Implemented
Priority: Critical (Blocks US-VT-00)
Dependencies: None

### User Story
As a system, I need a database-driven lookup table for voice configurations so that voice-to-mode-gender mappings, LLM prompts, and TTS instructions can be updated without code deployments, and the system is prepared for future expansion.

### Requirements
- Database table mapping (gender, mode) → full config (voice, avatar, prompts, TTS instructions)
- Seed data for initial 6 combinations with all config values
- API to fetch config by gender + mode
- Support for future expansion (more genders, modes, voices)
- `is_active` flag for soft-disable
- RLS policies for read access (all authenticated users)

### Acceptance Criteria
- Given the database schema
- When I query for Female + Roast configuration
- Then I receive:
  - voice_name = 'Aoede'
  - avatar_asset_key = 'female_roast'
  - tts_system_instruction = 'Use a funny north european accent.'
  - prompt_voice = '"Roast me!!!" Use playful insults and biting humour.'
  - prompt_personality = 'Ruthless/Sharp Insight with north european wit'
- And all 6 initial combinations are seeded
- And inactive configs are excluded from queries

### Technical Notes
- **Migration**: `supabase/migrations/20260107205848_create_coach_voice_configs.sql` (✅ created and applied)
- **Table Schema**:
  ```sql
  CREATE TABLE coach_voice_configs (
    id SERIAL PRIMARY KEY,
    gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
    mode TEXT NOT NULL CHECK (mode IN ('roast', 'zen', 'lovebomb')),
    
    -- TTS Configuration
    voice_name TEXT NOT NULL,              -- Gemini voice: 'Aoede', 'Gacrux', etc.
    tts_system_instruction TEXT NOT NULL,  -- Accent/tone: 'Use a funny russian accent.'
    
    -- LLM Prompt Injection (variable parts only)
    prompt_voice TEXT NOT NULL,            -- Voice directive for feedback generation
    prompt_personality TEXT NOT NULL,      -- Personality description for LLM
    
    -- Avatar
    avatar_asset_key TEXT NOT NULL,        -- Maps to bundled asset: 'female_roast'
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(gender, mode)
  );
  
  -- RLS: All authenticated users can read active configs
  ALTER TABLE coach_voice_configs ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users can read voice configs"
    ON coach_voice_configs FOR SELECT
    TO authenticated
    USING (is_active = true);
  
  -- Index for fast lookups
  CREATE INDEX idx_voice_configs_lookup 
    ON coach_voice_configs(gender, mode, is_active);
  ```

- **Seed Data**:
  ```sql
  INSERT INTO coach_voice_configs (
    gender, mode, voice_name, tts_system_instruction,
    prompt_voice, prompt_personality, avatar_asset_key
  ) VALUES
    -- ROAST MODE
    ('female', 'roast', 'Aoede', 
     'Use a funny north european accent.',
     '"Roast me!!!" Use playful insults and biting humour (Brutal, memorable, transformative).',
     'Ruthless/Sharp Insight with north european wit',
     'female_roast'),
    
    ('male', 'roast', 'Sadachbia',
     'Use a funny russian accent.',
     '"Roast me!!!" Use playful insults and biting humour (Brutal, memorable, transformative).',
     'Ruthless/Sharp Insight with russian directness',
     'male_roast'),
    
    -- ZEN MODE
    ('female', 'zen', 'Gacrux',
     'Use a balanced soft british accent.',
     'Zen me. Calm, mindful coaching. Guide with patience and understanding. Acknowledge effort before suggesting improvements.',
     'Peaceful/Supportive Guide with gentle british composure',
     'female_zen'),
    
    ('male', 'zen', 'Algieba',
     'Use a balanced soft british accent.',
     'Zen me. Calm, mindful coaching. Guide with patience and understanding. Acknowledge effort before suggesting improvements.',
     'Peaceful/Supportive Guide with gentle british composure',
     'male_zen'),
    
    -- LOVEBOMB MODE
    ('female', 'lovebomb', 'Gacrux',
     'Use a funny and lovable Irish accent.',
     'Lovebomb me. Use warm and lovable positivity celebrating every win (memorable, transformative).',
     'Admirable Parent with warm and lovable positivity with musical lilt',
     'female_lovebomb'),
    
    ('male', 'lovebomb', 'Algieba',
     'Use a funny and lovable Irish accent.',
     'Lovebomb me. Use warm and lovable positivity celebrating every win (memorable, transformative).',
     'Admirable Parent with warm and lovable positivity with musical lilt',
     'male_lovebomb');
  ```

- **API**: `getVoiceConfig(gender, mode)` in `@my/api` (✅ implemented)
  - Location: `packages/api/src/services/voiceConfigService.ts`
  - Exported from `packages/api/src/index.ts`
  - Types: `CoachGender`, `CoachMode`, `CoachVoiceConfig`
  ```typescript
  interface CoachVoiceConfig {
    id: number
    gender: CoachGender
    mode: CoachMode
    
    // TTS
    voiceName: string
    ttsSystemInstruction: string
    
    // LLM Prompts
    promptVoice: string
    promptPersonality: string
    
    // Avatar
    avatarAssetKey: string
  }
  
  export async function getVoiceConfig(
    gender: CoachGender,
    mode: CoachMode
  ): Promise<CoachVoiceConfig | null>
  ```

- **Base Prompt Template** (in code, injects variables from config):
  ```typescript
  // supabase/functions/ai-analyze-video/prompts-local.ts
  export function buildPromptFromConfig(
    config: CoachVoiceConfig,
    duration: number
  ): string {
    return `
  **Role:** World-class Performance Coach (${config.promptPersonality}).
  **Voice:** ${config.promptVoice}
  **Context:** Video Duration: **${duration}s**
  
  **Task**
  Analyze the segment and provide **2 to 4** high-impact feedback points.
  ... rest of template structure ...
  `
  }
  ```

- **TTS Integration**:
  ```typescript
  // Pass ttsSystemInstruction to Gemini TTS
  const contentText = `${config.ttsSystemInstruction}\n\n${ssml}`
  ```

- **Edge Function Access**: Direct Supabase query in pipeline
- **Client-Side Caching**: TanStack Query with long staleTime (configs rarely change)
- **Avatar Asset Mapping** (bundled in app):
  ```typescript
  // packages/ui/src/assets/avatars/index.ts
  export const AVATAR_ASSETS = {
    female_roast: require('./coach_female_roast.webp'),
    male_roast: require('./coach_male_roast.webp'),
    female_zen: require('./coach_female_zen.webp'),
    male_zen: require('./coach_male_zen.webp'),
    female_lovebomb: require('./coach_female_lovebomb.webp'),
    male_lovebomb: require('./coach_male_lovebomb.webp'),
  } as const
  
  export type AvatarAssetKey = keyof typeof AVATAR_ASSETS
  ```

### Complete Configuration Reference

| Gender | Mode | Voice | TTS Accent | Personality |
|--------|------|-------|------------|-------------|
| Female | Roast | Aoede | North European | Ruthless/Sharp with north european wit |
| Male | Roast | Sadachbia | Russian | Ruthless/Sharp with russian directness |
| Female | Zen | Gacrux | Soft British | Peaceful/Supportive with british composure |
| Male | Zen | Algieba | Soft British | Peaceful/Supportive with british composure |
| Female | Lovebomb | Gacrux | Irish | Admirable Parent with warm and lovable positivity |
| Male | Lovebomb | Algieba | Irish | Admirable Parent with warm and lovable positivity |


### Current Implementation Status
- ✅ `coach_voice_configs` table created with schema, constraints, RLS, and index
- ✅ All 6 seed rows inserted (gender × mode combinations)
- ✅ API function `getVoiceConfig()` in `packages/api/src/services/voiceConfigService.ts`
- ✅ pgTAP tests created and passing (14 tests)
- ✅ Service tests created and passing (6 tests)
- ✅ Types exported from `packages/api/src/index.ts`
- ✅ Avatar asset mapping files (`packages/ui/src/assets/avatars.ts` and `avatars/index.ts`) with all 6 assets
- ✅ Gemini TTS already supports `voiceName` parameter
- ✅ TTS system instruction pattern exists (env var based)

---

## US-VT-10: SSML Generation Mode Injection
Status: ✅ Implemented
Priority: High
Dependencies: US-VT-09 (Voice Config Table)
Implemented: 2026-01-09

### User Story
As a user, when SSML is generated for my feedback audio, I want the speech formatting (pauses, emphasis, prosody) to match my selected coaching mode so the delivery style feels consistent with my preferences.

### Requirements
- ✅ Add `ssml_system_instruction` column to `coach_voice_configs` table
- ✅ Seed mode-appropriate SSML instructions for all 6 combinations
- ✅ Inject instruction into SSML generation pipeline
- ✅ Fallback to default (roast) if config unavailable

### Acceptance Criteria
- ✅ Given I have selected Female + Zen preferences
- ✅ When SSML is generated for my feedback
- ✅ Then the LLM uses `ssml_system_instruction` from config table
- ✅ And the SSML includes calm pacing with gentle pauses (not comedic timing)
- ✅ Given I have selected Male + Lovebomb preferences
- ✅ Then the SSML includes warm emphasis with enthusiastic prosody

### Technical Notes
- **Migration**: `supabase/migrations/20260109010923_add_ssml_system_instruction.sql` (✅ created and applied)
- **Column Addition**:
  ```sql
  ALTER TABLE public.coach_voice_configs
    ADD COLUMN ssml_system_instruction TEXT NOT NULL DEFAULT '';
  
  -- Seed values for each mode
  UPDATE public.coach_voice_configs SET ssml_system_instruction = 
    'You are a sarcastic comedian with sharp wit. Format the text with comedic timing: use punchy <break> pauses before punchlines, strong <emphasis> on roast words, and varied <prosody> for sarcastic inflection.'
    WHERE mode = 'roast';
  
  UPDATE public.coach_voice_configs SET ssml_system_instruction = 
    'You are a calm meditation guide. Format the text with measured pacing: use gentle <break> pauses between thoughts, soft <emphasis level=''reduced''>, and steady <prosody rate=''slow''> for peaceful delivery.'
    WHERE mode = 'zen';
  
  UPDATE public.coach_voice_configs SET ssml_system_instruction = 
    'You are an enthusiastic supportive parent. Format the text with warm emphasis: use celebratory <emphasis level=''strong''> on positive words, excited <prosody rate=''medium'' pitch=''+10%''>, and brief <break> pauses for impact.'
    WHERE mode = 'lovebomb';
  ```

- **Type Updates**:
  - `packages/api/src/services/voiceConfigService.ts`: Added `ssmlSystemInstruction` to `CoachVoiceConfig` (✅)
  - `supabase/functions/_shared/types/voice-config.ts`: Added to `VoiceConfigPromptParams` (✅)
  - `supabase/functions/_shared/db/voiceConfig.ts`: Added to Edge Functions `CoachVoiceConfig` (✅)

- **SSMLService Integration** (✅):
  ```typescript
  // supabase/functions/_shared/services/speech/SSMLService.ts
  export interface SSMLContext {
    analysisResult: VideoAnalysisResult
    customParams?: {
      voice?: string
      speed?: number
      pitch?: number
      ssmlSystemInstruction?: string  // NEW
    }
  }
  
  const ssmlPrompt = getSSMLGenerationPrompt({
    feedback_text: feedbackText,
    system_instruction: context.customParams?.ssmlSystemInstruction
  })
  ```

- **Worker Integration** (✅):
  - `ssmlWorker.ts`: Fetches voice config from analysis_jobs snapshot or user preferences
  - Passes `ssmlSystemInstruction` to SSML generation via `customParams`
  - Graceful fallback to default if config lookup fails

- **handleTTS Integration** (✅):
  - Both per-feedback and full-analysis paths updated
  - Fetches `voiceConfig.ssmlSystemInstruction` alongside `voiceName` and `ttsSystemInstruction`
  - Passes to SSMLService in `customParams`

- **Prompt Deprecation** (✅):
  - `SSML_SYSTEM_INSTRUCTION_DEFAULT` marked as deprecated in `prompts-local.ts`
  - Kept only for backward compatibility/fallback
  - All new SSML generation uses database-driven instructions

### Distinction from US-VT-03 (TTS Voice Injection)
- **US-VT-03**: Controls WHAT voice speaks (Aoede vs Gacrux) and accent (tts_system_instruction)
- **US-VT-10**: Controls HOW the text is formatted for speech (pauses, emphasis, prosody via SSML)

### SSML Instructions by Mode

| Mode | SSML System Instruction |
|------|------------------------|
| Roast | "You are a sarcastic comedian with sharp wit. Format the text with comedic timing: use punchy `<break>` pauses before punchlines, strong `<emphasis>` on roast words, and varied `<prosody>` for sarcastic inflection." |
| Zen | "You are a calm meditation guide. Format the text with measured pacing: use gentle `<break>` pauses between thoughts, soft `<emphasis level='reduced'>`, and steady `<prosody rate='slow'>` for peaceful delivery." |
| Lovebomb | "You are an enthusiastic supportive parent. Format the text with warm emphasis: use celebratory `<emphasis level='strong'>` on positive words, excited `<prosody rate='medium' pitch='+10%'>`, and brief `<break>` pauses for impact." |

### Implementation Summary
**Files Created:**
- `supabase/migrations/20260109010923_add_ssml_system_instruction.sql`: Migration adding column and seed data
- `supabase/tests/database/10_voice_config_ssml.test.sql`: pgTAP tests (8 tests)

**Files Modified:**
- `packages/api/src/services/voiceConfigService.ts`: Added `ssmlSystemInstruction` to interface and mapping
- `packages/api/src/services/voiceConfigService.test.ts`: Updated tests with new field
- `supabase/functions/_shared/types/voice-config.ts`: Added to `VoiceConfigPromptParams`
- `supabase/functions/_shared/db/voiceConfig.ts`: Added to `CoachVoiceConfig` interface and mapping
- `supabase/functions/_shared/services/speech/SSMLService.ts`: Extended `SSMLContext` with `ssmlSystemInstruction`
- `supabase/functions/ai-analyze-video/workers/ssmlWorker.ts`: Fetch and inject voice config
- `supabase/functions/ai-analyze-video/routes/handleTTS.ts`: Pass `ssmlSystemInstruction` in both TTS paths
- `supabase/functions/ai-analyze-video/prompts-local.ts`: Deprecated hardcoded constants

### Current Implementation Status
- ✅ Migration created and adds column with NOT NULL constraint
- ✅ All 6 mode combinations seeded with appropriate SSML instructions
- ✅ Types updated across client and Edge Functions
- ✅ SSMLService accepts custom instruction via `customParams`
- ✅ ssmlWorker fetches from analysis snapshot or user preferences
- ✅ handleTTS passes instruction in both per-feedback and full-analysis paths
- ✅ Hardcoded defaults deprecated with fallback behavior
- ✅ pgTAP tests: 8 tests for column existence, type, and seed data
- ✅ Vitest tests: Updated with `ssmlSystemInstruction` field in mock data

---

## Dependency Graph

```
US-VT-09 (Voice Config Table) ─────────────────────────────────┐
    │                                                          │
    ├── US-VT-10 (SSML Mode Injection) ← NEW                  │
    │                                                          │
    └── US-VT-00 (Data Model)                                  │
            ├── US-VT-01 (First Login Screen)                  │
            │       └── US-VT-05 (Settings Personalization)    │
            ├── US-VT-02 (LLM Mode Injection)                  │
            │       └── US-VT-07 (Prompt Templates)            │
            ├── US-VT-03 (TTS Voice Injection) ────────────────┘
            ├── US-VT-04 (Avatar Display)
            │       └── US-VT-06 (History Avatar)
            └── US-VT-08 (Preferences Store)
```

---

## Implementation Order

1. **Phase 1 - Foundation** (P0-Critical)
   - US-VT-09: Voice Config Lookup Table (schema + seed data)
   - US-VT-00: Data Model (profiles + analysis_jobs extension)
   - US-VT-08: Voice Preferences Store
   - US-VT-07: Prompt Templates

2. **Phase 2 - Backend Integration** (P0-High)
   - US-VT-02: LLM Mode Injection
   - US-VT-03: TTS Voice Injection (uses config table for voice lookup)
   - US-VT-10: SSML Mode Injection (uses config table for SSML formatting)

3. **Phase 3 - User Interface** (P0-High)
   - US-VT-01: First Login Screen
   - US-VT-05: Settings Personalization

4. **Phase 4 - Visual Polish** (P0-Medium)
   - US-VT-04: Avatar Mode Display (uses config table for asset lookup)
   - US-VT-06: History Avatar Display (uses snapshot from analysis_jobs)

---

## Execution Commands

[3 tools called]

Got it. Here are the execution commands for all Voice of Tone user stories:

## Execution Commands

### Phase 1 - Foundation (P0-Critical)

```
@docs/spec/user_stories/P0/05_voice_of_tone.md:684-890
/implement US-VT-09: Voice Config Lookup Table
```

```
@docs/spec/user_stories/P0/05_voice_of_tone.md:5-81
/implement US-VT-00: Voice Preferences Data Model
```

```
@docs/spec/user_stories/P0/05_voice_of_tone.md:617-681
/implement US-VT-08: Voice Preferences Store
```

```
@docs/spec/user_stories/P0/05_voice_of_tone.md:502-614
/implement US-VT-07: Base Prompt Template with Config Injection
```

### Phase 2 - Backend Integration (P0-High)

```
@docs/spec/user_stories/P0/05_voice_of_tone.md:156-236
/implement US-VT-02: LLM Feedback Mode Injection
```

```
@docs/spec/user_stories/P0/05_voice_of_tone.md:239-297
/implement US-VT-03: TTS Voice Gender Injection
```

### Phase 3 - User Interface (P0-High)

```
@docs/spec/user_stories/P0/05_voice_of_tone.md:84-153
/implement US-VT-01: First Login Voice Selection Screen
```

```
@docs/spec/user_stories/P0/05_voice_of_tone.md:368-441
/implement US-VT-05: Settings Personalization - Voice Preferences
```

### Phase 4 - Visual Polish (P0-Medium)

```
@docs/spec/user_stories/P0/05_voice_of_tone.md:300-365
/implement US-VT-04: Coach Avatar Mode Display
```

```
@docs/spec/user_stories/P0/05_voice_of_tone.md:444-499
/implement US-VT-06: History Mode - Historical Avatar Display
```

---

## Summary

| Story ID | Title | Priority | Status |
|----------|-------|----------|--------|
| US-VT-09 | Coach Voice Configuration Table | Critical | ✅ Implemented |
| US-VT-00 | Voice Preferences Data Model | Critical | ✅ Implemented |
| US-VT-08 | Voice Preferences Store | High | ✅ Implemented |
| US-VT-01 | First Login Voice Selection Screen | High | ✅ Implemented |
| US-VT-02 | LLM Feedback Mode Injection | High | ✅ Implemented |
| US-VT-03 | TTS Voice Gender Injection | High | ✅ Implemented |
| US-VT-04 | Coach Avatar Mode Display | Medium | ✅ Implemented |
| US-VT-05 | Settings Personalization - Voice Preferences | High | ✅ Implemented |
| US-VT-06 | History Mode - Historical Avatar Display | Medium | ✅ Implemented |
| US-VT-07 | Base Prompt Template with Config Injection | High | ✅ Implemented |
| US-VT-10 | SSML Generation Mode Injection | High | ✅ Implemented |

