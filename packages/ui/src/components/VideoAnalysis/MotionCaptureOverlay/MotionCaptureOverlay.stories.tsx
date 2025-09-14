import type { Meta, StoryObj } from '@storybook/react'
import { MotionCaptureOverlay } from './MotionCaptureOverlay'

const meta: Meta<typeof MotionCaptureOverlay> = {
  title: 'VideoAnalysis/MotionCaptureOverlay',
  component: MotionCaptureOverlay,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

const mockPoseData = [
  {
    id: '1',
    timestamp: 1000,
    joints: [
      {
        id: 'nose',
        x: 100,
        y: 50,
        confidence: 0.9,
        connections: ['leftEye', 'rightEye'],
      },
      {
        id: 'leftEye',
        x: 95,
        y: 45,
        confidence: 0.8,
        connections: ['nose'],
      },
      {
        id: 'rightEye',
        x: 105,
        y: 45,
        confidence: 0.8,
        connections: ['nose'],
      },
      {
        id: 'leftShoulder',
        x: 85,
        y: 80,
        confidence: 0.85,
        connections: ['rightShoulder', 'leftElbow'],
      },
      {
        id: 'rightShoulder',
        x: 115,
        y: 80,
        confidence: 0.85,
        connections: ['leftShoulder', 'rightElbow'],
      },
      {
        id: 'leftElbow',
        x: 70,
        y: 110,
        confidence: 0.8,
        connections: ['leftShoulder', 'leftWrist'],
      },
      {
        id: 'rightElbow',
        x: 130,
        y: 110,
        confidence: 0.8,
        connections: ['rightShoulder', 'rightWrist'],
      },
      {
        id: 'leftWrist',
        x: 60,
        y: 140,
        confidence: 0.75,
        connections: ['leftElbow'],
      },
      {
        id: 'rightWrist',
        x: 140,
        y: 140,
        confidence: 0.75,
        connections: ['rightElbow'],
      },
    ],
    confidence: 0.9,
  },
]

export const Visible: Story = {
  args: {
    poseData: mockPoseData,
    isVisible: true,
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: '400px',
          height: '300px',
          position: 'relative',
          backgroundColor: '#f0f0f0',
        }}
      >
        <Story />
      </div>
    ),
  ],
}

export const Hidden: Story = {
  args: {
    poseData: mockPoseData,
    isVisible: false,
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: '400px',
          height: '300px',
          position: 'relative',
          backgroundColor: '#f0f0f0',
        }}
      >
        <Story />
      </div>
    ),
  ],
}

export const LowConfidence: Story = {
  args: {
    poseData: [
      {
        ...mockPoseData[0],
        joints: mockPoseData[0].joints.map((joint) => ({
          ...joint,
          confidence: 0.3,
        })),
        confidence: 0.3,
      },
    ],
    isVisible: true,
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: '400px',
          height: '300px',
          position: 'relative',
          backgroundColor: '#f0f0f0',
        }}
      >
        <Story />
      </div>
    ),
  ],
}

export const MultiplePoses: Story = {
  args: {
    poseData: [
      mockPoseData[0],
      {
        id: '2',
        timestamp: 2000,
        joints: [
          {
            id: 'nose2',
            x: 250,
            y: 100,
            confidence: 0.8,
            connections: ['leftEye2', 'rightEye2'],
          },
          {
            id: 'leftEye2',
            x: 245,
            y: 95,
            confidence: 0.7,
            connections: ['nose2'],
          },
          {
            id: 'rightEye2',
            x: 255,
            y: 95,
            confidence: 0.7,
            connections: ['nose2'],
          },
        ],
        confidence: 0.8,
      },
    ],
    isVisible: true,
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: '400px',
          height: '300px',
          position: 'relative',
          backgroundColor: '#f0f0f0',
        }}
      >
        <Story />
      </div>
    ),
  ],
}
