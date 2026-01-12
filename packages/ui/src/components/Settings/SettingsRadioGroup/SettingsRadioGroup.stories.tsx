import type { Meta, StoryObj } from '@storybook/react'
import { Mic, Palette, Sparkles, User } from '@tamagui/lucide-icons'
import { useState } from 'react'
import { YStack } from 'tamagui'
import { SettingsRadioGroup } from './SettingsRadioGroup'

const meta: Meta<typeof SettingsRadioGroup> = {
  title: 'Settings/SettingsRadioGroup',
  component: SettingsRadioGroup,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    iconColor: {
      control: 'color',
    },
  },
}

export default meta
type Story = StoryObj<typeof SettingsRadioGroup>

/**
 * Default theme selector with Light/Dark/Auto options.
 * Uses default options when no custom options are provided.
 */
export const ThemeSelector: Story = {
  render: () => {
    const [theme, setTheme] = useState<string>('auto')

    return (
      <YStack width={400}>
        <SettingsRadioGroup
          icon={Palette}
          iconColor="$purple10"
          title="Theme"
          description="Choose your preferred theme"
          value={theme}
          onValueChange={setTheme}
        />
      </YStack>
    )
  },
}

/**
 * Voice gender selector with custom options.
 * Demonstrates how to use custom options for binary choices.
 */
export const VoiceGender: Story = {
  render: () => {
    const [gender, setGender] = useState<string>('female')

    return (
      <YStack width={400}>
        <SettingsRadioGroup
          icon={User}
          iconColor="$blue10"
          title="Voice Gender"
          description="Male or female coach voice"
          value={gender}
          onValueChange={setGender}
          options={[
            { value: 'female', label: 'Female' },
            { value: 'male', label: 'Male' },
          ]}
        />
      </YStack>
    )
  },
}

/**
 * Coaching style selector with custom options.
 * Demonstrates how to use custom options with emoji labels.
 */
export const CoachingStyle: Story = {
  render: () => {
    const [mode, setMode] = useState<string>('roast')

    return (
      <YStack width={400}>
        <SettingsRadioGroup
          icon={Sparkles}
          iconColor="$orange10"
          title="Coaching Style"
          description="How your coach delivers feedback"
          value={mode}
          onValueChange={setMode}
          options={[
            { value: 'roast', label: 'Roast:Me ⭐' },
            { value: 'zen', label: 'Zen:Me' },
            { value: 'lovebomb', label: 'Lovebomb:Me' },
          ]}
        />
      </YStack>
    )
  },
}

/**
 * Multiple radio groups stacked together.
 * Demonstrates the complete voice preferences section.
 */
export const VoicePreferencesSection: Story = {
  render: () => {
    const [gender, setGender] = useState<string>('female')
    const [mode, setMode] = useState<string>('roast')

    return (
      <YStack
        width={400}
        gap="$4"
      >
        <SettingsRadioGroup
          icon={User}
          iconColor="$blue10"
          title="Voice Gender"
          description="Male or female coach voice"
          value={gender}
          onValueChange={setGender}
          options={[
            { value: 'female', label: 'Female' },
            { value: 'male', label: 'Male' },
          ]}
          testID="voice-gender-radio"
        />
        <SettingsRadioGroup
          icon={Sparkles}
          iconColor="$orange10"
          title="Coaching Style"
          description="How your coach delivers feedback"
          value={mode}
          onValueChange={setMode}
          options={[
            { value: 'roast', label: 'Roast:Me ⭐' },
            { value: 'zen', label: 'Zen:Me' },
            { value: 'lovebomb', label: 'Lovebomb:Me' },
          ]}
          testID="voice-mode-radio"
        />
      </YStack>
    )
  },
}

/**
 * Radio group with many options.
 * Demonstrates how the component handles wrapping for multiple options.
 */
export const ManyOptions: Story = {
  render: () => {
    const [value, setValue] = useState<string>('option1')

    return (
      <YStack width={400}>
        <SettingsRadioGroup
          icon={Mic}
          iconColor="$green10"
          title="Language"
          description="Select your preferred language"
          value={value}
          onValueChange={setValue}
          options={[
            { value: 'option1', label: 'English' },
            { value: 'option2', label: 'Spanish' },
            { value: 'option3', label: 'French' },
            { value: 'option4', label: 'German' },
            { value: 'option5', label: 'Italian' },
          ]}
        />
      </YStack>
    )
  },
}

/**
 * Different icon colors.
 * Demonstrates the visual variety available.
 */
export const IconColorVariants: Story = {
  render: () => {
    const [value1, setValue1] = useState<string>('female')
    const [value2, setValue2] = useState<string>('male')
    const [value3, setValue3] = useState<string>('female')

    return (
      <YStack
        width={400}
        gap="$4"
      >
        <SettingsRadioGroup
          icon={User}
          iconColor="$blue10"
          title="Blue Icon"
          description="Using blue color variant"
          value={value1}
          onValueChange={setValue1}
          options={[
            { value: 'female', label: 'Female' },
            { value: 'male', label: 'Male' },
          ]}
        />
        <SettingsRadioGroup
          icon={User}
          iconColor="$orange10"
          title="Orange Icon"
          description="Using orange color variant"
          value={value2}
          onValueChange={setValue2}
          options={[
            { value: 'female', label: 'Female' },
            { value: 'male', label: 'Male' },
          ]}
        />
        <SettingsRadioGroup
          icon={User}
          iconColor="$purple10"
          title="Purple Icon"
          description="Using purple color variant"
          value={value3}
          onValueChange={setValue3}
          options={[
            { value: 'female', label: 'Female' },
            { value: 'male', label: 'Male' },
          ]}
        />
      </YStack>
    )
  },
}
