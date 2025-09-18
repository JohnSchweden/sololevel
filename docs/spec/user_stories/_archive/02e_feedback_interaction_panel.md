# US-FB-06: Interact with Feedback Timeline via Feedback Panel
Status: Pending
Priority: High
Dependencies: US-FB-05

### User Story
As a user, I want to view and interact with a detailed feedback timeline in a feedback panel so I can correlate specific comments with moments in the video.

### Requirements
- A draggable feedback panel that extends to 40% of the screen height.
- As the panel slides up, the video player resizes, adding letterboxing if necessary.
- The feedback panel contains a tabbed interface for "Feedback", "Insights", and "Comments".
- The "Feedback" tab shows a scrollable list of timed AI comments.
- The current feedback item is visually highlighted (karaoke-style).
- A thin progress bar with a draggable knob is positioned above the tabs for precise video scrubbing.
- The tab navigation becomes sticky on scroll.

### Acceptance Criteria
- Given I am on the video playback screen,
- When I slide the feedback panel handle up,
- Then the panel expands and the video resizes to fit the remaining space.
- And I can see a tabbed view with a timeline of feedback.
- And scrolling the feedback list highlights the active comment synchronized with the video.
- And dragging the progress bar knob seeks the video to the corresponding time.
- And the tabs ("Feedback", "Insights", "Comments") remain visible at the top of the panel when I scroll the content.

### Technical Notes
- **UI**: Use a feedback panel component, potentially from a library like `@gorhom/bottom-sheet` adapted for Tamagui, or a custom implementation. Tabs can be built with Tamagui's `Tabs`.
- **Layout**: The screen layout will need to dynamically adjust the video player's height based on the feedback panel's position.
- **State Management**: A Zustand store (`feedbackStore`) will hold the feedback items and the currently active item's index. The player's current time will be synchronized with this store.
- **Performance**: Virtualize the feedback list to ensure smooth scrolling with a large number of comments.
