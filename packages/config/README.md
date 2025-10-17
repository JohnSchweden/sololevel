# @my/config - Tamagui Configuration

Central configuration for cross-platform Tamagui theming, including fonts, animations, and color themes.

## Available Color Tokens

### Semantic Colors (Context-Aware)
- `$background` - Main background color
- `$backgroundHover` - Interactive background hover state
- `$text` - Primary text color
- `$textSecondary` - Secondary/muted text
- `$primary` - Brand primary color
- `$borderColor` - Default border color

### Grayscale (`$gray1` - `$gray12`)
Neutral tones that adapt to light/dark theme:
- `$gray1-$gray3` - Very light, subtle backgrounds
- `$gray4-$gray6` - Light backgrounds, borders
- `$gray7-$gray9` - Medium contrast, disabled states
- `$gray10-$gray12` - High contrast text, dark elements

### Adaptive Color Scale (`$color1` - `$color12`)
Theme-adaptive colors that respond to your active theme:
- `$color1-$color3` - Background tones
- `$color4-$color6` - Interactive backgrounds
- `$color7-$color9` - Borders and separators
- `$color10-$color12` - Text and high contrast

### Semantic Color Scales

Each color has a 1-12 scale that works in both light and dark themes:

#### Red (Errors, Destructive Actions, Danger)
```tsx
backgroundColor="$red4"  // Light red background
color="$red11"           // Dark red text (high contrast)
borderColor="$red6"      // Medium red border
```

#### Blue (Information, Primary Actions, Links)
```tsx
backgroundColor="$blue4" // Light blue background
color="$blue11"          // Dark blue text
borderColor="$blue6"     // Medium blue border
```

#### Green (Success, Positive Actions, Confirmation)
```tsx
backgroundColor="$green4" // Light green background
color="$green11"          // Dark green text
borderColor="$green6"     // Medium green border
```

#### Orange (Warnings, Alerts, Highlights)
```tsx
backgroundColor="$orange4" // Light orange background
color="$orange11"          // Dark orange text
borderColor="$orange6"     // Medium orange border
```

#### Yellow (Caution, Attention, Notes)
```tsx
backgroundColor="$yellow4" // Light yellow background
color="$yellow11"          // Dark yellow text
borderColor="$yellow6"     // Medium yellow border
```

#### Purple (Premium, Creative, Accent)
```tsx
backgroundColor="$purple4" // Light purple background
color="$purple11"          // Dark purple text
borderColor="$purple6"     // Medium purple border
```

#### Violet (Contrast to Purple, Secondary Actions)
```tsx
backgroundColor="$violet4" // Light violet background
color="$violet11"          // Dark violet text
borderColor="$violet6"     // Medium violet border
```

#### Pink (Playful, Love, Special)
```tsx
backgroundColor="$pink4" // Light pink background
color="$pink11"          // Dark pink text
borderColor="$pink6"     // Medium pink border
```

#### Teal (Fresh, Modern, Balance)
```tsx
backgroundColor="$teal4" // Light teal background
color="$teal11"          // Dark teal text
borderColor="$teal6"     // Medium teal border
```

#### Cyan (Cool, Calm, Information)
```tsx
backgroundColor="$cyan4" // Light cyan background
color="$cyan11"          // Dark cyan text
borderColor="$cyan6"     // Medium cyan border
```

#### Indigo (Deep, Professional, Trust)
```tsx
backgroundColor="$indigo4" // Light indigo background
color="$indigo11"          // Dark indigo text
borderColor="$indigo6"     // Medium indigo border
```

## Usage Guidelines

### Color Scale Pattern
- **1-3**: Very subtle backgrounds
- **4-6**: Component backgrounds and light borders (use these most often)
- **7-9**: Interactive states, medium borders
- **10-12**: Text and icons (use for high contrast)

### Best Practices

✅ **DO:**
```tsx
// Use semantic colors for common patterns
<YStack backgroundColor="$background" borderColor="$borderColor">
  <Text color="$text">Primary text</Text>
  <Text color="$textSecondary">Secondary text</Text>
</YStack>

// Use status colors for semantic meaning
<Badge backgroundColor="$red4" color="$red11">Error</Badge>
<Badge backgroundColor="$green4" color="$green11">Success</Badge>

// Use grayscale for neutral elements
<Card backgroundColor="$gray2" borderColor="$gray6" />
```

❌ **DON'T:**
```tsx
// Don't hardcode hex colors
<YStack backgroundColor="#FF0000" /> // ❌

// Don't use random scale numbers without meaning
<Text color="$red7" /> // ❌ (too low contrast for text)

// Don't mix color purposes
<Button backgroundColor="$green4" color="$red11" /> // ❌ Confusing
```

### Light/Dark Theme Support

All colors automatically adapt to the active theme:
- **Light theme**: `$red4` = light red background
- **Dark theme**: `$red4` = dark red background (darker variant)

No need for conditional logic - Tamagui handles it!

## Spacing Tokens

Numeric scale (`$0` - `$12`):
- `$1` = 5px
- `$2` = 10px
- `$3` = 15px
- `$4` = 20px
- `$6` = 30px
- `$8` = 40px

## Border Radius Tokens

- `$2` = ~4px (small, badges, pills)
- `$3` = ~8px (medium, buttons, inputs)
- `$5` = ~12-16px (large, cards, modals)

## Typography Tokens

Font sizes: `$1` through `$10`
- `$1` = 11px (very small)
- `$2` = 12px (caption)
- `$3` = 14px (body small)
- `$4` = 16px (body)
- `$5` = 18px (subheading)
- `$6` = 20px (heading)
- `$8` = 24px (large heading)
- `$10` = 32px (display)

## Animations

Available animation presets:
- `'100ms'` - Quick transitions
- `'quick'` - Fast spring animations
- `'medium'` - Standard animations
- `'slow'` - Gentle, smooth animations
- `'bouncy'` - Playful spring effect
- `'lazy'` - Relaxed movement
- `'tooltip'` - Optimized for tooltips

## Implementation Details

This package extends `@tamagui/config/v4` defaultConfig with:
- Custom status color scales (red, blue, green, orange) for light/dark themes
- Inter font family for body text
- Josefin Sans for headings
- React Native reanimated animations

Color scales follow Radix UI color system for accessibility and consistency.

