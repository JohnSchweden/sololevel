# Enhanced Wireframe-to-Screen Workflow

## 🎯 Integrated Planner Mode + Mobile-First Development

### Enhanced Planner Mode Prompt with Mobile Focus

```
Mobile-First Wireframe Analysis + Task Generation

I need to implement a mobile-first [feature/screen/component] based on this wireframe [attach wireframe image].

Please follow this enhanced workflow:

1. **Wireframe Analysis Phase**:
   - Analyze visual elements and map to Tamagui components
   - Identify mobile-specific requirements (touch targets, gestures, safe areas)
   - Map responsive breakpoints and cross-platform considerations
   - Document accessibility requirements

2. **Technical Architecture Phase**:
   - Map data requirements to Supabase schema
   - Plan state management (Zustand + TanStack Query)
   - Identify navigation patterns (Expo Router)
   - Plan testing strategy across platforms

3. **Ask 4-6 clarifying questions** based on analysis

4. **Generate comprehensive task list** using:
   - docs/tasks/[feature-name].md following task-lists.mdc format
   - docs/templates/screen-implementation-enhanced.md template
   - Apply mobile-screen-patterns.mdc and wireframe-to-code.mdc rules

The task list should include:
- Mobile-first responsive design tasks
- Cross-platform implementation tasks [Web], [Native], [Both]
- Touch interaction and gesture requirements
- Accessibility compliance tasks
- Performance optimization for mobile
- Testing pipeline with mobile-specific scenarios

After creating the comprehensive plan and task list, ask for approval before implementing.
```

## 📱 Mobile-First Wireframe Analysis Framework

### Step 1: Visual Element Mapping with Mobile Context
```
Analyze this wireframe with mobile-first principles:

**Touch Interaction Elements:**
- Primary buttons → <Button size="$5" minHeight={44}> (44px touch targets)
- Secondary actions → <Button variant="ghost" size="$3" minHeight={44}>
- Form inputs → <Input size="$4" minHeight={44}>
- List items → <Pressable minHeight={44}>

**Layout Structure (Mobile-First):**
- Header → Fixed height ~60px with safe area
- Content → ScrollView with proper insets
- Navigation → Bottom tabs (mobile) vs sidebar (tablet+)
- Modals → Full-screen on mobile, centered on larger screens

**Component Mapping:**
- Cards → <YStack backgroundColor="$background" borderRadius="$4" padding="$4">
- Lists → FlashList for performance
- Forms → KeyboardAvoidingView wrapper
- Images → Platform-optimized Image components
- Navigation → Expo Router Link components

**Responsive Considerations:**
- Breakpoint behavior: xs (mobile), sm (tablet), md+ (desktop)
- Touch vs hover states
- One-handed usage patterns
- Safe area handling for notched devices

For each element, specify:
- Tamagui component with mobile-optimized props
- Touch target sizes and spacing
- Platform-specific adaptations
- Data binding and state requirements
```

### Step 2: Enhanced Technical Requirements Analysis
```
Based on wireframe analysis, determine:

**Data Architecture:**
- Supabase tables needed with RLS policies
- Real-time subscriptions requirements  
- Image storage and optimization needs
- Offline-first data sync considerations

**State Management Strategy:**
- Global state (Zustand) vs server state (TanStack Query)
- Form state management with react-hook-form
- Loading/error state patterns
- Optimistic updates for mobile UX

**Performance Requirements:**
- Bundle size targets for mobile
- Image optimization and lazy loading
- Virtual list implementation for large datasets
- Memory management for image-heavy screens

**Platform Integration:**
- Native module requirements (camera, notifications)
- Deep linking and URL schemes
- Platform-specific UI adaptations
- Cross-platform navigation patterns
```

## 🏗️ Enhanced Implementation Workflow

### Phase 1: Foundation + Mobile Optimization
```
Implement mobile-first foundation following these rules:
- Apply mobile-screen-patterns.mdc for touch optimization
- Use wireframe-to-code.mdc for systematic component creation
- Follow ui-styling-tamagui.mdc for responsive design
- Reference codegen-templates.mdc for mobile templates

Tasks:
1. Setup mobile-optimized component structure with safe areas
2. Implement responsive layout with mobile breakpoints
3. Add touch-optimized interactions with proper feedback
4. Create Storybook stories for mobile viewport testing
5. Apply accessibility patterns from wireframe requirements

Update task list progress as you complete each item.
```

### Phase 2: Cross-Platform Integration
```
Build platform-specific implementations:
- Web: Next.js pages with hover states and keyboard navigation
- Native: Expo Router screens with gesture support and native APIs
- Shared: Business logic in packages/app/features

Quality gates:
1. Visual parity between web and native
2. Interaction parity (touch/click, gestures/keyboard)
3. Performance parity (load times, animations)
4. Feature parity with platform-appropriate adaptations

Test on actual devices, not just simulators.
```

### Phase 3: Mobile-Specific Quality Assurance
```
Mobile-focused testing and optimization:

**Performance Testing:**
- Bundle size analysis for mobile networks
- Render performance profiling on lower-end devices
- Memory usage testing for image-heavy screens
- Network failure handling and offline functionality

**Device Testing:**
- iOS: Various screen sizes, notched devices, iPad
- Android: Different manufacturers, Android versions
- Accessibility: VoiceOver, TalkBack, keyboard navigation

**Quality Metrics:**
- Touch target minimum 44px verified
- Loading states under 3G network conditions
- Error states with actionable recovery options
- Cross-platform visual consistency validated
```

## 🎨 Wireframe Analysis Patterns

### Visual Hierarchy Mapping
```typescript
/*
WIREFRAME VISUAL HIERARCHY → TAMAGUI IMPLEMENTATION:

Header (Fixed):
- Navigation: <XStack height={60} padding="$4">
- Title: <H1 fontSize="$6" fontWeight="600">
- Actions: <Button variant="ghost" size="$3" minHeight={44}>

Content (Scrollable):
- Section headers: <H2 fontSize="$5" marginVertical="$3">
- Body text: <Text fontSize="$4" lineHeight="$2">
- Captions: <Text fontSize="$3" color="$color11">

Interactive Elements:
- Primary CTA: <Button size="$5" minHeight={44}>
- Secondary actions: <Button variant="outlined" size="$4" minHeight={44}>
- Form inputs: <Input size="$4" minHeight={44}>
- Touch areas: <Pressable minHeight={44} minWidth={44}>
*/
```

### Mobile Layout Patterns
```typescript
// ✅ Mobile-first responsive layout from wireframe
export function WireframeImplementation() {
  const insets = useSafeAreaInsets();
  const media = useMedia();
  
  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Fixed Header with safe area */}
      <XStack 
        paddingTop={insets.top}
        height={60 + insets.top}
        paddingHorizontal="$4"
        alignItems="center"
        justifyContent="space-between"
        borderBottomWidth={1}
        borderBottomColor="$borderColor"
      >
        {/* Header content mapped from wireframe */}
      </XStack>
      
      {/* Responsive content area */}
      <ScrollView 
        flex={1}
        contentContainerStyle={{
          padding: media.xs ? 16 : 24,
          paddingBottom: insets.bottom + 16
        }}
      >
        {/* Content mapped from wireframe sections */}
      </ScrollView>
      
      {/* Conditional navigation based on screen size */}
      {media.xs && (
        <XStack 
          height={80 + insets.bottom}
          paddingBottom={insets.bottom}
          backgroundColor="$backgroundSubtle"
        >
          {/* Mobile bottom navigation */}
        </XStack>
      )}
    </YStack>
  );
}
```

## 🔄 Task List Integration with Mobile Focus

### Enhanced Task Breakdown Pattern
```markdown
# [ScreenName] Mobile-First Implementation

## Mobile-Specific Analysis
- [x] Wireframe analyzed with mobile-first principles [Both]
- [x] Touch targets and interaction patterns identified [Both]
- [x] Safe area and responsive breakpoints mapped [Both]
- [x] Cross-platform differences documented [Both]

## Phase 1: Mobile Foundation [Both]
- [ ] Setup safe area handling with react-native-safe-area-context [Both] [S]
- [ ] Implement mobile-first responsive layout structure [Both] [M]
- [ ] Add touch-optimized button and input components [Both] [M]
- [ ] Create mobile navigation patterns (header + bottom tabs) [Both] [M]
- [ ] Add keyboard avoidance for forms [Both] [S]

## Phase 2: Platform Optimization
- [ ] Add iOS-specific safe area and gesture handling [Native] [M]
- [ ] Implement Android-specific Material Design adaptations [Native] [M]
- [ ] Add web-specific hover states and keyboard navigation [Web] [S]
- [ ] Optimize bundle splitting for mobile network conditions [Both] [M]

## Phase 3: Mobile Testing Pipeline
- [ ] Unit tests with mobile viewport simulation [Both] [M]
- [ ] E2E tests on actual mobile devices [Both] [L]
- [ ] Performance testing on 3G network conditions [Both] [M]
- [ ] Accessibility testing with screen readers [Both] [M]

## Mobile Quality Gates
- [ ] Touch targets meet 44px minimum requirement
- [ ] Safe area handling tested on notched devices
- [ ] Performance acceptable on mid-range Android devices
- [ ] One-handed usage patterns validated
- [ ] Cross-platform visual parity confirmed
```

## 📊 Quality Metrics Dashboard

Track these mobile-specific metrics:
- **Touch Target Compliance**: 100% of interactive elements ≥44px
- **Performance Budget**: Bundle size <2MB for mobile-first load
- **Cross-Platform Parity**: Visual and functional consistency score
- **Accessibility Score**: WCAG 2.2 AA compliance rating
- **Device Coverage**: Testing across iOS/Android device matrix
- **Network Resilience**: Functionality under poor network conditions

## 🚀 Implementation Commands

### Initial Mobile-First Planning
```bash
# Use this command for wireframe analysis:
"Based on this mobile wireframe [attach image], use enhanced Planner Mode to:
1. Apply mobile-screen-patterns.mdc for touch optimization analysis
2. Use wireframe-to-code.mdc for systematic component mapping
3. Follow screen-implementation-enhanced.md template for task generation
4. Plan cross-platform implementation with mobile-first principles
5. Generate tasks in docs/tasks/[feature].md with mobile testing pipeline
6. Ask clarifying questions about mobile-specific requirements"
```

### Phase Implementation with Mobile Focus
```bash
# Use this for implementation phases:
"Implement Phase [N] tasks from docs/tasks/[feature].md with mobile-first approach:
- Follow mobile-screen-patterns.mdc for touch interactions
- Apply ui-styling-tamagui.mdc for responsive design
- Use codegen-templates.mdc mobile templates for scaffolding
- Test on mobile viewport sizes (375px, 414px, 390px widths)
- Update task status with mobile-specific validation results
- Ask before moving to next phase"
```

### Mobile Quality Validation
```bash
# Use this for mobile-focused quality checks:
"Validate mobile implementation quality:
1. Test touch targets meet 44px minimum requirement
2. Verify safe area handling on notched devices
3. Check performance on mid-range Android device simulation
4. Validate one-handed usage patterns
5. Confirm cross-platform visual parity
6. Run accessibility audit with mobile screen readers
7. Update task list with validation results"
```

This enhanced workflow ensures every screen is built with mobile-first principles, maintains cross-platform consistency, and meets the quality standards defined in your monorepo rules.
