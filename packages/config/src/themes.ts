/**
 * Tamagui Theme Configuration
 *
 * Extends defaultConfig themes with custom color scales for red, blue, green, orange.
 * These enable using $red4, $blue4, $green4, $orange4, etc. in components.
 *
 * COLOR SYSTEM GUIDE:
 * ===================
 * Use Tamagui's built-in $color1-12 scale for neutral colors (replaces gray):
 *
 * $color1-2:   Backgrounds (lightest)
 * $color3-5:   Component backgrounds
 * $color6-8:   Borders and separators
 * $color9:     Primary/solid colors (use for primary brand color)
 * $color10-11: Hover states and secondary text
 * $color12:    High contrast text (primary text)
 *
 * MIGRATION GUIDE:
 * ================
 * Old Token          → New Token        Purpose
 * -----------------  ----------------   ---------------------------
 * $text              → $color12         Primary text (high contrast)
 * $textSecondary     → $color11         Secondary text
 * $gray1-2           → $color1-2        Lightest backgrounds
 * $gray3-5           → $color3-5        Component backgrounds
 * $gray6-8           → $color6-8        Borders/separators
 * $gray9             → $color9          Solid colors
 * $gray10-12         → $color10-12      Text/hover states
 * $primary           → $color9          Primary brand color
 * $backgroundTransparent → transparent  Transparent backgrounds
 */

import { defaultConfig } from '@tamagui/config/v4'

// Extract base themes from defaultConfig
const baseThemes = defaultConfig.themes

// Define color scales for status/semantic colors
// Using Radix UI color scales for consistency

const redScale = {
  red1: 'hsl(0, 100%, 99%)',
  red2: 'hsl(0, 100%, 98%)',
  red3: 'hsl(0, 100%, 96%)',
  red4: 'hsl(0, 93%, 94%)',
  red5: 'hsl(0, 86%, 91%)',
  red6: 'hsl(0, 79%, 86%)',
  red7: 'hsl(0, 72%, 80%)',
  red8: 'hsl(0, 70%, 72%)',
  red9: 'hsl(0, 78%, 60%)',
  red10: 'hsl(0, 74%, 54%)',
  red11: 'hsl(0, 72%, 47%)',
  red12: 'hsl(0, 74%, 10%)',
}

const blueScale = {
  blue1: 'hsl(206, 100%, 99%)',
  blue2: 'hsl(210, 100%, 98%)',
  blue3: 'hsl(209, 100%, 96%)',
  blue4: 'hsl(210, 98%, 94%)',
  blue5: 'hsl(209, 95%, 90%)',
  blue6: 'hsl(209, 81%, 84%)',
  blue7: 'hsl(208, 77%, 76%)',
  blue8: 'hsl(206, 81%, 65%)',
  blue9: 'hsl(206, 100%, 50%)',
  blue10: 'hsl(208, 100%, 47%)',
  blue11: 'hsl(211, 100%, 43%)',
  blue12: 'hsl(211, 100%, 15%)',
}

const greenScale = {
  green1: 'hsl(136, 50%, 99%)',
  green2: 'hsl(138, 62%, 97%)',
  green3: 'hsl(139, 55%, 94%)',
  green4: 'hsl(140, 49%, 91%)',
  green5: 'hsl(141, 44%, 86%)',
  green6: 'hsl(142, 39%, 80%)',
  green7: 'hsl(144, 36%, 71%)',
  green8: 'hsl(146, 38%, 59%)',
  green9: 'hsl(151, 55%, 42%)',
  green10: 'hsl(152, 57%, 37%)',
  green11: 'hsl(153, 67%, 28%)',
  green12: 'hsl(155, 40%, 14%)',
}

const orangeScale = {
  orange1: 'hsl(24, 100%, 99%)',
  orange2: 'hsl(24, 100%, 98%)',
  orange3: 'hsl(24, 100%, 95%)',
  orange4: 'hsl(25, 100%, 92%)',
  orange5: 'hsl(25, 100%, 88%)',
  orange6: 'hsl(25, 100%, 82%)',
  orange7: 'hsl(24, 100%, 75%)',
  orange8: 'hsl(24, 94%, 64%)',
  orange9: 'hsl(24, 94%, 50%)',
  orange10: 'hsl(24, 100%, 47%)',
  orange11: 'hsl(24, 100%, 37%)',
  orange12: 'hsl(15, 60%, 17%)',
}

const yellowScale = {
  yellow1: 'hsl(60, 54%, 99%)',
  yellow2: 'hsl(52, 100%, 98%)',
  yellow3: 'hsl(55, 100%, 95%)',
  yellow4: 'hsl(54, 100%, 91%)',
  yellow5: 'hsl(52, 98%, 86%)',
  yellow6: 'hsl(50, 93%, 80%)',
  yellow7: 'hsl(48, 89%, 72%)',
  yellow8: 'hsl(45, 86%, 62%)',
  yellow9: 'hsl(53, 92%, 50%)',
  yellow10: 'hsl(50, 100%, 48%)',
  yellow11: 'hsl(42, 100%, 29%)',
  yellow12: 'hsl(40, 55%, 14%)',
}

const purpleScale = {
  purple1: 'hsl(280, 65%, 99%)',
  purple2: 'hsl(276, 100%, 99%)',
  purple3: 'hsl(274, 78%, 97%)',
  purple4: 'hsl(273, 70%, 94%)',
  purple5: 'hsl(272, 63%, 90%)',
  purple6: 'hsl(272, 57%, 85%)',
  purple7: 'hsl(272, 51%, 77%)',
  purple8: 'hsl(272, 48%, 68%)',
  purple9: 'hsl(272, 51%, 54%)',
  purple10: 'hsl(273, 55%, 50%)',
  purple11: 'hsl(275, 80%, 44%)',
  purple12: 'hsl(275, 100%, 16%)',
}

const violetScale = {
  violet1: 'hsl(255, 65%, 99%)',
  violet2: 'hsl(252, 100%, 99%)',
  violet3: 'hsl(252, 96%, 98%)',
  violet4: 'hsl(252, 91%, 96%)',
  violet5: 'hsl(252, 85%, 93%)',
  violet6: 'hsl(252, 78%, 89%)',
  violet7: 'hsl(252, 72%, 83%)',
  violet8: 'hsl(252, 68%, 76%)',
  violet9: 'hsl(252, 56%, 57%)',
  violet10: 'hsl(251, 50%, 53%)',
  violet11: 'hsl(250, 43%, 48%)',
  violet12: 'hsl(254, 60%, 18%)',
}

const pinkScale = {
  pink1: 'hsl(322, 100%, 99%)',
  pink2: 'hsl(323, 100%, 98%)',
  pink3: 'hsl(323, 86%, 96%)',
  pink4: 'hsl(323, 78%, 94%)',
  pink5: 'hsl(323, 72%, 90%)',
  pink6: 'hsl(323, 66%, 86%)',
  pink7: 'hsl(323, 62%, 80%)',
  pink8: 'hsl(323, 60%, 72%)',
  pink9: 'hsl(322, 65%, 54%)',
  pink10: 'hsl(322, 63%, 49%)',
  pink11: 'hsl(322, 65%, 43%)',
  pink12: 'hsl(320, 70%, 13%)',
}

const tealScale = {
  teal1: 'hsl(165, 60%, 99%)',
  teal2: 'hsl(169, 64%, 97%)',
  teal3: 'hsl(169, 60%, 94%)',
  teal4: 'hsl(169, 53%, 91%)',
  teal5: 'hsl(170, 47%, 86%)',
  teal6: 'hsl(170, 42%, 80%)',
  teal7: 'hsl(170, 39%, 72%)',
  teal8: 'hsl(172, 41%, 61%)',
  teal9: 'hsl(173, 80%, 36%)',
  teal10: 'hsl(173, 83%, 32%)',
  teal11: 'hsl(174, 90%, 25%)',
  teal12: 'hsl(170, 50%, 13%)',
}

const cyanScale = {
  cyan1: 'hsl(185, 60%, 99%)',
  cyan2: 'hsl(185, 73%, 97%)',
  cyan3: 'hsl(186, 70%, 94%)',
  cyan4: 'hsl(186, 63%, 90%)',
  cyan5: 'hsl(187, 58%, 85%)',
  cyan6: 'hsl(188, 54%, 78%)',
  cyan7: 'hsl(189, 53%, 69%)',
  cyan8: 'hsl(189, 60%, 58%)',
  cyan9: 'hsl(190, 95%, 39%)',
  cyan10: 'hsl(191, 91%, 36%)',
  cyan11: 'hsl(192, 85%, 31%)',
  cyan12: 'hsl(192, 88%, 12%)',
}

const indigoScale = {
  indigo1: 'hsl(225, 60%, 99%)',
  indigo2: 'hsl(223, 100%, 98%)',
  indigo3: 'hsl(223, 98%, 97%)',
  indigo4: 'hsl(223, 92%, 95%)',
  indigo5: 'hsl(224, 87%, 92%)',
  indigo6: 'hsl(224, 81%, 87%)',
  indigo7: 'hsl(225, 77%, 81%)',
  indigo8: 'hsl(226, 75%, 74%)',
  indigo9: 'hsl(226, 70%, 55%)',
  indigo10: 'hsl(226, 58%, 51%)',
  indigo11: 'hsl(226, 55%, 45%)',
  indigo12: 'hsl(226, 62%, 17%)',
}

// Dark theme color scales
const redScaleDark = {
  red1: 'hsl(0, 15%, 9%)',
  red2: 'hsl(0, 30%, 11%)',
  red3: 'hsl(0, 38%, 15%)',
  red4: 'hsl(0, 43%, 18%)',
  red5: 'hsl(0, 47%, 21%)',
  red6: 'hsl(0, 52%, 25%)',
  red7: 'hsl(0, 60%, 32%)',
  red8: 'hsl(0, 72%, 43%)',
  red9: 'hsl(0, 78%, 60%)',
  red10: 'hsl(0, 85%, 68%)',
  red11: 'hsl(0, 90%, 75%)',
  red12: 'hsl(0, 93%, 94%)',
}

const blueScaleDark = {
  blue1: 'hsl(212, 35%, 9%)',
  blue2: 'hsl(216, 50%, 12%)',
  blue3: 'hsl(214, 59%, 15%)',
  blue4: 'hsl(214, 66%, 17%)',
  blue5: 'hsl(213, 71%, 20%)',
  blue6: 'hsl(212, 78%, 23%)',
  blue7: 'hsl(211, 86%, 27%)',
  blue8: 'hsl(206, 100%, 35%)',
  blue9: 'hsl(206, 100%, 50%)',
  blue10: 'hsl(209, 100%, 60%)',
  blue11: 'hsl(210, 100%, 66%)',
  blue12: 'hsl(206, 98%, 95%)',
}

const greenScaleDark = {
  green1: 'hsl(146, 30%, 7%)',
  green2: 'hsl(155, 44%, 9%)',
  green3: 'hsl(155, 47%, 11%)',
  green4: 'hsl(154, 49%, 13%)',
  green5: 'hsl(154, 50%, 16%)',
  green6: 'hsl(153, 51%, 19%)',
  green7: 'hsl(151, 51%, 23%)',
  green8: 'hsl(151, 50%, 30%)',
  green9: 'hsl(151, 55%, 42%)',
  green10: 'hsl(151, 49%, 47%)',
  green11: 'hsl(151, 50%, 53%)',
  green12: 'hsl(137, 72%, 94%)',
}

const orangeScaleDark = {
  orange1: 'hsl(30, 15%, 9%)',
  orange2: 'hsl(28, 30%, 11%)',
  orange3: 'hsl(26, 42%, 14%)',
  orange4: 'hsl(25, 50%, 16%)',
  orange5: 'hsl(24, 57%, 19%)',
  orange6: 'hsl(24, 65%, 23%)',
  orange7: 'hsl(24, 77%, 29%)',
  orange8: 'hsl(24, 88%, 38%)',
  orange9: 'hsl(24, 94%, 50%)',
  orange10: 'hsl(24, 100%, 58%)',
  orange11: 'hsl(24, 100%, 62%)',
  orange12: 'hsl(24, 97%, 93%)',
}

const yellowScaleDark = {
  yellow1: 'hsl(45, 100%, 5%)',
  yellow2: 'hsl(46, 100%, 7%)',
  yellow3: 'hsl(45, 100%, 9%)',
  yellow4: 'hsl(45, 100%, 11%)',
  yellow5: 'hsl(47, 90%, 14%)',
  yellow6: 'hsl(49, 80%, 18%)',
  yellow7: 'hsl(49, 74%, 24%)',
  yellow8: 'hsl(50, 70%, 32%)',
  yellow9: 'hsl(53, 92%, 50%)',
  yellow10: 'hsl(54, 100%, 62%)',
  yellow11: 'hsl(52, 100%, 55%)',
  yellow12: 'hsl(53, 100%, 91%)',
}

const purpleScaleDark = {
  purple1: 'hsl(284, 20%, 9%)',
  purple2: 'hsl(283, 30%, 11%)',
  purple3: 'hsl(281, 37%, 16%)',
  purple4: 'hsl(280, 41%, 20%)',
  purple5: 'hsl(279, 43%, 23%)',
  purple6: 'hsl(277, 46%, 28%)',
  purple7: 'hsl(275, 49%, 35%)',
  purple8: 'hsl(272, 52%, 45%)',
  purple9: 'hsl(272, 51%, 54%)',
  purple10: 'hsl(273, 57%, 59%)',
  purple11: 'hsl(275, 80%, 71%)',
  purple12: 'hsl(279, 75%, 95%)',
}

const violetScaleDark = {
  violet1: 'hsl(250, 20%, 10%)',
  violet2: 'hsl(255, 30%, 12%)',
  violet3: 'hsl(253, 37%, 18%)',
  violet4: 'hsl(252, 40%, 23%)',
  violet5: 'hsl(252, 42%, 26%)',
  violet6: 'hsl(251, 44%, 32%)',
  violet7: 'hsl(250, 46%, 39%)',
  violet8: 'hsl(250, 51%, 49%)',
  violet9: 'hsl(252, 56%, 57%)',
  violet10: 'hsl(251, 63%, 63%)',
  violet11: 'hsl(250, 95%, 76%)',
  violet12: 'hsl(252, 87%, 96%)',
}

const pinkScaleDark = {
  pink1: 'hsl(318, 25%, 10%)',
  pink2: 'hsl(319, 32%, 12%)',
  pink3: 'hsl(319, 41%, 16%)',
  pink4: 'hsl(320, 45%, 18%)',
  pink5: 'hsl(320, 49%, 21%)',
  pink6: 'hsl(321, 55%, 25%)',
  pink7: 'hsl(322, 60%, 32%)',
  pink8: 'hsl(322, 65%, 43%)',
  pink9: 'hsl(322, 65%, 54%)',
  pink10: 'hsl(323, 72%, 59%)',
  pink11: 'hsl(325, 90%, 66%)',
  pink12: 'hsl(322, 90%, 95%)',
}

const tealScaleDark = {
  teal1: 'hsl(168, 48%, 6%)',
  teal2: 'hsl(169, 77%, 8%)',
  teal3: 'hsl(170, 76%, 10%)',
  teal4: 'hsl(171, 75%, 12%)',
  teal5: 'hsl(171, 75%, 14%)',
  teal6: 'hsl(172, 75%, 17%)',
  teal7: 'hsl(172, 74%, 22%)',
  teal8: 'hsl(173, 72%, 28%)',
  teal9: 'hsl(173, 80%, 36%)',
  teal10: 'hsl(174, 83%, 40%)',
  teal11: 'hsl(174, 90%, 41%)',
  teal12: 'hsl(166, 73%, 93%)',
}

const cyanScaleDark = {
  cyan1: 'hsl(192, 60%, 7%)',
  cyan2: 'hsl(192, 71%, 9%)',
  cyan3: 'hsl(192, 75%, 11%)',
  cyan4: 'hsl(192, 79%, 13%)',
  cyan5: 'hsl(192, 82%, 15%)',
  cyan6: 'hsl(192, 84%, 19%)',
  cyan7: 'hsl(192, 85%, 24%)',
  cyan8: 'hsl(192, 85%, 31%)',
  cyan9: 'hsl(190, 95%, 39%)',
  cyan10: 'hsl(189, 92%, 44%)',
  cyan11: 'hsl(188, 100%, 40%)',
  cyan12: 'hsl(185, 73%, 93%)',
}

const indigoScaleDark = {
  indigo1: 'hsl(229, 24%, 10%)',
  indigo2: 'hsl(230, 36%, 12%)',
  indigo3: 'hsl(228, 43%, 17%)',
  indigo4: 'hsl(227, 47%, 21%)',
  indigo5: 'hsl(227, 50%, 25%)',
  indigo6: 'hsl(226, 53%, 30%)',
  indigo7: 'hsl(226, 58%, 37%)',
  indigo8: 'hsl(226, 62%, 47%)',
  indigo9: 'hsl(226, 70%, 55%)',
  indigo10: 'hsl(227, 75%, 61%)',
  indigo11: 'hsl(228, 100%, 75%)',
  indigo12: 'hsl(226, 83%, 96%)',
}

// Extend default themes with color scales
// Note: Gray scale and semantic tokens removed - use Tamagui's $color1-12 system instead
export const themes = {
  light: {
    ...baseThemes.light,
    ...redScale,
    ...blueScale,
    ...greenScale,
    ...orangeScale,
    ...yellowScale,
    ...purpleScale,
    ...violetScale,
    ...pinkScale,
    ...tealScale,
    ...cyanScale,
    ...indigoScale,
  },
  dark: {
    ...baseThemes.dark,
    ...redScaleDark,
    ...blueScaleDark,
    ...greenScaleDark,
    ...orangeScaleDark,
    ...yellowScaleDark,
    ...purpleScaleDark,
    ...violetScaleDark,
    ...pinkScaleDark,
    ...tealScaleDark,
    ...cyanScaleDark,
    ...indigoScaleDark,
  },
}
